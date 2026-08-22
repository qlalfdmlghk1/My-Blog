import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ListShell } from '@/components/ListShell';
import { Pagination } from '@/components/Pagination';
import { PostCard } from '@/components/PostCard';
import { readCategories } from '@/lib/categories.server';
import { paginate } from '@/lib/pagination';
import {
  filterPostsBySubcategory,
  getAllTags,
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
  const [tree, tags] = await Promise.all([getCategoryTree(all, known), getAllTags(all)]);

  const parent = tree.find((c) => c.slug === category);
  const found = parent?.subs.find((s) => s.slug === subcategory);

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
    <ListShell
      categories={tree}
      tags={tags}
      total={all.length}
      activeCategory={parent.slug}
      activeSubcategory={found.slug}
    >
      <header className="border-b border-line pb-6">
        {/* 소분류만 보면 어느 대분류 소속인지 알 수 없다 — 상위를 함께 보이고 링크한다 */}
        <nav aria-label="상위 분류" className="mb-1.5 text-xs text-ink-dim">
          <Link
            href={`/categories/${encodeURIComponent(parent.slug)}`}
            className="hover:text-ink hover:underline"
          >
            {parent.name}
          </Link>
        </nav>
        <h1 className="text-2xl font-bold tracking-tight">{found.name}</h1>
        {/* 개수는 이 페이지가 아니라 소분류 전체 기준 */}
        <p className="mt-2 text-sm text-ink-dim">{posts.length}개</p>
      </header>

      {posts.length === 0 ? (
        <p className="py-20 text-center text-sm text-ink-dim">
          이 소분류에 아직 글이 없습니다.
        </p>
      ) : (
        <>
          <div className="mt-8">
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
