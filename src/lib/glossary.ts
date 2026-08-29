/**
 * 용어 사전 — 정의 한 곳 · 글에서는 링크만.
 *
 * 이 파일에는 용어 목록이 없다. 정본은 Firestore `glossary` 컬렉션이고
 * (읽기는 `glossary.server.ts` · 쓰기는 `glossary.client.ts`),
 * 여기에는 정규화 · 정렬 · **본문 자동 링크 판정**만 둔다.
 * `categories.ts` 가 카테고리 목록을 코드에 두지 않는 것과 같은 이유다.
 */

import { hangulChoseong } from '@/lib/romanize';
import type { GlossaryAnchor, GlossaryTerm } from '@/types/glossary';

/** Firestore 문서 → GlossaryTerm. 손상된 필드는 버리지 않고 안전한 값으로 떨어뜨린다 */
export function normalizeGlossaryTerm(
  id: string,
  data: Record<string, unknown>,
): GlossaryTerm {
  const aliases = Array.isArray(data.aliases) ? data.aliases : [];
  return {
    slug: id,
    term: String(data.term ?? id),
    // 빈 문자열이 섞이면 자동 링크 정규식이 빈 대안을 갖게 되어 모든 위치에 매칭된다
    aliases: aliases.map((a) => String(a).trim()).filter(Boolean),
    definition: String(data.definition ?? ''),
    postSlug: String(data.postSlug ?? ''),
  };
}

/**
 * 사전 표시 순서 — 가나다 · 알파벳순.
 *
 * 카테고리처럼 `order` 를 두지 않는다. 사전은 "찾아보는" 문서라 순서가
 * 사람이 정한 중요도가 아니라 글자순이어야 하고, 항목이 늘수록 손으로 매긴
 * 번호는 관리가 불가능해진다.
 */
export function sortGlossary(terms: GlossaryTerm[]): GlossaryTerm[] {
  return [...terms].sort((a, b) => a.term.localeCompare(b.term, 'ko'));
}

/**
 * 항목이 묶일 자모/글자 — `ㄱ` · `A` · `#`.
 * 한글은 초성으로, 영문은 대문자 한 글자로, 그 밖(숫자·기호)은 `#` 로 묶는다.
 */
export function glossaryGroupLabel(term: GlossaryTerm): string {
  const first = [...term.term.trim()][0] ?? '';
  const choseong = hangulChoseong(first);
  if (choseong) return choseong;
  if (/[a-zA-Z]/.test(first)) return first.toUpperCase();
  return '#';
}

export interface GlossaryGroup {
  label: string;
  terms: GlossaryTerm[];
}

/**
 * 사전 페이지가 그릴 묶음 목록.
 *
 * 라벨로 다시 정렬하지 않는다 — `ㄱ` 과 `A` 의 선후는 `sortGlossary` 가 이미 정한
 * 것이고, 여기서 또 정하면 두 규칙이 어긋날 수 있다. 등장 순서는 그대로 따른다.
 *
 * 다만 **같은 라벨을 두 번 열지 않는다.** 인접한 것만 합치면 정렬상 떨어져 있는 같은
 * 라벨이 묶음을 여러 개 만든다 — `#`(숫자·기호)가 특히 그렇다. `localeCompare(_, 'ko')`
 * 는 한자·가나를 한글·라틴 사이사이에 흩어놓기 때문이다. 그러면 페이지가 라벨을 React
 * key 와 DOM id 로 쓰는데 둘 다 중복되고, 자모 바로가기는 언제나 첫 묶음으로만 뛴다.
 */
export function groupGlossary(terms: GlossaryTerm[]): GlossaryGroup[] {
  const groups: GlossaryGroup[] = [];
  const byLabel = new Map<string, GlossaryGroup>();
  for (const term of terms) {
    const label = glossaryGroupLabel(term);
    const found = byLabel.get(label);
    if (found) {
      found.terms.push(term);
      continue;
    }
    const group: GlossaryGroup = { label, terms: [term] };
    byLabel.set(label, group);
    groups.push(group);
  }
  return groups;
}

/** 본문 렌더러에 넘길 최소 형태 — 정의문은 빼고 찾을 표기만 */
export function toGlossaryAnchors(terms: GlossaryTerm[]): GlossaryAnchor[] {
  return terms.map((t) => ({ slug: t.slug, surfaces: [t.term, ...t.aliases] }));
}

/* ═══════════════════════════════════════════════
   본문 자동 링크
   ═══════════════════════════════════════════════ */

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 표기 뒤에 붙어도 같은 낱말로 볼 조사.
 *
 * 한글에는 낱말 경계(`\b`)가 없다. 앞뒤가 글자면 무조건 건너뛰면 `상태를`이
 * 안 걸리고, 반대로 뒤가 글자여도 통과시키면 `상태관리`의 앞 두 글자에 링크가
 * 걸린다. 조사만 허용 목록으로 두면 둘 다 피한다.
 *
 * 긴 것을 앞에 둔다 — `으로`가 `로`보다 먼저 시도돼야 `으`가 남지 않는다.
 */
