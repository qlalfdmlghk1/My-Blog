import { SITE } from '@/lib/site';

/**
 * RSS 링크를 두지 않는다.
 *
 * 구독기는 푸터가 아니라 `<head>` 의 `link rel="alternate"`(layout.tsx 의
 * metadata.alternates)를 보고 피드를 찾아간다. 그래서 이 링크는 사람이 주소를
 * 복사해 가라고 둔 것이었는데, 눌러 보면 XML 원본이 그대로 펼쳐져 오히려
 * "뭐가 잘못됐나" 싶은 화면이 됐다. 피드(`/rss.xml`)는 그대로 살아 있다.
 */
export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line">
      <div className="mx-auto flex max-w-shell flex-wrap items-center gap-3 px-5 py-8 text-xs text-ink-dim">
        <span>
          © {new Date().getFullYear()} {SITE.author}
        </span>
      </div>
    </footer>
  );
}
