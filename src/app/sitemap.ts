import type { MetadataRoute } from 'next';

import { CATEGORY_SLUGS } from '@/lib/categories';
import { getAllTags, getPublishedPosts } from '@/lib/posts';
import { absoluteUrl } from '@/lib/site';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getPublishedPosts();
  const tags = await getAllTags(posts);

  return [
    {
      url: absoluteUrl('/'),
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    ...posts.map((p) => ({
      url: absoluteUrl(`/posts/${p.slug}`),
      lastModified: new Date(p.updatedAt),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    // 카테고리는 6개 고정이라 글이 없어도 항상 싣는다 — 사이트 구조 자체를 알린다
    ...CATEGORY_SLUGS.map((slug) => ({
      url: absoluteUrl(`/categories/${slug}`),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    })),
    ...tags.map(({ tag }) => ({
      url: absoluteUrl(`/tags/${encodeURIComponent(tag)}`),
      changeFrequency: 'weekly' as const,
      priority: 0.4,
    })),
  ];
}
