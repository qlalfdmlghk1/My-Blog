'use client';

import Link from 'next/link';
import { useState } from 'react';

import { CategoryBadge } from '@/components/CategoryBadge';
import { CoverImage } from '@/components/CoverImage';
import { formatDate } from '@/lib/date';
import type { Category } from '@/types/category';
import type { PostSummary } from '@/types/post';

export interface HeroSlide {
  post: PostSummary;
  /** 배지 · 빈 커버 판이 쓸 분류. 목록 화면이 이미 읽어둔 것을 넘긴다 */
  category: Pick<Category, 'name' | 'palette'> | null;
}

/**
 * 홈 맨 위의 최신 글 캐러셀 — 큰 제목 왼쪽, 커버 오른쪽, 화살표로 넘긴다.
 *
 * 자동으로 넘어가지 않는다. 읽는 중에 제목이 바뀌면 방금 본 글을 놓치고,
 * 동작 최소화 설정을 켠 사람에게는 움직이는 화면 자체가 부담이다. 넘기는 것은 사람뿐이다.
 *
 * 슬라이드 하나만 그리고 `key` 로 갈아끼운다. 다섯 장을 가로로 늘어놓고 translate 로
 * 미는 방식은 화면 밖 네 장의 커버까지 내려받고, 본문 폭이 바뀔 때마다 위치를 다시 재야
 * 한다. 갈아끼우면 `rise` 애니메이션이 자연스럽게 다시 돌아 전환 효과가 된다.
 *
 * 링크는 제목 하나뿐이고 그 ::after 를 섹션 전체로 늘린다(PostCard 와 같은 stretched
 * link). 화살표는 그 위에 올라가야 하므로 z-10 이다.
 *
 * 이 파일만 Client Component 다 — 홈의 나머지는 정적 HTML 로 남는다. state 는 지금
 * 몇 번째인지 하나뿐이라 넘기는 데이터(슬라이드 5장)도 작다.
 */
export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);

  // index 는 항상 범위 안이지만(아래 go 가 나머지 연산으로 돌린다) 빈 배열이면 없다
  const slide = slides[index];
  if (!slide) return null;

  const { post, category } = slide;
  const many = slides.length > 1;
  const go = (step: number) => setIndex((i) => (i + step + slides.length) % slides.length);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="최신 글"
      className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-center lg:gap-12"
    >
      {/* 라이브 영역은 갈아끼워지지 않는 바깥 상자에 둔다 — 안쪽이 key 로 새로 붙으면
          "새 영역이 생긴 것"이라 바뀐 제목을 읽어주지 않는다. */}
      <div aria-live="polite" aria-atomic>
        <div key={post.id} className="rise flex flex-col">
          <div className="flex items-center gap-2.5">
            <CategoryBadge slug={post.category} category={category} />
            <time
              dateTime={post.publishedAt ?? undefined}
              className="text-xs text-ink-dim tabular-nums"
            >
              {formatDate(post.publishedAt)}
            </time>
          </div>

          {/* break-keep — 한글은 어절 단위로 끊어야 "페이지/가" 처럼 조사가 다음 줄로 떨어지지 않는다 */}
          <h2 className="mt-4 break-keep text-[28px] font-bold leading-[1.2] tracking-tight sm:text-[36px] lg:text-[40px]">
            <Link
              href={`/posts/${post.slug}`}
              className="after:absolute after:inset-0 after:content-['']"
            >
              {post.title}
            </Link>
          </h2>

          {post.excerpt && (
            <p className="mt-3 line-clamp-2 max-w-prose break-keep text-[15px] leading-relaxed text-ink-dim sm:text-base">
              {post.excerpt}
            </p>
          )}

          {many && (
            <div className="relative z-10 mt-8 flex items-center gap-3 lg:mt-12">
              <Arrow direction="prev" onClick={() => go(-1)} />
              <Arrow direction="next" onClick={() => go(1)} />
              <span className="ml-1 text-xs text-ink-dim tabular-nums">
                {index + 1} / {slides.length}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 좁은 화면에서는 커버가 먼저 온다 — 제목 위에 사진이 있어야 카드처럼 읽힌다.
          DOM 은 제목이 먼저다: 스크린리더가 사진(장식)보다 제목을 먼저 만나야 한다. */}
      <CoverImage
        key={`cover-${post.id}`}
        src={post.coverImage}
        seed={post.slug}
        category={category}
        priority={index === 0}
        className="rise order-first aspect-[16/9] rounded-2xl lg:order-none lg:aspect-[1.85]"
      />
    </section>
  );
}

/** 둥근 화살표 버튼 — 면 색만 쓰고 색을 두지 않는다(색은 분류에만) */
function Arrow({ direction, onClick }: { direction: 'prev' | 'next'; onClick: () => void }) {
  const prev = direction === 'prev';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={prev ? '이전 글' : '다음 글'}
      className="flex size-12 items-center justify-center rounded-full bg-surface text-ink transition-colors hover:bg-line focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-5"
        aria-hidden
      >
        {prev ? <path d="M15 5l-7 7 7 7" /> : <path d="M9 5l7 7-7 7" />}
      </svg>
    </button>
  );
}
