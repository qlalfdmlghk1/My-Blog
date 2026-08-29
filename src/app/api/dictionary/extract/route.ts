import { NextResponse } from 'next/server';

import { adminAuth, hasAdminCredentials } from '@/lib/firebase/admin';
import { buildDictionaryIndex, DICTIONARY_LIMITS, toDictionaryAnchors } from '@/lib/dictionary';
import { getDictionary } from '@/lib/dictionary.server';
import { generateJson } from '@/lib/gemini.server';
import { sanitizeAsciiSlug } from '@/lib/slug';
import type { ExtractedTerm, ExtractResponse, SkippedTerm } from '@/types/dictionary';

/**
 * 본문에서 용어 후보를 뽑는다 — Gemini 호출은 **여기서만** 일어난다.
 *
 * 관리 화면은 클라이언트 렌더이므로 브라우저에서 직접 부르면 API 키가 번들에 실린다.
 * 서버 라우트를 두고 키를 서버에만 두는 것이 이 프로젝트의 최우선 규칙(서버 전용
 * 시크릿을 Client Component 경로에 도달시키지 않음)을 지키는 유일한 방법이다.
 *
 * 인증은 /api/revalidate · /api/blob-upload 와 같다 — Firebase ID 토큰을 검증하고
 * admin 커스텀 클레임을 확인한다. 클레임은 Firebase 가 서명한 토큰 안에 있어
 * 클라이언트가 위조할 수 없다. AI 호출은 돈이 드는 동작이라 인증이 특히 중요하다.
 */

/**
 * 이 라우트만 함수 실행 시간을 늘려 잡는다.
 *
 * 다른 라우트는 Firestore 왕복 몇 번이라 기본값(짧다)으로 충분하지만, 여기는 외부
 * 모델의 생성이 끝나기를 기다린다 — 긴 글에서는 십수 초가 걸린다. 기본값에 걸리면
 * 화면에는 원인 없는 실패로만 보이고, 그 시점엔 이미 호출 비용이 나간 뒤다.
 */
export const maxDuration = 60;

/**
 * 한 번에 보내는 본문의 상한.
 *
 * 긴 글을 통째로 보내면 토큰 한도에 걸려 응답이 잘리는데, 그 실패는 "추출이 이상하다"
 * 로만 보여 원인을 찾기 어렵다. 대신 **앞에서부터 이만큼만** 보내고 잘렸다는 사실을
 * 응답에 실어 화면이 알리게 한다 — 용어는 보통 글 앞머리에서 처음 등장한다.
 */
const MAX_CONTENT = 20_000;

/** 한 번에 받을 후보 수 — 이보다 많으면 사람이 확인하는 일이 추출보다 오래 걸린다 */
const MAX_CANDIDATES = 12;

const PROMPT = [
  '너는 기술 블로그의 용어 사전을 만드는 편집자다.',
  '아래 마크다운 글에서 **독자가 모르면 글을 못 읽는 기술 용어**만 골라라.',
  '',
  '규칙:',
  '- 표제어는 글에 실제로 나온 표기를 쓴다. 글에 없는 낱말을 지어내지 않는다.',
  '- 너무 흔한 낱말(코드·함수·서버)과 고유명사(회사명·사람 이름)는 제외한다.',
  '- 정의는 **평문 한두 문장**으로 쓴다. 마크다운·목록·코드블록을 쓰지 않는다.',
  '- 정의는 이 글의 맥락이 아니라 **용어 자체의 뜻**을 설명한다.',
  '- 별칭에는 같은 개념의 다른 표기(약어·영문 원어)만 넣는다. 없으면 빈 배열.',
  '- slug 은 그 용어의 **영어 원어**를 소문자 kebab-case 로 쓴다 (서버 컴포넌트 → server-component).',
  '  널리 쓰이는 영어 표기가 없으면 빈 문자열로 둔다. 한국어 발음을 로마자로 옮기지 않는다.',
  `- 최대 ${MAX_CANDIDATES}개. 확신이 없으면 넣지 않는다 — 적게 뽑는 편이 낫다.`,
  `- 표제어는 ${DICTIONARY_LIMITS.term}자, 정의는 ${DICTIONARY_LIMITS.definition}자를 넘지 않는다.`,
  '- 한국어로 쓴다.',
].join('\n');

/** 응답 스키마를 모델에 강제한다 — 자유 텍스트를 받아 파싱하면 형식이 매번 흔들린다 */
const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    terms: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          term: { type: 'string' },
          aliases: { type: 'array', items: { type: 'string' } },
          definition: { type: 'string' },
          slug: { type: 'string' },
        },
        required: ['term', 'aliases', 'definition', 'slug'],
      },
    },
  },
  required: ['terms'],
} as const;

