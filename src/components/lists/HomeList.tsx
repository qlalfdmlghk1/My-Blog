import { notFound } from 'next/navigation';

import { ListShell } from '@/components/ListShell';
import { Pagination } from '@/components/Pagination';
import { PostCard } from '@/components/PostCard';
import { SiteIntro } from '@/components/SiteIntro';
import { paginate } from '@/lib/pagination';
import { getAllTags, getCategoryTree, readPublishedPosts } from '@/lib/posts';

/**
 * 홈 목록의 본문 — `/`(1페이지)와 `/page/[page]`(2페이지부터)가 함께 쓴다.
 *
 * 라우트마다 따로 조립하지 않는다. 두 벌로 두면 카드 한 줄을 고칠 때 고칠 곳이
 * 두 군데가 되고, 1페이지와 2페이지의 화면이 조금씩 어긋나기 시작한다.
 */
export async function HomeList({ page }: { page: number }) {
  // 분류 트리·태그를 이 목록에서 집계하므로 Firestore 를 한 번만 읽는다
  const { posts, degraded } = await readPublishedPosts();
  const [categories, tags] = await Promise.all([getCategoryTree(posts), getAllTags(posts)]);
  // 글 카드가 배지 색·이름을 각자 조회하지 않도록 한 번 만들어 넘긴다
  const byslug = new Map(categories.map((c) => [c.slug, c]));

  const paged = paginate(posts, page);
  if (!paged) {
    // 조회가 실패해 목록이 비었을 뿐인데 404 를 내면, 살아 있는 URL 이 revalidate
    // 주기(1시간) 동안 404 로 굳는다. 던지면 ISR 이 직전 정적 페이지를 계속 서빙한다.
    if (degraded) throw new Error(`글 조회 실패 — /page/${page} 를 404 로 굳히지 않는다`);
    notFound();
  }

  return (
    <ListShell categories={categories} tags={tags} total={posts.length}>
      <SiteIntro />

      {posts.length === 0 ? (
        <p className="py-20 text-center text-sm text-ink-dim">
          아직 발행된 글이 없습니다.
          <br />
          <span className="mt-2 inline-block">
            <code className="rounded bg-surface px-1.5 py-0.5">/admin/write</code>
            에서 첫 글을 작성하세요.
          </span>
        </p>
      ) : (
        <>
          <div className="mt-8">
            {paged.items.map((p) => (
              <PostCard key={p.id} post={p} category={byslug.get(p.category)} />
            ))}
          </div>
          <Pagination page={paged.page} totalPages={paged.totalPages} basePath="/" />
        </>
      )}
    </ListShell>
  );
}
