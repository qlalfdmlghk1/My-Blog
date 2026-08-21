import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ListShell } from '@/components/ListShell';
import { PostCard } from '@/components/PostCard';
import { CATEGORY_SLUGS, getCategory, isCategorySlug } from '@/lib/categories';
import { getAllTags, getCategoryCounts, getPostsByCategory, getPublishedPosts } from '@/lib/posts';

export const revalidate = 3600;

/** 카테고리는 6개 고정이라 전부 프리렌더한다. 목록 밖 slug 는 404. */
export const dynamicParams = false;

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return CATEGORY_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  if (!isCategorySlug(slug)) return {};
  const c = getCategory(slug);
  return {
    title: c.name,
    description: `${c.name} — ${c.hint}`,
    alternates: { canonical: `/categories/${slug}` },
  };
}

export default async function CategoryPage({ params }: Params) {
  const { slug } = await params;
  if (!isCategorySlug(slug)) notFound();

  // 목록을 한 번 읽어 집계·필터에 함께 쓴다 (Firestore 조회 1회)
  const all = await getPublishedPosts();
  const [tags, categories, posts] = await Promise.all([
    getAllTags(all),
    getCategoryCounts(all),
    getPostsByCategory(slug),
  ]);
  const category = getCategory(slug);

  return (
    <ListShell categories={categories} tags={tags} activeCategory={slug}>
      <header className="border-b border-line pb-6">
        <h1 className="text-2xl font-bold tracking-tight">{category.name}</h1>
        <p className="mt-2 text-sm text-ink-dim">
          {category.hint} · {posts.length}개
        </p>
      </header>

      {posts.length === 0 ? (
        <p className="py-20 text-center text-sm text-ink-dim">
          이 카테고리에 아직 글이 없습니다.
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
