import { NextResponse } from 'next/server';

import { adminAuth, hasAdminCredentials } from '@/lib/firebase/admin';
import { generateJson } from '@/lib/gemini.server';
import { sanitizeAsciiSlug } from '@/lib/slug';

/**
 * 글 제목 → 영어 slug 제안.
 *
 * 발행 slug 은 지금까지 한글을 **발음 그대로** 옮겼다(`리팩토링` → `ripaektoring`).
 * 그 선택의 근거는 번역기를 물리면 키·비용·실패 폴백이 생기고 같은 제목이 호출마다
 * 다른 주소가 된다는 것이었다(`lib/slug.ts`). 이 라우트는 그 근거를 세 가지로 비껴간다.
 *  - **사람이 버튼을 눌러야** 부른다. 저장·발행 경로에 AI 호출이 끼어들지 않는다.
 *  - 실패해도 잃는 게 없다. 기존 로마자 slug 이 입력란에 그대로 남아 있다.
 *  - 제안일 뿐이라 같은 제목에 다른 결과가 나와도 문제가 아니다 — 확정은 사람이 한다.
 *
 * 인증은 다른 라우트와 같다 — Firebase ID 토큰 + admin 커스텀 클레임.
 */

/** 모델 호출을 기다리므로 기본 실행 시간보다 넉넉히 잡는다 (추출 라우트와 같은 이유) */
export const maxDuration = 30;

/** 제목만으로 부족할 때를 위해 본문 앞부분도 함께 보낸다 — 맥락이 있으면 낱말 선택이 나아진다 */
const MAX_CONTEXT = 1_000;

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: { slug: { type: 'string' } },
  required: ['slug'],
} as const;

const PROMPT = [
  '너는 기술 블로그의 URL slug 을 짓는 편집자다.',
  '아래 글 제목을 영어 slug 으로 옮겨라.',
  '',
  '규칙:',
  '- 소문자 kebab-case. 영문·숫자·하이픈만 쓴다.',
  '- 한국어 발음을 로마자로 옮기지 않는다. **뜻을 영어로 옮긴다.**',
  '  (리팩토링 → refactoring, 서버 컴포넌트 도입기 → adopting-server-components)',
  '- 3~6 낱말. 관사(a·the)와 뻔한 말(post·article·blog)은 뺀다.',
  '- 기술 고유명사는 통용 표기를 그대로 쓴다 (nextjs · firestore · isr).',
  '- 제목의 핵심만 남긴다. 문장을 통째로 옮기지 않는다.',
].join('\n');

export async function POST(request: Request): Promise<NextResponse> {
  if (!hasAdminCredentials()) {
    return NextResponse.json(
      { error: 'Firebase Admin 자격증명이 서버에 없습니다.' },
      { status: 503 },
    );
  }

  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return NextResponse.json({ error: '인증 토큰이 없습니다.' }, { status: 401 });

  try {
    // checkRevoked: 로그아웃·계정 비활성화된 토큰을 거른다
    const decoded = await adminAuth().verifyIdToken(token, true);
    if (decoded.admin !== true) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: '유효하지 않은 토큰입니다.' }, { status: 401 });
  }

  let body: { title?: unknown; content?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: '본문을 읽을 수 없습니다.' }, { status: 400 });
  }

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const content = typeof body.content === 'string' ? body.content.slice(0, MAX_CONTEXT) : '';
  if (!title) {
    return NextResponse.json({ error: '제목을 먼저 입력하세요.' }, { status: 400 });
  }

  const result = await generateJson<{ slug?: unknown }>(
    `${PROMPT}\n\n---\n제목: ${title}\n\n본문 앞부분:\n${content}`,
    RESPONSE_SCHEMA,
  );
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  const slug = sanitizeAsciiSlug(String(result.data.slug ?? ''));
  if (!slug) {
    // 모델이 한글만 돌려주면 sanitize 후 빈 값이 된다. 로마자로 대신 채우지 않는다 —
    // 버튼을 누른 사람은 영어 slug 을 원한 것이고, 입력란에는 이미 로마자 값이 있다.
    return NextResponse.json(
      { error: '영어 slug 을 만들지 못했습니다. 직접 입력하세요.' },
      { status: 502 },
    );
  }

  return NextResponse.json({ slug }, { status: 200 });
}
