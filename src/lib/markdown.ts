import 'server-only';

import { Marked } from 'marked';
import { createHighlighter, type Highlighter } from 'shiki';

import { slugify } from '@/lib/slug';

/**
 * 마크다운 → HTML 변환은 서버에서만 수행한다.
 * 파서도 하이라이터도 클라이언트로 내려보내지 않으므로 공개 페이지의 이 기능 JS 는 0KB.
 * (에디터 미리보기는 markdown-preview.ts 를 쓰고, 관리자 라우트로 코드 분할된다)
 */

const LANGS = [
  'ts', 'tsx', 'js', 'jsx', 'json', 'html', 'css', 'scss',
  'bash', 'shell', 'md', 'yaml', 'sql', 'diff', 'python', 'java', 'text',
] as const;

let highlighterPromise: Promise<Highlighter> | null = null;

function highlighter(): Promise<Highlighter> {
  // 요청마다 새로 만들면 콜드 스타트마다 수백 ms 가 든다 — 모듈 스코프에 캐시
  highlighterPromise ??= createHighlighter({
    themes: ['github-light', 'github-dark'],
    langs: [...LANGS],
  });
  return highlighterPromise;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface TocEntry {
  id: string;
  text: string;
  level: 2 | 3;
}

export interface RenderedMarkdown {
  html: string;
  /** h2·h3 만 담는다. h4 까지 넣으면 목차가 본문만큼 길어져 길잡이 역할을 잃는다 */
  toc: TocEntry[];
}

export async function renderMarkdown(markdown: string): Promise<RenderedMarkdown> {
  if (!markdown.trim()) return { html: '', toc: [] };
  const hl = await highlighter();
  const loaded = new Set(hl.getLoadedLanguages());
  /** walkTokens 에서 미리 하이라이트한 결과를 renderer 가 꺼내 쓴다 */
  const highlighted = new Map<string, string>();

  const toc: TocEntry[] = [];
  /** 같은 제목이 두 번 나오면 id 가 겹쳐 목차 링크가 첫 번째로만 간다 */
  const usedIds = new Map<string, number>();
  function uniqueId(text: string): string {
    const base = slugify(text) || 'section';
    const seen = usedIds.get(base) ?? 0;
    usedIds.set(base, seen + 1);
    return seen === 0 ? base : `${base}-${seen + 1}`;
  }

  const md = new Marked({
    async: true,
    gfm: true,
    breaks: false,
    walkTokens: (token) => {
      if (token.type !== 'code') return;
      const lang = (token.lang ?? '').trim().split(/\s+/)[0] ?? '';
      const safe = loaded.has(lang) ? lang : 'text';
      highlighted.set(
        token.raw,
        hl.codeToHtml(token.text, {
          lang: safe,
          // 라이트/다크 2벌을 CSS 변수로 심는다 — 테마 전환 시 재파싱 불필요
          themes: { light: 'github-light', dark: 'github-dark' },
          defaultColor: false,
        }),
      );
    },
    renderer: {
      code(token) {
        return (
          highlighted.get(token.raw) ??
          `<pre><code>${escapeHtml(token.text)}</code></pre>`
        );
      },
      /** 목차가 걸 앵커를 만든다. 수집과 id 부여를 한곳에서 해야 둘이 어긋나지 않는다 */
      heading(token) {
        const text = this.parser.parseInline(token.tokens);
        const plain = token.text.replace(/[*_`~]/g, '').trim();
        const depth = token.depth;
        if (depth === 2 || depth === 3) {
          const id = uniqueId(plain);
          toc.push({ id, text: plain, level: depth });
          return `<h${depth} id="${id}">${text}</h${depth}>`;
        }
        return `<h${depth}>${text}</h${depth}>`;
      },
      // 외부 링크는 새 탭 + rel 보강
      link(token) {
        const href = token.href ?? '';
        const external = /^https?:\/\//.test(href);
        const attrs = external ? ' target="_blank" rel="noopener noreferrer"' : '';
        return `<a href="${escapeHtml(href)}"${attrs}>${this.parser.parseInline(token.tokens)}</a>`;
      },
    },
  });

  const html = (await md.parse(markdown)) as string;
  return { html, toc };
}
