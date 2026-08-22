import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CategoryList } from '@/components/lists/CategoryList';
import { getCategories, getCategoryBySlug } from '@/lib/categories.server';
import { pageHref, pageParams, parsePageParam } from '@/lib/pagination';
import { getPostsByCategory, getPublishedPosts } from '@/lib/posts';
import { decodeSlugParam } from '@/lib/slug';

export const revalidate = 3600;
export const dynamicParams = true;

type Params = { params: Promise<{ slug: string; page: string }> };

/**
 * `page` 는 정적 세그먼트라 형제인 `[sub]` 보다 먼저 매칭된다.
 * 즉 `page` 라는 이름의 소분류는 이 경로에 가려진다 — 소분류 slug 로 `page` 를
 * 허용하지 않는 이유이며, 관리 화면에서 막아야 할 예약어다.
 */
export async function generateStaticParams() {
  const [categories, posts] = await Promise.all([getCategories(), getPublishedPosts()]);
  const perCategory = await Promise.all(
    categories.map(async (c) => {
      const inCategory = await getPostsByCategory(c.slug, posts);
      return pageParams(inCategory.length).map(({ page }) => ({ slug: c.slug, page }));
    }),
  );
  return perCategory.flat();
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug, page: raw } = await params;
  const page = parsePageParam(raw);
  const category = await getCategoryBySlug(decodeSlugParam(slug));
  if (!category || !page) return {};
  // Pagination 이 만드는 주소와 같은 표기를 써야 한다 — 한글 slug 에서 갈린다
  const base = `/categories/${encodeURIComponent(category.slug)}`;
  return {
    title: page > 1 ? `${category.name} — ${page}페이지` : category.name,
    alternates: { canonical: pageHref(base, page) },
  };
}

/** 1페이지도 리다이렉트 없이 그대로 그린다 — 정본은 canonical 이 가리킨다 (홈 목록과 같은 규칙) */
export default async function CategoryPagedPage({ params }: Params) {
  const { slug, page: raw } = await params;
  const page = parsePageParam(raw);
  if (!page) notFound();
  return <CategoryList slug={decodeSlugParam(slug)} page={page} />;
}
