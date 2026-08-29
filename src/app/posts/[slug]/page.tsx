import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { CSSProperties } from 'react';

import { CategoryBadge } from '@/components/CategoryBadge';
import { hasToc, PostToc } from '@/components/PostToc';
import { TagChip } from '@/components/TagChip';
import { getCategoryBySlug } from '@/lib/categories.server';
import { getGlossaryAnchors } from '@/lib/glossary.server';
import { renderMarkdown } from '@/lib/markdown';
import { getPostBySlug, getPublishedSlugs } from '@/lib/posts';
import { decodeSlugParam } from '@/lib/slug';
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
  const post = await getPostBySlug(decodeSlugParam(slug));
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
  const post = await getPostBySlug(decodeSlugParam(slug));
  if (!post) notFound();

  // 배지가 직접 조회하지 않도록 여기서 한 번 읽어 넘긴다.
  // 목록에 없는 slug 면 null 이 되고 배지가 무채색으로 떨어진다.
  //
  // 용어 표기는 본문을 그리기 **전에** 있어야 해서 렌더와 나란히 두지 못한다.
  // 사전이 비었거나 조회에 실패하면 빈 배열이고, 그 글은 용어 링크 없이 그대로 뜬다.
  const [category, glossary] = await Promise.all([
    getCategoryBySlug(post.category),
    getGlossaryAnchors(),
  ]);
  const { html, toc } = await renderMarkdown(post.content, glossary);
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
          <CategoryBadge slug={post.category} category={category} />
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

      {/* 용어 링크의 점선 밑줄색을 이 글의 카테고리 색으로 맞춘다 (globals.css 의 .md a.term).
          팔레트 슬롯 변수는 category-css.ts 가 라이트·다크 2벌로 이미 깔아두므로
          여기서는 "어느 슬롯인지"만 가리키면 되고, 테마 전환은 그 변수가 알아서 따라온다.
          카테고리를 못 찾으면 변수를 얹지 않는다 — CSS 가 무채색으로 떨어뜨린다. */}
      <article
        className="md mt-9"
        style={
          category ? ({ '--term-line': `var(--pal-${category.palette}-fg)` } as CSSProperties) : undefined
        }
        dangerouslySetInnerHTML={{ __html: html }}
      />

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
