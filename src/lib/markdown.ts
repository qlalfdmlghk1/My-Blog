import 'server-only';

import { Marked } from 'marked';
import { createHighlighter, type Highlighter } from 'shiki';

import { buildGlossaryIndex, splitByGlossary } from '@/lib/glossary';
import { slugify } from '@/lib/slug';
import type { GlossaryAnchor } from '@/types/glossary';

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

/**
 * 본문 텍스트 전용 이스케이프 — **이미 엔티티인 `&` 는 건드리지 않는다.**
 *
 * `escapeHtml` 은 `&` 를 무조건 `&amp;` 로 바꾼다. 코드 블록과 href 에는 그게 맞지만
 * 본문에 쓰면 사람이 쓴 `&nbsp;` · `&copy;` 가 `&amp;nbsp;` 가 되어 **글자 그대로 노출**된다.
 * marked 의 기본 text 렌더러는 이 예외를 갖고 있었는데, 용어 링크를 걸려고 렌더러를
 * 갈아끼우면서 함께 사라졌다 — 엔티티를 쓴 기존 글이 조용히 깨진다.
 */
const TEXT_ESCAPE = /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g;
const TEXT_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};
function escapeText(s: string): string {
  return s.replace(TEXT_ESCAPE, (c) => TEXT_ESCAPE_MAP[c] ?? c);
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

/**
 * @param glossary 본문에서 자동 링크할 용어 표기. 비우면 링크를 걸지 않는다.
 *   지금 호출부는 글 상세 한 곳뿐이고 거기서는 사전을 넘긴다 — 기본값은 나중에 본문을
 *   렌더하는 곳(전문 RSS 등)이 생겼을 때 "링크 없이"를 명시적으로 고를 수 있게 남겨 둔다.
 *   그런 호출부가 생기면 상대 경로 `/glossary#...` 가 피드 리더에서 깨지므로 절대 URL 이 필요하다.
 */
export async function renderMarkdown(
  markdown: string,
  glossary: readonly GlossaryAnchor[] = [],
): Promise<RenderedMarkdown> {
  if (!markdown.trim()) return { html: '', toc: [] };
  const hl = await highlighter();
  const loaded = new Set(hl.getLoadedLanguages());
  /** walkTokens 에서 미리 하이라이트한 결과를 renderer 가 꺼내 쓴다 */
  const highlighted = new Map<string, string>();

  const toc: TocEntry[] = [];
  /**
   * 같은 제목이 두 번 나오면 id 가 겹쳐 목차 링크가 첫 번째로만 간다.
   *
   * 등장 횟수만 세면 부족하다 — "정리"가 두 번 나와 `정리-2`를 만든 뒤
   * 본문에 "정리 2"라는 별개 제목이 있으면 그것도 `정리-2`가 되어 다시 겹친다.
   * 실제로 확정한 id 를 모아두고 비어 있는 번호를 찾는다.
   */
  const usedIds = new Set<string>();
  function uniqueId(text: string): string {
    const base = slugify(text) || 'section';
    let id = base;
    for (let n = 2; usedIds.has(id); n += 1) id = `${base}-${n}`;
    usedIds.add(id);
    return id;
  }

  const glossaryIndex = buildGlossaryIndex(glossary);
  /** 한 글에서 같은 용어에 링크를 두 번 걸지 않는다 — 첫 등장만 */
  const linkedTerms = new Set<string>();
  /**
   * 용어 링크를 끄는 구간.
   *
   * 제목과 링크 안에서는 걸지 않는다. 링크 안이면 `<a>` 가 겹쳐 브라우저가
   * 태그를 끊어버리고(중첩 `<a>` 는 유효하지 않다), 제목 안이면 목차 항목과
   * 본문 제목의 모양이 갈린다. 파싱은 렌더러 안에서 동기로 끝나므로
   * 이 플래그만으로 구간이 정확히 잡힌다.
   */
  let suppressGlossary = 0;

  function withGlossary(text: string): string {
    if (suppressGlossary > 0 || !glossaryIndex.pattern) return escapeText(text);
    return splitByGlossary(text, glossaryIndex, linkedTerms)
      .map((seg) => {
        if (!seg.slug) return escapeText(seg.text);
        // slug 은 Firestore 문서 ID 원문이다. 관리 화면은 toAsciiSlug 로 거르지만
        // 콘솔·스크립트로 만든 문서는 거치지 않고, 문서 ID 는 " 를 허용한다.
        // 속성값을 조립하는 자리이므로 여기서 막는다.
        const href = `/glossary#${encodeURIComponent(seg.slug)}`;
        return `<a class="term" href="${escapeHtml(href)}">${escapeText(seg.text)}</a>`;
      })
      .join('');
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
        suppressGlossary += 1;
        const text = this.parser.parseInline(token.tokens);
        suppressGlossary -= 1;
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
        suppressGlossary += 1;
        const label = this.parser.parseInline(token.tokens);
        suppressGlossary -= 1;
        return `<a href="${escapeHtml(href)}"${attrs}>${label}</a>`;
      },
      /**
       * 평범한 글자 — 여기서만 용어 링크를 건다.
       *
       * marked 는 text 토큰을 **이스케이프 전 원문**으로 넘기고 렌더러가
       * 이스케이프한다. 그래서 용어를 찾는 것도 이 원문 위에서 해야 한다 —
       * 이스케이프된 문자열에서 찾으면 `&amp;` 가 낀 표기를 놓친다.
       * (인라인 코드는 codespan 렌더러가 따로 받으므로 여기 오지 않는다)
       */
      text(token) {
        if ('tokens' in token && token.tokens) return this.parser.parseInline(token.tokens);
        // 이미 이스케이프된 토큰(raw block 안)은 손대지 않는다
        if ('escaped' in token && token.escaped) return token.text;
        return withGlossary(token.text);
      },
    },
  });

  const html = (await md.parse(markdown)) as string;
  return { html, toc };
}