const PARTICLES = [
  '이라는', '이라고', '에서는', '에게서', '으로써', '으로서', '이란',
  '라는', '라고', '에서', '에게', '으로', '부터', '까지', '처럼', '보다',
  '이나', '이며', '이고', '이다', '입니다',
  '을', '를', '이', '가', '은', '는', '의', '에', '와', '과', '랑',
  '로', '도', '만', '나', '며', '고', '다',
];

export interface GlossaryIndex {
  /** 표기 후보를 찾는 정규식 — 없으면 null (등록된 용어가 0개) */
  pattern: RegExp | null;
  /** 소문자로 접은 표기 → slug */
  bySurface: Map<string, string>;
}

/**
 * 표기 찾기용 색인. 긴 표기를 먼저 시도하도록 정렬한다 —
 * `서버 컴포넌트`와 `서버`가 함께 등록돼 있으면 긴 쪽이 이겨야 한다.
 *
 * 대소문자를 무시한다(`isr` ↔ `ISR`). 등록은 관리자만 하므로 흔한 영단어가
 * 통째로 링크될 위험은 등록 시점에 사람이 거른다.
 */
export function buildGlossaryIndex(anchors: readonly GlossaryAnchor[]): GlossaryIndex {
  const bySurface = new Map<string, string>();
  for (const anchor of anchors) {
    for (const surface of anchor.surfaces) {
      const key = surface.trim().toLowerCase();
      // 먼저 등록된 쪽을 남긴다 — 같은 표기를 두 용어가 주장하면 사전 순으로 앞선 쪽
      if (key && !bySurface.has(key)) bySurface.set(key, anchor.slug);
    }
  }
  if (bySurface.size === 0) return { pattern: null, bySurface };

  const surfaces = [...bySurface.keys()].sort((a, b) => b.length - a.length);
  const particles = PARTICLES.map(escapeRegExp).join('|');
  const pattern = new RegExp(
    // (앞) 글자·숫자가 아니어야 한다 — 낱말 중간에서 시작하지 않게
    `(?<![\\p{Letter}\\p{Number}])` +
      `(${surfaces.map(escapeRegExp).join('|')})` +
      // (뒤) 낱말이 끝나거나, 조사 하나가 붙고 거기서 끝나거나
      `(?:${particles})?(?![\\p{Letter}\\p{Number}])`,
    'giu',
  );
  return { pattern, bySurface };
}

export interface GlossarySegment {
  text: string;
  /** null 이면 평범한 글자 — 링크로 감싸지 않는다 */
  slug: string | null;
}

/**
 * 문장을 "링크할 조각 / 그냥 글자" 로 자른다.
 *
 * HTML 을 만들지 않고 조각만 돌려주는 이유: 이스케이프는 마크다운 렌더러의
 * 책임이라 여기서 문자열을 짜맞추면 이스케이프가 두 곳으로 나뉜다.
 *
 * `linked` 는 **문서 하나를 그리는 동안 공유**한다. 같은 용어가 스무 번 나오는
 * 글에서 스무 번 링크가 걸리면 본문이 링크 밭이 되어 오히려 읽기 나빠진다.
 * 첫 등장 한 번만 건다.
 */
export function splitByGlossary(
  text: string,
  index: GlossaryIndex,
  linked: Set<string>,
): GlossarySegment[] {
  if (!index.pattern || !text) return [{ text, slug: null }];

  const segments: GlossarySegment[] = [];
  let cursor = 0;
  // 같은 인덱스를 한 렌더 안의 text 토큰마다 재사용하므로 lastIndex 를 매번 초기화한다
  // (모듈 스코프 캐시는 없다 — buildGlossaryIndex 는 renderMarkdown 호출마다 돈다)
  index.pattern.lastIndex = 0;

  for (let m = index.pattern.exec(text); m; m = index.pattern.exec(text)) {
    const surface = m[1] ?? '';
    const slug = index.bySurface.get(surface.toLowerCase());
    if (!slug || linked.has(slug)) continue;
    linked.add(slug);

    // 표기 자체만 링크로 감싼다 — 조사는 링크 밖에 남긴다
    const start = m.index;
    if (start > cursor) segments.push({ text: text.slice(cursor, start), slug: null });
    segments.push({ text: text.slice(start, start + surface.length), slug });
    cursor = start + surface.length;
  }

  if (cursor < text.length) segments.push({ text: text.slice(cursor), slug: null });
  return segments;
}
