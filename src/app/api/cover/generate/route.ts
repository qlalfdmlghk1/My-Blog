import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

import { getCategoryBySlug } from '@/lib/categories.server';
import { buildCoverPrompt } from '@/lib/cover-prompt';
import { adminAuth, hasAdminCredentials } from '@/lib/firebase/admin';
import { generateImage } from '@/lib/gemini.server';
import { sanitizeAsciiSlug } from '@/lib/slug';

/**
 * 글 커버를 AI 로 생성해 Blob 에 올리고 공개 URL 을 돌려준다.
 *
 * Gemini 호출은 /api/dictionary/extract 와 같은 이유로 **여기서만** 일어난다 —
 * 관리 화면은 클라이언트 렌더라 브라우저에서 직접 부르면 키가 번들에 실린다.
 * 인증도 같다: Firebase ID 토큰을 검증하고 admin 커스텀 클레임을 확인한다.
 * 이미지 생성은 용어 추출보다 비싸므로 인증 없는 호출을 한 번도 허용하면 안 된다.
 *
 * 업로드는 /api/blob-upload 와 달리 **서버가 직접** 한다. 저 라우트가 브라우저 직행을
 * 택한 이유(요청 본문 상한 · 리전 왕복)는 파일이 브라우저에 있을 때 얘기다. 여기서는
 * 파일이 서버에서 태어나므로, 브라우저를 한 번 거쳐 다시 올리는 편이 오히려 태평양을
 * 더 건넌다.
 *
 * 저장은 하지 않는다 — Firestore 의 coverImage 갱신은 화면이 한다. 이 라우트가 글을
 * 고치기 시작하면 "누가 글을 쓰는가"가 클라이언트 SDK 와 여기 두 곳으로 갈라진다.
 * 이전 커버가 Blob 에 남는 것도 지금은 그대로 둔다(정리는 후속 — 파일 수가 문제될 규모가 아니다).
 */
export const maxDuration = 60;

/** 프롬프트에 실어 보내는 요약의 상한 — 그림의 소재를 정하는 데 두 문장이면 충분하다 */
const MAX_EXCERPT = 300;

function json(body: unknown, status: number): NextResponse {
  return NextResponse.json(body, { status });
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!hasAdminCredentials()) {
    return json({ error: 'Firebase Admin 자격증명이 서버에 없습니다.' }, 503);
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return json({ error: 'BLOB_READ_WRITE_TOKEN 이 없습니다. Blob 스토어를 프로젝트에 연결하세요.' }, 503);
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

  let body: { title?: unknown; excerpt?: unknown; category?: unknown; slug?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: '본문을 읽을 수 없습니다.' }, 400);
  }

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const excerpt = typeof body.excerpt === 'string' ? body.excerpt.trim().slice(0, MAX_EXCERPT) : '';
  const categorySlug = typeof body.category === 'string' ? body.category : '';
  const slug = sanitizeAsciiSlug(typeof body.slug === 'string' ? body.slug : '') || 'post';
  if (!title) return json({ error: '제목이 비어 있습니다. 제목이 있어야 그릴 소재가 정해집니다.' }, 400);

  // 색은 slug 가 아니라 팔레트 슬롯에서 온다 — 카테고리를 서버에서 찾아 슬롯을 꺼낸다
  const category = categorySlug ? await getCategoryBySlug(categorySlug) : null;
  const prompt = buildCoverPrompt({ title, excerpt, category: category?.palette ?? null });

  const result = await generateImage(prompt, '16:9');
  if (!result.ok) return json({ error: result.error }, result.status);

  const ext = result.data.mimeType === 'image/png' ? 'png' : 'jpg';
  try {
    const blob = await put(`covers/${slug}.${ext}`, result.data.bytes, {
      access: 'public',
      contentType: result.data.mimeType,
      // 다시 생성해도 앞의 것을 덮어쓰지 않는다 — 이미 발행된 HTML 이 옛 주소를 가리킨다
      addRandomSuffix: true,
    });
    return json({ url: blob.url }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : '업로드에 실패했습니다.';
    return json({ error: `생성은 됐지만 저장에 실패했습니다 — ${message}` }, 502);
  }
}
