import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ListShell } from '@/components/ListShell';
import { PostCard } from '@/components/PostCard';
import { getCategories, getCategoryBySlug } from '@/lib/categories.server';
import { getCategoryTree, getPostsByCategory, getPublishedPosts } from '@/lib/posts';
import { decodeSlugParam } from '@/lib/slug';

export const revalidate = 3600;

/**
 * 카테고리는 관리 화면에서 만들 수 있으므로 빌드 시점에 목록이 닫히지 않는다.
 * 빌드 후에 만든 카테고리도 첫 요청에 생성되어야 한다 (글 상세와 같은 이유).
 * 목록에 없는 slug 는 아래에서 notFound() 로 떨어뜨린다.
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
  const decoded = decodeSlugParam(slug);

  // 목록을 한 번 읽어 집계·필터에 함께 쓴다 (posts 조회 1회).
  // 두 함수 모두 읽어둔 목록을 받으므로 여기서 추가 조회가 일어나지 않는다.
  const all = await getPublishedPosts();
  const [categories, posts] = await Promise.all([
    getCategoryTree(all),
    getPostsByCategory(decoded, all),
  ]);

  const category = categories.find((c) => c.slug === decoded);
  if (!category) notFound();

  return (
    <ListShell categories={categories} activeCategory={category.slug}>
      <header className="border-b border-line pb-6">
        <h1 className="text-2xl font-bold tracking-tight">{category.name}</h1>
        <p className="mt-2 text-sm text-ink-dim">
          {category.hint ? `${category.hint} · ` : ''}
          {posts.length}개
        </p>
      </header>

      {posts.length === 0 ? (
        <p className="py-20 text-center text-sm text-ink-dim">
          이 카테고리에 아직 글이 없습니다.
        </p>
      ) : (
        <div className="mt-8">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} category={category} />
          ))}
        </div>
      )}
    </ListShell>
  );
}
