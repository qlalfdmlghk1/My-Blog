import Link from 'next/link';

import { ThemeToggle } from '@/components/ThemeToggle';
import { SITE } from '@/lib/site';

export function SiteHeader() {
  return (
    <header className="border-b border-line">
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
      <div className="mx-auto flex max-w-shell items-center justify-between gap-4 px-5 py-4">
        <Link href="/" className="text-[15px] font-bold tracking-tight">
          {SITE.name}
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/" className="text-ink-dim hover:text-ink">
            글
          </Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
