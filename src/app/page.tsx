import { PostCard } from '@/components/PostCard';
import { TagFilter } from '@/components/TagFilter';
import { getAllTags, getPublishedPosts } from '@/lib/posts';

/** ISR — 평소에는 생성된 정적 HTML 을 서빙하고, 발행 시 revalidatePath 로 갱신 */
export const revalidate = 3600;

export default async function HomePage() {
  const [posts, tags] = await Promise.all([getPublishedPosts(), getAllTags()]);

  return (
    <main className="mx-auto max-w-shell px-5 py-10">
      <TagFilter tags={tags} />

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
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      )}
    </main>
  );
}
