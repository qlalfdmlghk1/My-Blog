import type { Metadata } from 'next';

import { SubcategoryList } from '@/components/lists/SubcategoryList';
import { getSubcategories, readCategories } from '@/lib/categories.server';
import { decodeSlugParam } from '@/lib/slug';

export const revalidate = 3600;

/** 소분류도 관리 화면에서 만드므로 빌드 시점에 목록이 닫히지 않는다 */
export const dynamicParams = true;

type Params = { params: Promise<{ slug: string; sub: string }> };

export async function generateStaticParams() {
  const subs = await getSubcategories();
  return subs.map((s) => ({ slug: s.category, sub: s.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug, sub } = await params;
  const category = decodeSlugParam(slug);
  const subcategory = decodeSlugParam(sub);

  const [{ categories }, subs] = await Promise.all([readCategories(), getSubcategories()]);
  const parent = categories.find((c) => c.slug === category);
  const found = subs.find((s) => s.category === category && s.slug === subcategory);
  if (!parent || !found) return {};

  return {
    title: `${found.name} · ${parent.name}`,
    description: `${parent.name} > ${found.name} 글 목록`,
    alternates: { canonical: `/categories/${category}/${subcategory}` },
  };
}

export default async function SubcategoryPage({ params }: Params) {
  const { slug, sub } = await params;
  return (
    <SubcategoryList
      category={decodeSlugParam(slug)}
      subcategory={decodeSlugParam(sub)}
      page={1}
    />
  );
}
