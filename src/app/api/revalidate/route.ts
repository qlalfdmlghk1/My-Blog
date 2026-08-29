import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

import { adminAuth, hasAdminCredentials } from '@/lib/firebase/admin';
import { getCategories, getSubcategories } from '@/lib/categories.server';
import { countPages, pageHref } from '@/lib/pagination';
import {
  filterPostsBySubcategory,
  filterPostsByTag,
  getPostsByCategory,
  getPublishedPosts,
} from '@/lib/posts';

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

  let body: { slug?: unknown; tags?: unknown; scope?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: '본문을 읽을 수 없습니다.' }, { status: 400 });
  }

  const strings = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

  const slug = typeof body.slug === 'string' ? body.slug : '';
  const tags = strings(body.tags);
  const scope = typeof body.scope === 'string' ? body.scope : '';

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

  /**
   * 목록은 1페이지만 갱신해서는 부족하다 — 글 한 편이 늘면 그 아래 페이지의 내용이
   * 통째로 한 칸씩 밀린다. 목록마다 현재 페이지 수를 세어 `/page/N` 까지 함께 무효화한다.
   * (빠뜨리면 '발행했는데 2페이지가 재검증 주기 동안 안 바뀐다'가 조용히 발생한다)
   */
  const posts = await getPublishedPosts();
  const pushList = (base: string, count: number) => {
    // 한 칸 더 돈다. 변경 **이후** 글 수로 페이지를 세므로, 페이지가 줄어드는 변경
    // (삭제 · 내림 · 분류 이동)에서는 없어진 마지막 페이지가 루프 밖으로 빠진다 —
    // 그 경로는 정적 캐시에 남아 사라진 글을 재검증 주기 동안 계속 보여준다.
    // 없는 경로의 revalidatePath 는 무동작이라 한 칸 여유를 두는 편이 싸다.
    for (let page = 2; page <= countPages(count) + 1; page += 1) {
      pushPath(pageHref(base, page));
    }
  };

  // 용어 사전은 저장된 본문이 아니라 렌더 시점에 글에 링크를 붙인다
  // (`lib/markdown.ts`). 그래서 사전이 바뀌면 그 낱말을 쓴 글의 HTML 이 전부 낡는데,
  // 어느 글인지는 본문을 다 훑어야 알 수 있다. 전량 무효화가 그 탐색보다 싸다.
  if (scope === 'glossary') {
    pushPath('/glossary');
    for (const post of posts) pushPath(`/posts/${post.slug}`);
  }

  pushList('/', posts.length);
  for (const tag of tags) {
    pushPath(`/tags/${tag}`);
    pushList(`/tags/${tag}`, filterPostsByTag(posts, tag).length);
  }

  // 카테고리는 글이 속한 것만 갱신하면 부족하다 — 사이드바가 카테고리별 글 수를
  // 모든 목록 화면에 함께 렌더하므로, 한 편만 발행해도 나머지 화면의 숫자가 낡는다.
  // 카테고리 수는 사람이 관리 화면에서 늘리는 값이라 실질적으로 十수 개를 넘지 않는다.
  const [categories, subcategories] = await Promise.all([
    getCategories(),
    getSubcategories(),
  ]);
  for (const category of categories) {
    pushPath(`/categories/${category.slug}`);
    pushList(
      `/categories/${category.slug}`,
      (await getPostsByCategory(category.slug, posts)).length,
    );
  }
  // 소분류 목록도 전량 갱신한다 — 글 한 편의 소분류가 바뀌면 떠난 쪽과 도착한 쪽
  // 두 화면이 동시에 낡고, 어느 쪽이 바뀌었는지는 이 요청만 봐서는 알 수 없다.
  for (const sub of subcategories) {
    pushPath(`/categories/${sub.category}/${sub.slug}`);
    pushList(
      `/categories/${sub.category}/${sub.slug}`,
      filterPostsBySubcategory(posts, sub.category, sub.slug).length,
    );
  }

  const unique = [...new Set(paths)];
  for (const path of unique) revalidatePath(path);

  return NextResponse.json({ revalidated: unique });
}
