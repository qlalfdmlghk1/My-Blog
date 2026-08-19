import Link from 'next/link';

import { ThemeToggle } from '@/components/ThemeToggle';
import { SITE } from '@/lib/site';

export function SiteHeader() {
  return (
    <header className="border-b border-line">
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
