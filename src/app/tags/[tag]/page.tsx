import type { Metadata } from 'next';

import { ListShell } from '@/components/ListShell';
import { PostCard } from '@/components/PostCard';
import { getAllTags, getCategoryCounts, getPostsByTag } from '@/lib/posts';

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
  const [posts, tags, categories] = await Promise.all([
    getPostsByTag(decoded),
    getAllTags(),
    getCategoryCounts(),
  ]);

  return (
    <ListShell categories={categories} tags={tags} activeTag={decoded}>
      <header className="border-b border-line pb-6">
        <h1 className="text-2xl font-bold tracking-tight">#{decoded}</h1>
        <p className="mt-2 text-sm text-ink-dim">{posts.length}개</p>
      </header>

      {posts.length === 0 ? (
        <p className="py-20 text-center text-sm text-ink-dim">
          이 태그에 해당하는 글이 없습니다.
        </p>
      ) : (
        <div className="mt-8">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      )}
    </ListShell>
  );
}
