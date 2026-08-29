import 'server-only';

/**
 * Gemini 호출 한 곳.
 *
 * 라우트마다 fetch 를 적으면 키를 읽는 방식·실패 문구·타임아웃 판단이 라우트 수만큼
 * 갈라진다. 특히 실패 처리가 그렇다 — 한도 초과(429)만 따로 안내하고 나머지는 뭉뚱그린다는
 * 판단은 한 번만 내려야 하는 종류의 결정이다.
 *
 * SDK 를 쓰지 않고 REST 를 직접 부른다. 필요한 것이 "JSON 스키마를 강제한 생성" 하나뿐이라
 * 의존성을 하나 더 늘릴 이유가 없다 (`@vercel/blob` 처럼 업로드 프로토콜이 얽힌 경우와 다르다).
 */

/** 기본 모델. 값이 바뀔 수 있으므로 env 로 덮어쓸 수 있게 둔다 */
const DEFAULT_MODEL = 'gemini-2.5-flash';

/**
 * 응답을 기다리는 상한.
 *
 * 라우트의 `maxDuration` 은 **함수 실행** 상한일 뿐 fetch 를 끊지 않는다. 모델이
 * 늦어지면 함수 슬롯을 플랫폼 타임아웃까지 붙잡고, 화면에는 여기서 공들여 나눠둔
 * 원인별 문구 대신 원인 없는 실패만 남는다. 라우트 상한(30~60초)보다 짧게 잡아
 * **우리가 먼저 끊고 이유를 말한다.**
 */
const TIMEOUT_MS = 25_000;

export type GeminiResult<T> =
  | { ok: true; data: T }
  /** 그대로 응답에 실어 보낼 수 있는 형태 — 호출부가 문구를 다시 짓지 않는다 */
  | { ok: false; status: number; error: string };

interface GeminiPart {
  text?: string;
}
interface GeminiResponse {
  candidates?: { content?: { parts?: GeminiPart[] } }[];
  error?: { message?: string };
}

/**
 * 스키마를 강제해 JSON 을 받는다.
 *
 * 자유 텍스트를 받아 파싱하면 형식이 매번 흔들리고, 그 흔들림이 화면에서는
 * "가끔 이상하게 나온다"로만 보여 원인을 짚기 어렵다.
 *
 * @param temperature 기본 0.2 — 같은 입력이면 같은 결과가 나와야 하는 용도가 대부분이다
 *   (사전 항목·slug 은 부를 때마다 달라질 이유가 없다).
 */
export async function generateJson<T>(
  prompt: string,
  schema: object,
  temperature = 0.2,
): Promise<GeminiResult<T>> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      status: 503,
      error: 'GEMINI_API_KEY 가 서버에 없습니다. 환경변수를 설정하세요.',
    };
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 키를 쿼리스트링이 아니라 헤더로 보낸다 — URL 은 로그·에러 리포트에 남는다
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: schema,
          temperature,
        },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      return {
        ok: false,
        status: 504,
        error: '응답이 너무 오래 걸려 중단했습니다. 본문을 줄이고 다시 시도하세요.',
      };
    }
    return {
      ok: false,
      status: 502,
      error: 'Gemini 에 연결하지 못했습니다. 네트워크를 확인하세요.',
    };
  }

  const payload = (await res.json().catch(() => null)) as GeminiResponse | null;

  if (!res.ok) {
    // 한도 초과는 관리자가 스스로 할 수 있는 일(기다리기)이 있어 따로 안내한다
    if (res.status === 429) {
      return {
        ok: false,
        status: 429,
        error: 'Gemini 호출 한도를 넘었습니다. 잠시 뒤 다시 시도하세요.',
      };
    }
    const detail = payload?.error?.message ?? `상태 ${res.status}`;
    return { ok: false, status: 502, error: `Gemini 호출이 실패했습니다 — ${detail}` };
  }

  const text =
    payload?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  try {
    return { ok: true, data: JSON.parse(text) as T };
  } catch {
    // 스키마를 강제해도 응답이 잘리면(토큰 한도) JSON 이 깨진 채 온다
    return {
      ok: false,
      status: 502,
      error: '응답을 해석하지 못했습니다. 입력을 줄이고 다시 시도하세요.',
    };
  }
}
