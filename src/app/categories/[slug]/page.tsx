import type { Metadata } from 'next';

import { CategoryList } from '@/components/lists/CategoryList';
import { getCategories, getCategoryBySlug } from '@/lib/categories.server';
import { decodeSlugParam } from '@/lib/slug';

export const revalidate = 3600;

/**
 * 카테고리는 관리 화면에서 만들 수 있으므로 빌드 시점에 목록이 닫히지 않는다.
 * 빌드 후에 만든 카테고리도 첫 요청에 생성되어야 한다 (글 상세와 같은 이유).
 * 목록에 없는 slug 는 CategoryList 가 notFound() 로 떨어뜨린다.
 */
export const dynamicParams = true;

type Params = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const decoded = decodeSlugParam(slug);
  const category = await getCategoryBySlug(decoded);
  if (!category) return {};
  return {
    title: category.name,
    description: category.hint ? `${category.name} — ${category.hint}` : category.name,
    alternates: { canonical: `/categories/${category.slug}` },
  };
}

export default async function CategoryPage({ params }: Params) {
  const { slug } = await params;
  return <CategoryList slug={decodeSlugParam(slug)} page={1} />;
}
