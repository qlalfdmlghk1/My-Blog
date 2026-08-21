import Link from 'next/link';

import { ThemeToggle } from '@/components/ThemeToggle';
import { SITE } from '@/lib/site';

export function SiteHeader() {
  return (
    <header className="border-b border-line">
      {/* 사이드바는 넓은 화면에서 본문 왼쪽에 보이지만 DOM 에서는 본문 뒤에 온다
          (제목 순서를 지키기 위한 배치). 키보드 사용자가 글 목록을 전부 지나야
          분류에 닿는 일이 없도록 본문 건너뛰기를 먼저 준다. */}
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