function json(body: unknown, status: number): NextResponse {
  return NextResponse.json(body, { status });
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!hasAdminCredentials()) {
    return json({ error: 'Firebase Admin 자격증명이 서버에 없습니다.' }, 503);
  }
  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return json({ error: '인증 토큰이 없습니다.' }, 401);

  try {
    // checkRevoked: 로그아웃·계정 비활성화된 토큰을 거른다
    const decoded = await adminAuth().verifyIdToken(token, true);
    if (decoded.admin !== true) return json({ error: '권한이 없습니다.' }, 403);
  } catch {
    return json({ error: '유효하지 않은 토큰입니다.' }, 401);
  }

  let body: { content?: unknown; title?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: '본문을 읽을 수 없습니다.' }, 400);
  }

  const raw = typeof body.content === 'string' ? body.content : '';
  const title = typeof body.title === 'string' ? body.title : '';
  if (!raw.trim()) return json({ error: '본문이 비어 있습니다.' }, 400);

  const truncated = raw.length > MAX_CONTENT;
  const content = truncated ? raw.slice(0, MAX_CONTENT) : raw;

  const result = await generateJson<{ terms?: unknown }>(
    `${PROMPT}

---
제목: ${title}

${content}`,
    RESPONSE_SCHEMA,
  );
  if (!result.ok) return json({ error: result.error }, result.status);

  const extracted = normalizeExtracted(result.data.terms);

  // 이미 있는 용어는 **서버에서** 걷어낸다. 사전 전체를 클라이언트로 내려 비교하면
  // 정의문까지 딸려가고, 무엇이 이미 있는지 판단하는 규칙이 두 곳으로 나뉜다.
  // 표기 정규화와 "먼저 등록된 쪽이 이긴다" 규칙을 여기서 다시 짜지 않는다 —
  // 본문 자동 링크가 쓰는 색인을 그대로 쓴다. 두 판정이 갈라지면 이미 링크가 걸리는
  // 용어를 "새 후보"라고 다시 등록하게 된다.
  const existing = await getDictionary();
  const { bySurface } = buildDictionaryIndex(toDictionaryAnchors(existing));

  const candidates: ExtractedTerm[] = [];
  const skipped: SkippedTerm[] = [];
  for (const item of extracted) {
    // 표제어뿐 아니라 별칭 하나만 겹쳐도 같은 용어로 본다 — 본문 자동 링크가
    // 표제어와 별칭을 똑같이 인식하므로, 별칭이 겹치면 링크가 어느 쪽으로 갈지
    // 등록 순서에 좌우된다(buildDictionaryIndex 는 먼저 등록된 쪽을 남긴다).
    const hit = [item.term, ...item.aliases]
      .map((s) => bySurface.get(s.trim().toLowerCase()))
      .find(Boolean);
    if (hit) {
      skipped.push({ term: item.term, existing: hit });
      continue;
    }
    candidates.push(item);
  }

  const response: ExtractResponse = { candidates, skipped, truncated };
  return json(response, 200);
}

/** 모델 응답을 규칙 상한 안으로 접는다 — 넘치면 저장이 규칙에 걸린다 */
function normalizeExtracted(value: unknown): ExtractedTerm[] {
  if (!Array.isArray(value)) return [];
  const out: ExtractedTerm[] = [];
  const seen = new Set<string>();

  for (const raw of value) {
    if (typeof raw !== 'object' || raw === null) continue;
    const item = raw as Record<string, unknown>;
    const term = String(item.term ?? '').trim();
    const definition = String(item.definition ?? '').trim();
    if (!term || !definition) continue;

    // 같은 표제어가 두 번 오면 뒤엣것을 버린다 (slug 이 하나뿐이라 어차피 못 만든다)
    const key = term.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const aliases = Array.isArray(item.aliases)
      ? [
          ...new Set(
            item.aliases
              .map((a) => String(a).trim())
              .filter((a) => a && a.toLowerCase() !== key)
              // 별칭 하나가 길면 글을 그릴 때마다 그 문자열이 통째로 정규식에 들어간다
              .map((a) => a.slice(0, DICTIONARY_LIMITS.term - 1)),
          ),
        ].slice(0, DICTIONARY_LIMITS.aliases)
      : [];

    out.push({
      term: term.slice(0, DICTIONARY_LIMITS.term - 1),
      aliases,
      definition: definition.slice(0, DICTIONARY_LIMITS.definition - 1),
      slug: sanitizeAsciiSlug(String(item.slug ?? '')),
    });
    if (out.length >= MAX_CANDIDATES) break;
  }
  return out;
}
