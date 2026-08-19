import type { Metadata } from 'next';

import { PostCard } from '@/components/PostCard';
import { TagFilter } from '@/components/TagFilter';
import { getAllTags, getPostsByTag } from '@/lib/posts';

export const revalidate = 3600;
export const dynamicParams = true;

type Params = { params: Promise<{ tag: string }> };

export async function generateStaticParams() {
  const tags = await getAllTags();
  return tags.map(({ tag }) => ({ tag }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);
  return {
    title: `#${decoded}`,
    description: `${decoded} 태그가 붙은 글 목록`,
    alternates: { canonical: `/tags/${tag}` },
  };
}

export default async function TagPage({ params }: Params) {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);
  const [posts, tags] = await Promise.all([getPostsByTag(decoded), getAllTags()]);

  return (
    <main className="mx-auto max-w-shell px-5 py-10">
      <TagFilter tags={tags} activeTag={decoded} />

      <h1 className="mt-8 text-sm text-ink-dim">
        <span className="font-semibold text-ink">#{decoded}</span> · {posts.length}개
      </h1>

      {posts.length === 0 ? (
        <p className="py-20 text-center text-sm text-ink-dim">
          이 태그에 해당하는 글이 없습니다.
        </p>
      ) : (
        <div className="mt-4">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      )}
    </main>
  );
}
