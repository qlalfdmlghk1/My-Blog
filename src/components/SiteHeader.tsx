import Link from 'next/link';

import { ThemeToggle } from '@/components/ThemeToggle';
import { SITE } from '@/lib/site';

/**
 * 상단 고정 헤더.
 *
 * sticky 라 아래 콘텐츠가 헤더 뒤로 지나간다. 그래서 배경을 반투명 + blur 로 두고,
 * 헤더 높이(3.5rem)만큼을 sticky 사이드바 top 과 제목 scroll-margin 에 반영해 뒀다.
 * (SiteSidebar · PostToc 의 top-20, globals.css 의 scroll-margin-top)
 * 헤더 높이를 바꾸면 그 세 곳도 함께 바꿔야 한다.
 */
export function SiteHeader() {
  /*
   * bg-bg 에 투명도 수식(bg-bg/80)을 쓰지 않는다 — 색 토큰이 raw var(--bg) 라
   * <alpha-value> 자리가 없어 유틸이 아예 생성되지 않는다(빌드 CSS 에 .bg-bg\/80 없음).
   * 그러면 backdrop-blur 만 남아 헤더 배경이 통째로 사라진다. 흐림이 필요하면
   * 요소에 opacity-* 를 주거나 토큰을 rgb(... / <alpha-value>) 로 바꿀 것.
   */
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg backdrop-blur-md">
      {/* 헤더 내비를 건너뛰고 본문으로 바로 가는 표준 링크.
          넓은 화면에서 사이드바가 왼쪽에 보이면서 DOM 상으로는 본문 뒤에 오는
          순서 불일치는 이 링크로 해결되지 않는다 — 도착지가 본문이라 분류에
          닿으려면 여전히 글 목록을 지나야 한다. 그건 별도 과제로 남긴다. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:font-semibold"
      >
        본문으로 건너뛰기
      </a>
      <div className="mx-auto flex h-14 max-w-shell items-center justify-between gap-4 px-5">
        <Link href="/" className="group flex items-center gap-2.5">
          {/* 무채색 시스템이라 로고에도 색을 쓰지 않는다 — 점 하나로 표식만 만든다 */}
          <span
            aria-hidden
            className="size-2 rounded-full bg-ink transition-transform duration-200 ease-out group-hover:scale-125 motion-reduce:transition-none"
          />
          <span className="text-[15px] font-bold tracking-tight">{SITE.name}</span>
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/"
            className="rounded-md px-2.5 py-1.5 text-ink-dim transition-colors hover:bg-surface hover:text-ink"
          >
            글
          </Link>
          <Link
            href="/glossary"
            className="rounded-md px-2.5 py-1.5 text-ink-dim transition-colors hover:bg-surface hover:text-ink"
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
