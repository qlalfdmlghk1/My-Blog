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

/**
 * 이미지 생성 기본 모델. 텍스트 모델과 따로 둔다 — 같은 env 로 묶으면 텍스트 모델을
 * 바꿀 때 이미지 생성이 함께 깨진다. 값은 GEMINI_IMAGE_MODEL 로 덮어쓴다.
 */
const DEFAULT_IMAGE_MODEL = 'gemini-2.5-flash-image';

/** 이미지는 텍스트보다 오래 걸린다 — 라우트 상한(60초) 아래에서 우리가 먼저 끊는다 */
const IMAGE_TIMEOUT_MS = 50_000;

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

  // 본문을 받는 도중에도 타임아웃이 날 수 있다. 여기서 안 가르면 그 실패가
  // `catch(() => null)` 에 먹혀 "응답을 해석하지 못했습니다"로 나가, 위에서 공들여
  // 만든 504 문구가 이 경로에서만 사라진다.
  let payload: GeminiResponse | null = null;
  try {
    payload = (await res.json()) as GeminiResponse;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      return {
        ok: false,
        status: 504,
        error: '응답이 너무 오래 걸려 중단했습니다. 본문을 줄이고 다시 시도하세요.',
      };
    }
  }

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

  const text = payload?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
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

interface InteractionImagePart {
  type?: string;
  data?: string;
  mime_type?: string;
}
interface InteractionResponse {
  steps?: { type?: string; content?: InteractionImagePart[] }[];
  errors?: { message?: string }[];
  error?: { message?: string };
}

export interface GeneratedImage {
  bytes: Buffer;
  mimeType: string;
}

/**
 * 프롬프트 하나로 이미지 한 장을 받는다 (글 커버 생성).
 *
 * `generateJson` 과 엔드포인트가 다르다 — 이미지 모델은 `interactions` API 로만 열려
 * 있고, 응답도 candidates 가 아니라 steps 로 온다. 그래서 같은 함수에 분기를 넣지 않고
 * 따로 둔다. 키 전달 방식·타임아웃·실패 문구의 판단은 위와 같다.
 *
 * 결과는 base64 를 풀어 바이트로 돌려준다 — 호출부(라우트)가 Blob 에 올릴 때 그대로
 * 쓰기 위해서다. 브라우저로 base64 를 내려보내면 1~2MB 문자열이 JSON 에 실리고,
 * 어차피 저장은 서버가 해야 한다.
 */
export async function generateImage(
  prompt: string,
  aspectRatio: '16:9' | '1:1' | '4:3' = '16:9',
): Promise<GeminiResult<GeneratedImage>> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      status: 503,
      error: 'GEMINI_API_KEY 가 서버에 없습니다. 환경변수를 설정하세요.',
    };
  }

  const model = process.env.GEMINI_IMAGE_MODEL || DEFAULT_IMAGE_MODEL;

  let res: Response;
  try {
    res = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        model,
        input: [{ type: 'text', text: prompt }],
        // 1K 면 목록 썸네일(224px)과 히어로(최대 ~700px)에 충분하다. 2K 는 파일만 커진다.
        response_format: {
          type: 'image',
          mime_type: 'image/jpeg',
          aspect_ratio: aspectRatio,
          image_size: '1K',
        },
      }),
      signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      return { ok: false, status: 504, error: '이미지 생성이 너무 오래 걸려 중단했습니다. 다시 시도하세요.' };
    }
    return { ok: false, status: 502, error: 'Gemini 에 연결하지 못했습니다. 네트워크를 확인하세요.' };
  }

  let payload: InteractionResponse | null = null;
  try {
    payload = (await res.json()) as InteractionResponse;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      return { ok: false, status: 504, error: '이미지 생성이 너무 오래 걸려 중단했습니다. 다시 시도하세요.' };
    }
  }

  if (!res.ok) {
    if (res.status === 429) {
      return { ok: false, status: 429, error: 'Gemini 호출 한도를 넘었습니다. 잠시 뒤 다시 시도하세요.' };
    }
    const detail = payload?.error?.message ?? payload?.errors?.[0]?.message ?? `상태 ${res.status}`;
    return { ok: false, status: 502, error: `이미지 생성이 실패했습니다 — ${detail}` };
  }

  const image = payload?.steps
    ?.filter((step) => step.type === 'model_output')
    .flatMap((step) => step.content ?? [])
    .find((part) => part.type === 'image' && typeof part.data === 'string' && part.data);
  if (!image?.data) {
    // 안전 필터에 걸리면 200 인데 이미지가 없다 — 프롬프트를 바꿔 다시 부르게 안내한다
    return { ok: false, status: 502, error: '모델이 이미지를 돌려주지 않았습니다. 다시 생성해 보세요.' };
  }

  return {
    ok: true,
    data: { bytes: Buffer.from(image.data, 'base64'), mimeType: image.mime_type || 'image/jpeg' },
  };
}
