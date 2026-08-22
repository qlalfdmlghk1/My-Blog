import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { SubcategoryList } from '@/components/lists/SubcategoryList';
import { getSubcategories, readCategories } from '@/lib/categories.server';
import { pageHref, pageParams, parsePageParam } from '@/lib/pagination';
import { filterPostsBySubcategory, getPublishedPosts } from '@/lib/posts';
import { decodeSlugParam } from '@/lib/slug';

export const revalidate = 3600;
export const dynamicParams = true;

type Params = { params: Promise<{ slug: string; sub: string; page: string }> };

export async function generateStaticParams() {
  const [subs, posts] = await Promise.all([getSubcategories(), getPublishedPosts()]);
  return subs.flatMap((s) =>
    pageParams(filterPostsBySubcategory(posts, s.category, s.slug).length).map(({ page }) => ({
      slug: s.category,
      sub: s.slug,
      page,
    })),
  );
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug, sub, page: raw } = await params;
  const page = parsePageParam(raw);
  const category = decodeSlugParam(slug);
  const subcategory = decodeSlugParam(sub);

  const [{ categories }, subs] = await Promise.all([readCategories(), getSubcategories()]);
  const parent = categories.find((c) => c.slug === category);
  const found = subs.find((s) => s.category === category && s.slug === subcategory);
  if (!parent || !found || !page) return {};

  // Pagination 이 만드는 주소와 같은 표기를 써야 한다 — 한글 slug 에서 갈린다
  const base = `/categories/${encodeURIComponent(category)}/${encodeURIComponent(subcategory)}`;
  return {
    title:
      page > 1
        ? `${found.name} · ${parent.name} — ${page}페이지`
        : `${found.name} · ${parent.name}`,
    alternates: { canonical: pageHref(base, page) },
  };
}

/** 1페이지도 리다이렉트 없이 그대로 그린다 — 정본은 canonical 이 가리킨다 (홈 목록과 같은 규칙) */
export default async function SubcategoryPagedPage({ params }: Params) {
  const { slug, sub, page: raw } = await params;
  const page = parsePageParam(raw);
  if (!page) notFound();
  return (
    <SubcategoryList
      category={decodeSlugParam(slug)}
      subcategory={decodeSlugParam(sub)}
      page={page}
    />
  );
}
