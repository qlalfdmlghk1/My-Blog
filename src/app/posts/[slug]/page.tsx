import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { CSSProperties } from 'react';

import { CategoryBadge } from '@/components/CategoryBadge';
import { hasToc, PostToc } from '@/components/PostToc';
import { TagChip } from '@/components/TagChip';
import { getCategoryBySlug } from '@/lib/categories.server';
import { toDictionaryAnchors } from '@/lib/dictionary';
import { getDictionary } from '@/lib/dictionary.server';
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
  const [category, dictionary] = await Promise.all([
    getCategoryBySlug(post.category),
    getDictionary(),
  ]);
  const { html, toc, terms } = await renderMarkdown(post.content, toDictionaryAnchors(dictionary));

  // 하단 '관련 용어'는 **본문에 실제로 링크가 걸린 용어**만 모은다.
  // 렌더가 돌려준 slug 목록을 그대로 쓰므로 본문의 점선 낱말과 목록이 어긋날 수 없다.
  // 사전에서 지워진 용어를 가리키는 slug 은 flatMap 이 조용히 버린다.
  const related = terms.flatMap((slug) => {
    const found = dictionary.find((t) => t.slug === slug);
    return found ? [found] : [];
  });
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
          ? 'reading mx-auto max-w-prose px-5 py-12 xl:grid xl:max-w-shell xl:grid-cols-[minmax(0,44rem)_13rem] xl:gap-10 xl:justify-center'
          : 'reading mx-auto max-w-prose px-5 py-12'
      }
      /* 위 `reading` 이 드래그 선택(형광펜)을 켜는 스위치다 — globals.css 의 ::selection 은
          이 클래스 안에서만 걸리고, 목록·사전·관리자 화면은 브라우저 기본 선택색으로 남는다.

          여기 style 은 그 형광펜에 이 글의 카테고리 색을 얹는다.
           - `--term-line`: 용어 링크의 점선 밑줄색 (globals.css 의 .md a.term)
           - `--select-bg` · `--select-fg`: 드래그했을 때의 선택 색 (globals.css 의 ::selection)
          본문(article)에만 얹으면 헤더·관련 용어·목차처럼 형제 요소가 상속을 못 받아
          같은 화면 안에서 선택 색이 갈린다. 글 상세는 전체가 한 카테고리의 맥락이므로
          여기서 한 번 얹는다.
          둘 다 팔레트 슬롯 변수를 가리키기만 한다 — category-css.ts 가 라이트·다크 2벌을
          이미 깔아두므로 테마 전환은 그 변수가 알아서 따라온다.
          선택 색에 슬롯의 bg/fg 를 짝으로 쓰는 이유: 그 둘은 대비가 맞춰진 한 쌍이라
          (라이트는 파스텔 배경+진한 글자, 다크는 그 반대) 어느 슬롯을 골라도 안 깨진다.
          카테고리를 못 찾으면 변수를 얹지 않는다 — 밑줄은 무채색, 선택은 기본 노랑으로 떨어진다. */
      style={
        category
          ? ({
              '--term-line': `var(--pal-${category.palette}-fg)`,
              '--select-bg': `var(--pal-${category.palette}-bg)`,
              '--select-fg': `var(--pal-${category.palette}-fg)`,
            } as CSSProperties)
          : undefined
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

      <article className="md mt-9" dangerouslySetInnerHTML={{ __html: html }} />

      {/* 본문을 읽고 난 뒤 한 번 더 짚어주는 자리. 본문 링크는 첫 등장 한 번만 걸리므로
          중간부터 읽은 사람은 그 낱말을 그냥 지나쳤을 수 있다. */}
      {related.length > 0 && (
        <section aria-labelledby="related-terms" className="mt-12 border-t border-line pt-6">
          <h2 id="related-terms" className="text-sm font-bold tracking-tight">
            관련 용어
          </h2>
          <ul className="mt-3 space-y-2">
            {related.map((term) => (
              <li key={term.slug} className="text-sm leading-relaxed">
                <Link
                  href={`/dictionary#${encodeURIComponent(term.slug)}`}
                  className="font-semibold underline underline-offset-[3px]"
                >
                  {term.term}
                </Link>
                <span className="text-ink-dim"> : {term.definition}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

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
