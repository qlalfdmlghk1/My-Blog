import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

import { adminAuth, hasAdminCredentials } from '@/lib/firebase/admin';

/**
 * 발행 / 수정 / 삭제 후 해당 정적 경로만 재생성한다.
 *
 * 쓰기는 클라이언트(관리자 화면)에서 일어나므로 이 엔드포인트는 호출자를 신뢰할 수 없다.
 * Firebase ID 토큰을 검증하고 admin 커스텀 클레임을 확인한다 —
 * 클레임은 Firebase 가 서명한 토큰 안에 있어 클라이언트가 위조할 수 없다.
 * 클라이언트의 hasAdminClaim() 은 UI 가드일 뿐이고 실질 방어선은 여기와 Firestore 보안 규칙이다.
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (!hasAdminCredentials()) {
    return NextResponse.json(
      { error: 'Firebase Admin 자격증명이 서버에 없습니다.' },
      { status: 503 },
    );
  }

  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) {
    return NextResponse.json({ error: '인증 토큰이 없습니다.' }, { status: 401 });
  }

  let isAdmin = false;
  try {
    // checkRevoked: 로그아웃·계정 비활성화된 토큰을 거른다
    const decoded = await adminAuth().verifyIdToken(token, true);
    isAdmin = decoded.admin === true;
  } catch {
    return NextResponse.json({ error: '유효하지 않은 토큰입니다.' }, { status: 401 });
  }

  if (!isAdmin) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  let body: { slug?: unknown; tags?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: '본문을 읽을 수 없습니다.' }, { status: 400 });
  }

  const slug = typeof body.slug === 'string' ? body.slug : '';
  const tags = Array.isArray(body.tags) ? body.tags.filter((t): t is string => typeof t === 'string') : [];

  // 목록·RSS·sitemap 은 글 하나만 바뀌어도 함께 갱신돼야 한다
  const paths = ['/', '/rss.xml', '/sitemap.xml'];
  if (slug) paths.push(`/posts/${slug}`);
  for (const tag of tags) paths.push(`/tags/${encodeURIComponent(tag)}`);

  for (const path of paths) revalidatePath(path);

  return NextResponse.json({ revalidated: paths });
}
