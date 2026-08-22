import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { TagList } from '@/components/lists/TagList';
import { pageHref, pageParams, parsePageParam } from '@/lib/pagination';
import { filterPostsByTag, getAllTags, getPublishedPosts } from '@/lib/posts';
import { decodeSlugParam } from '@/lib/slug';

export const revalidate = 3600;
export const dynamicParams = true;

type Params = { params: Promise<{ tag: string; page: string }> };

export async function generateStaticParams() {
  const posts = await getPublishedPosts();
  const tags = await getAllTags(posts);
  return tags.flatMap(({ tag }) =>
    pageParams(filterPostsByTag(posts, tag).length).map(({ page }) => ({ tag, page })),
  );
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { tag, page: raw } = await params;
  const page = parsePageParam(raw);
  if (!page) return {};
  const decoded = decodeSlugParam(tag);
  return {
    title: page > 1 ? `#${decoded} — ${page}페이지` : `#${decoded}`,
    alternates: { canonical: pageHref(`/tags/${tag}`, page) },
  };
}

/** 1페이지도 리다이렉트 없이 그대로 그린다 — 정본은 canonical 이 가리킨다 (홈 목록과 같은 규칙) */
export default async function TagPagedPage({ params }: Params) {
  const { tag, page: raw } = await params;
  const page = parsePageParam(raw);
  if (!page) notFound();
  return <TagList tag={decodeSlugParam(tag)} page={page} />;
}
