import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { CategoryBadge } from '@/components/CategoryBadge';
import { hasToc, PostToc } from '@/components/PostToc';
import { TagChip } from '@/components/TagChip';
import { renderMarkdown } from '@/lib/markdown';
import { getPostBySlug, getPublishedSlugs } from '@/lib/posts';
import { SITE } from '@/lib/site';

export const revalidate = 3600;
/** 빌드 시점에 없던 slug 도 첫 요청에 생성한다 (Firestore 가 소스이므로 필수) */
export const dynamicParams = true;

type Params = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const slugs = await getPublishedSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: '글을 찾을 수 없습니다' };
  return {
    title: post.title,
    description: post.excerpt || SITE.description,
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.excerpt,
      publishedTime: post.publishedAt ?? undefined,
      modifiedTime: post.updatedAt,
      tags: post.tags,
      url: `/posts/${post.slug}`,
      ...(post.coverImage ? { images: [{ url: post.coverImage }] } : {}),
    },
    alternates: { canonical: `/posts/${post.slug}` },
  };
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Seoul',
  }).format(new Date(iso));
}

export default async function PostPage({ params }: Params) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const { html, toc } = await renderMarkdown(post.content);
  // 목차를 그릴지 여기서 정한다 — 컬럼 구성과 목차 렌더가 같은 값을 봐야
  // 목차 없는 글에서 빈 컬럼이 남아 본문이 왼쪽으로 밀리는 일이 없다.
  const withToc = hasToc(toc);

  return (
    // 본문은 읽기 좋은 폭(prose)을 유지하고, 목차는 넓은 화면에서만 옆에 붙인다.
    // 목차를 위해 본문 폭을 늘리면 한 줄이 길어져 오히려 읽기 나빠진다.
    // 본문 한 줄 길이는 목차 유무와 무관하게 44rem 을 지킨다 — 목차가 붙는 xl 에서만
    // 컨테이너를 넓혀 옆자리를 만든다. 아래 폭에서까지 76rem 을 쓰면 목차 있는 글만
    // 한 줄이 1.7배 길어져 같은 블로그의 글이 서로 다른 읽기 경험이 된다.
    <main
      id="main"
      className={
        withToc
          ? 'mx-auto max-w-prose px-5 py-12 xl:grid xl:max-w-shell xl:grid-cols-[minmax(0,44rem)_13rem] xl:gap-10 xl:justify-center'
          : 'mx-auto max-w-prose px-5 py-12'
      }
    >
      <div className="min-w-0">
      <header className="border-b border-line pb-7">
        <div className="mb-3 flex items-center gap-2.5">
          <CategoryBadge slug={post.category} />
          <time
            dateTime={post.publishedAt ?? undefined}
            className="text-xs tabular-nums text-ink-dim"
          >
            {formatDate(post.publishedAt)}
          </time>
        </div>
        <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight">
          {post.title}
        </h1>
        {post.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {post.tags.map((t) => (
              <TagChip key={t} tag={t} href={`/tags/${encodeURIComponent(t)}`} />
            ))}
          </div>
        )}
      </header>

      <article className="md mt-9" dangerouslySetInnerHTML={{ __html: html }} />

      <nav className="mt-16 border-t border-line pt-6 text-sm">
        <Link href="/" className="font-semibold hover:underline">
          ← 글 목록
        </Link>
      </nav>
      </div>

      <PostToc toc={toc} />
    </main>
  );
}
