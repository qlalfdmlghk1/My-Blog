import { notFound } from 'next/navigation';

import { ListShell } from '@/components/ListShell';
import { Pagination } from '@/components/Pagination';
import { PostCard } from '@/components/PostCard';
import { SubcategoryChips } from '@/components/SubcategoryChips';
import { readCategories } from '@/lib/categories.server';
import { paginate } from '@/lib/pagination';
import {
  LOOSE_SUBCATEGORY,
  LOOSE_SUBCATEGORY_NAME,
  filterPostsBySubcategory,
  getCategoryTree,
  readPublishedPosts,
} from '@/lib/posts';

/** 소분류 목록의 본문 — `/categories/[slug]/[sub]` 와 그 `/page/[page]` 가 함께 쓴다 */
export async function SubcategoryList({
  category,
  subcategory,
  page,
}: {
  category: string;
  subcategory: string;
  page: number;
}) {
  const { posts: all, degraded: postsDegraded } = await readPublishedPosts();
  const { categories: known, degraded } = await readCategories();
  const tree = await getCategoryTree(all, known);

  const parent = tree.find((c) => c.slug === category);
  // '분류 없음'은 문서가 없는 자리라 트리에서 찾지 않고 이름을 붙여 세운다.
  // 0편이 돼도 404 로 두지 않는다 — 칩은 사라지지만 이미 열린 주소는 빈 목록으로 남긴다.
  const found =
    subcategory === LOOSE_SUBCATEGORY
      ? parent && { slug: LOOSE_SUBCATEGORY, name: LOOSE_SUBCATEGORY_NAME }
      : parent?.subs.find((s) => s.slug === subcategory);

  if (!parent || !found) {
    // 조회가 실패해 목록이 비었을 뿐인데 404 를 내면, 살아 있는 URL 이 revalidate
    // 주기(1시간) 동안 404 로 굳는다. 던지면 ISR 이 직전 정적 페이지를 계속 서빙한다.
    if (degraded) {
      throw new Error(
        `분류 조회 실패 — /categories/${category}/${subcategory} 를 404 로 굳히지 않는다`,
      );
    }
    notFound();
  }

  const posts = filterPostsBySubcategory(all, category, subcategory);
  const basePath = `/categories/${encodeURIComponent(parent.slug)}/${encodeURIComponent(found.slug)}`;
  const paged = paginate(posts, page);
  if (!paged) {
    if (postsDegraded) {
      throw new Error(`글 조회 실패 — ${basePath}/page/${page} 를 404 로 굳히지 않는다`);
    }
    notFound();
  }

  return (
    <ListShell categories={tree} activeCategory={parent.slug}>
      {/* 카테고리 화면과 같은 머리말이다 — 제목은 "대분류 / 소분류", 칩에서 이 소분류가
          활성이다. 위 탭에서 대분류가, 칩에서 소분류가 강조되니 소분류 화면은
          "카테고리 화면을 걸러 본 것"으로 읽히고, 다른 소분류로 가는 길이 바로 보인다.
          색은 대분류의 것이다 — 소분류는 자기 색을 갖지 않는다. */}
      <header className="rise mt-8 border-b border-line pb-6 sm:mt-10">
        <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight sm:text-[28px]">
          <span
            aria-hidden
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: `var(--pal-${parent.palette}-fg)` }}
          />
          <span className="text-ink-dim">{parent.name}</span>
          <span aria-hidden className="text-ink-dim">/</span>
          {found.name}
        </h1>
        {/* 개수는 이 페이지가 아니라 소분류 전체 기준 */}
        <p className="mt-2 text-sm text-ink-dim">{posts.length}개</p>
        <SubcategoryChips category={parent} active={found.slug} />
      </header>

      {posts.length === 0 ? (
        <p className="py-20 text-center text-sm text-ink-dim">
          이 소분류에 아직 글이 없습니다.
        </p>
      ) : (
        <>
          <div className="stagger mt-8">
            {paged.items.map((p) => (
              <PostCard key={p.id} post={p} category={parent} />
            ))}
          </div>
          <Pagination page={paged.page} totalPages={paged.totalPages} basePath={basePath} />
        </>
      )}
    </ListShell>
  );
}
