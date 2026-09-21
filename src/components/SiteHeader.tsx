import Link from 'next/link';

import { ThemeToggle } from '@/components/ThemeToggle';
import { SITE } from '@/lib/site';

/**
 * 상단 고정 헤더.
 *
 * sticky 라 아래 콘텐츠가 헤더 뒤로 지나간다. 그래서 배경을 반투명 + blur 로 두고,
 * 헤더 높이(3.5rem)만큼을 sticky 목차 top 과 제목 scroll-margin 에 반영해 뒀다.
 * (PostToc 의 top-20, globals.css 의 scroll-margin-top)
 * 헤더 높이를 바꾸면 그 두 곳도 함께 바꿔야 한다.
 */
export function SiteHeader() {
  /*
   * 반투명 + blur 로 뒤가 비친다. 예전에는 `bg-bg` 불투명이었다 — 토큰이 raw
   * var(--bg) 라 <alpha-value> 자리가 없었고, `bg-bg/80` 을 쓰면 유틸이 아예
   * 생성되지 않아(빌드 CSS 에 .bg-bg\/80 없음) 배경이 통째로 사라졌기 때문이다.
   * 지금은 tailwind.config 의 토큰이 rgb(var(--bg-rgb) / <alpha-value>) 라 수식이 산다.
   *
   * 지원하지 않는 브라우저에서는 backdrop-filter 가 무시되고 반투명만 남아
   * 글이 비쳐 읽기 어려워진다. supports- 변형으로 갈라 그때는 불투명으로 되돌린다.
   *
   * 불투명도는 `/75` 처럼 **5 단위 눈금 위의 값**이어야 한다. 눈금에 없는 값(`/72`)을
   * 적으면 유틸이 생성되지 않고 아무 경고도 없이 불투명 헤더로 남는다. 눈금 밖의
   * 값이 꼭 필요하면 대괄호로 적는다(`bg-bg/[0.72]`).
   */
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg supports-[backdrop-filter]:bg-bg/75 supports-[backdrop-filter]:backdrop-blur-xl">
      {/* 헤더 내비를 건너뛰고 본문으로 바로 가는 표준 링크.
          목록 화면의 분류 탭은 본문(#main) 맨 위에 있어 건너뛴 직후 바로 닿는다. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:font-semibold"
      >
        본문으로 건너뛰기
      </a>
      <div className="mx-auto flex h-14 max-w-shell items-center justify-between gap-4 px-5">
        <Link href="/" className="group flex items-center gap-2">
          {/*
            로고 표식. 한동안 무채색 점 하나였다 — "색은 분류에만" 규칙을 로고에까지
            적용한 것이었는데, 그러다 보니 사이트에 얼굴이 없었다. 지금은 마스코트를 쓴다.
            색은 주요 버튼의 액센트(연보라 면 + 진한 보라, globals.css 의 --accent 계열)와
            같은 계열이다 — 처음엔 복숭아색이었는데 화면에서 그 색만 어디에도 안 속해
            떠 보였다. 액센트와 맞추면 로고·버튼이 한 브랜드로 읽히고, 24px 라
            purple 카테고리 배지(작은 알약)와는 형태로 갈린다.

            next/image 를 쓰지 않는 것은 CoverImage 와 같다(그쪽 주석 참조). 여기서는
            이유가 하나 더 있다 — 24px 고정 자산이라 최적화 파이프라인을 태워도 얻을 게 없다.
            width·height 를 적어 레이아웃이 밀리지 않게 한다.

            alt 는 비운다. 바로 옆에 사이트 이름이 글자로 있어 읽어주면 같은 말이 두 번 나온다.
          */}
          {/* eslint-disable-next-line @next/next/no-img-element -- 24px 고정 자산 (위 주석) */}
          <img
            src="/logo.png"
            alt=""
            width={24}
            height={24}
            className="size-6 rounded-lg transition-transform duration-200 ease-out group-hover:scale-110 motion-reduce:transition-none"
          />
          <span className="text-[15px] font-bold tracking-tight">{SITE.name}</span>
        </Link>

        {/* 좁은 화면에서 링크의 위아래 과녁을 키운다 — py-3 은 글자 20px 과 합쳐 44px 로,
            모바일 터치 과녁 최소치다. 헤더가 h-14(56px) 고정이라 그 안에서 흡수되고 높이가
            늘지 않는다 — PostToc 의 top-20 · globals.css 의 scroll-margin-top 연쇄가 없다.
            가로는 줄이지 않는다. "글" 은 한 글자라 좌우 padding 을 깎으면 과녁이 세로로만
            길쭉해져 오히려 겨냥하기 나빠진다(360px 에서도 폭은 남는다).
            ThemeToggle(h-7)은 이 44px 규칙 밖에 있다 — 시각 크기를 건드리게 되어 별도로 다룬다. */}
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/"
            className="rounded-md px-2.5 py-3 text-ink-dim transition-colors hover:bg-surface hover:text-ink sm:py-1.5"
          >
            글
          </Link>
          <Link
            href="/dictionary"
            className="rounded-md px-2.5 py-3 text-ink-dim transition-colors hover:bg-surface hover:text-ink sm:py-1.5"
          >
            용어
          </Link>
          <span aria-hidden className="mx-1.5 h-4 w-px bg-line" />
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
