import type { Metadata } from 'next';

import { ListShell } from '@/components/ListShell';
import { PostCard } from '@/components/PostCard';
import {
  filterPostsByTag,
  getAllTags,
  getCategoryCounts,
  getPublishedPosts,
} from '@/lib/posts';
import { decodeSlugParam } from '@/lib/slug';

export const revalidate = 3600;
export const dynamicParams = true;

type Params = { params: Promise<{ tag: string }> };

export async function generateStaticParams() {
  const tags = await getAllTags();
  return tags.map(({ tag }) => ({ tag }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { tag } = await params;
  const decoded = decodeSlugParam(tag);
  return {
    title: `#${decoded}`,
    description: `${decoded} 태그가 붙은 글 목록`,
    alternates: { canonical: `/tags/${tag}` },
  };
}

export default async function TagPage({ params }: Params) {
  const { tag } = await params;
  const decoded = decodeSlugParam(tag);
  // 목록·사이드바 집계가 같은 목록을 보게 한다 — 출처가 갈리면 사이드바에는
  // "#태그 3", 본문에는 "0개"가 동시에 뜨는 상태가 생긴다. (Firestore 조회 1회)
  const all = await getPublishedPosts();
  const [tags, categories] = await Promise.all([getAllTags(all), getCategoryCounts(all)]);
  const posts = filterPostsByTag(all, decoded);

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
