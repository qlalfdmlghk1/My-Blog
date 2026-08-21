import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

import { adminAuth, hasAdminCredentials } from '@/lib/firebase/admin';
import { getCategories } from '@/lib/categories.server';

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

  const strings = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

  const slug = typeof body.slug === 'string' ? body.slug : '';
  const tags = strings(body.tags);

  // 목록·RSS·sitemap 은 글 하나만 바뀌어도 함께 갱신돼야 한다
  const paths = ['/', '/rss.xml', '/sitemap.xml'];
  // slug·태그에 한글을 허용하므로 실제 요청 경로는 퍼센트 인코딩된 형태다.
  // 어느 표기가 캐시 키인지 실측하지 않았으므로 두 표기를 모두 무효화한다 —
  // 존재하지 않는 경로의 revalidatePath 는 무동작이라 넣어도 손해가 없고,
  // 빠뜨리면 '발행했는데 목록이 안 바뀐다'가 조용히 발생한다.
  const pushPath = (p: string) => {
    paths.push(p);
    const encoded = p.split('/').map(encodeURIComponent).join('/');
    if (encoded !== p) paths.push(encoded);
  };
  if (slug) pushPath(`/posts/${slug}`);
  for (const tag of tags) pushPath(`/tags/${tag}`);

  // 카테고리는 글이 속한 것만 갱신하면 부족하다 — 사이드바가 카테고리별 글 수를
  // 모든 목록 화면에 함께 렌더하므로, 한 편만 발행해도 나머지 화면의 숫자가 낡는다.
  // 카테고리 수는 사람이 관리 화면에서 늘리는 값이라 실질적으로 十수 개를 넘지 않는다.
  const categories = await getCategories();
  for (const category of categories) pushPath(`/categories/${category.slug}`);

  const unique = [...new Set(paths)];
  for (const path of unique) revalidatePath(path);

  return NextResponse.json({ revalidated: unique });
}
