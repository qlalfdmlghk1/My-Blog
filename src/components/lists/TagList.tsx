import { notFound } from 'next/navigation';

import { ListShell } from '@/components/ListShell';
import { Pagination } from '@/components/Pagination';
import { PostCard } from '@/components/PostCard';
import { paginate } from '@/lib/pagination';
import { filterPostsByTag, getCategoryTree, readPublishedPosts } from '@/lib/posts';

/** 태그 목록의 본문 — `/tags/[tag]` 와 그 `/page/[page]` 가 함께 쓴다 */
export async function TagList({ tag, page }: { tag: string; page: number }) {
  // 분류 탭 · 배지가 쓸 트리를 같은 목록에서 집계한다 (Firestore 조회 1회)
  const { posts: all, degraded } = await readPublishedPosts();
  const categories = await getCategoryTree(all);
  const byslug = new Map(categories.map((c) => [c.slug, c]));
  const posts = filterPostsByTag(all, tag);

  const basePath = `/tags/${encodeURIComponent(tag)}`;
  const paged = paginate(posts, page);
  if (!paged) {
    // 조회가 실패해 목록이 비었을 뿐인데 404 를 내면, 살아 있는 URL 이 revalidate
    // 주기(1시간) 동안 404 로 굳는다. 던지면 ISR 이 직전 정적 페이지를 계속 서빙한다.
    if (degraded) throw new Error(`글 조회 실패 — ${basePath}/page/${page} 를 404 로 굳히지 않는다`);
    notFound();
  }

  return (
    <ListShell categories={categories}>
      <header className="rise mt-8 border-b border-line pb-6 sm:mt-10">
        <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">#{tag}</h1>
        {/* 개수는 이 페이지가 아니라 태그 전체 기준 */}
        <p className="mt-2 text-sm text-ink-dim">{posts.length}개</p>
      </header>

      {posts.length === 0 ? (
        <p className="py-20 text-center text-sm text-ink-dim">
          이 태그에 해당하는 글이 없습니다.
        </p>
      ) : (
        <>
          <div className="stagger mt-8">
            {paged.items.map((p) => (
              <PostCard key={p.id} post={p} category={byslug.get(p.category)} />
            ))}
          </div>
          <Pagination page={paged.page} totalPages={paged.totalPages} basePath={basePath} />
        </>
      )}
    </ListShell>
  );
}
