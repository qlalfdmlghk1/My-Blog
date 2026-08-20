import { SITE } from '@/lib/site';

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line">
      <div className="mx-auto flex max-w-shell flex-wrap items-center justify-between gap-3 px-5 py-8 text-xs text-ink-dim">
        <span>
          © {new Date().getFullYear()} {SITE.author}
        </span>
        <a href="/rss.xml" className="hover:text-ink hover:underline">
          RSS
        </a>
      </div>
    </footer>
  );
}
