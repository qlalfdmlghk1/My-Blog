import { ListShell } from '@/components/ListShell';
import { PostCard } from '@/components/PostCard';
import { SiteIntro } from '@/components/SiteIntro';
import { getCategoryTree, getPublishedPosts } from '@/lib/posts';

/** ISR — 평소에는 생성된 정적 HTML 을 서빙하고, 발행 시 revalidatePath 로 갱신 */
export const revalidate = 3600;

export default async function HomePage() {
  // 분류 트리(카테고리 + 그 안의 태그)를 이 목록에서 집계하므로 Firestore 를 한 번만 읽는다
  const posts = await getPublishedPosts();
  const categories = await getCategoryTree(posts);
  // 글 카드가 배지 색·이름을 각자 조회하지 않도록 한 번 만들어 넘긴다
  const byslug = new Map(categories.map((c) => [c.slug, c]));

  return (
    <ListShell categories={categories} total={posts.length}>
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
        <div className="mt-8">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} category={byslug.get(p.category)} />
          ))}
        </div>
      )}
    </ListShell>
  );
}
