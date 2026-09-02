import { notFound } from 'next/navigation';

import { ListShell } from '@/components/ListShell';
import { Pagination } from '@/components/Pagination';
import { PostCard } from '@/components/PostCard';
import { readCategories } from '@/lib/categories.server';
import { paginate } from '@/lib/pagination';
import {
  getAllTags,
  getCategoryTree,
  getPostsByCategory,
  readPublishedPosts,
} from '@/lib/posts';

/** 카테고리 목록의 본문 — `/categories/[slug]` 와 그 `/page/[page]` 가 함께 쓴다 */
export async function CategoryList({ slug, page }: { slug: string; page: number }) {
  // 목록을 한 번 읽어 집계·필터에 함께 쓴다 (posts 조회 1회).
  const { posts: all, degraded: postsDegraded } = await readPublishedPosts();
  const { categories: known, degraded } = await readCategories();
  const [categories, tags, posts] = await Promise.all([
    getCategoryTree(all, known),
    getAllTags(all),
    getPostsByCategory(slug, all),
  ]);

  const category = categories.find((c) => c.slug === slug);
  if (!category) {
    // 조회가 실패해 목록이 비었을 뿐인데 404 를 내면, 살아 있는 URL 이 revalidate
    // 주기(1시간) 동안 404 로 굳는다. 던지면 ISR 이 직전 정적 페이지를 계속 서빙한다.
    if (degraded) throw new Error(`카테고리 조회 실패 — /categories/${slug} 를 404 로 굳히지 않는다`);
    notFound();
  }

  const basePath = `/categories/${encodeURIComponent(category.slug)}`;
  const paged = paginate(posts, page);
  if (!paged) {
    if (postsDegraded) throw new Error(`글 조회 실패 — ${basePath}/page/${page} 를 404 로 굳히지 않는다`);
    notFound();
  }

  return (
    <ListShell
      categories={categories}
      tags={tags}
      total={all.length}
      activeCategory={category.slug}
    >
      <header className="rise border-b border-line pb-6">
        {/* 사이드바 트리와 같은 색 점을 제목에도 단다 — 어느 분류를 보고 있는지
            목록 위쪽에서 바로 읽히고, 색이 등장하는 자리가 분류로 일관된다. */}
        <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight">
          <span
            aria-hidden
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: `var(--pal-${category.palette}-fg)` }}
          />
          {category.name}
        </h1>
        {/* 개수는 이 페이지가 아니라 카테고리 전체 기준이다 — 분류의 크기를 알리는 숫자 */}
        <p className="mt-2 text-sm text-ink-dim">
          {category.hint ? `${category.hint} · ` : ''}
          {posts.length}개
        </p>
      </header>

      {posts.length === 0 ? (
        <p className="py-20 text-center text-sm text-ink-dim">
          이 카테고리에 아직 글이 없습니다.
        </p>
      ) : (
        <>
          <div className="stagger mt-8">
            {paged.items.map((p) => (
              <PostCard key={p.id} post={p} category={category} />
            ))}
          </div>
          <Pagination page={paged.page} totalPages={paged.totalPages} basePath={basePath} />
        </>
      )}
    </ListShell>
  );
}
