import type { Metadata } from 'next';

import { TagList } from '@/components/lists/TagList';
import { getAllTags } from '@/lib/posts';
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
  return <TagList tag={decodeSlugParam(tag)} page={1} />;
}
