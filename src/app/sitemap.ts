import type { MetadataRoute } from 'next';

import { getCategories } from '@/lib/categories.server';
import { getAllTags, getPublishedPosts } from '@/lib/posts';
import { absoluteUrl } from '@/lib/site';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getPublishedPosts();
  const [tags, categories] = await Promise.all([getAllTags(posts), getCategories()]);

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
    // 글이 없는 카테고리도 싣는다 — 사이트 구조 자체를 알린다
    ...categories.map((c) => ({
      url: absoluteUrl(`/categories/${c.slug}`),
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
