/**
 * 용어 사전 — 정의 한 곳 · 글에서는 링크만.
 *
 * 이 파일에는 용어 목록이 없다. 정본은 Firestore `dictionary` 컬렉션이고
 * (읽기는 `dictionary.server.ts` · 쓰기는 `dictionary.client.ts`),
 * 여기에는 정규화 · 정렬 · **본문 자동 링크 판정**만 둔다.
 * `categories.ts` 가 카테고리 목록을 코드에 두지 않는 것과 같은 이유다.
 */

import { isPaletteId, PALETTE } from '@/lib/palette';
import { hangulChoseong } from '@/lib/romanize';
import type { DictionaryAnchor, DictionaryCategory, DictionaryTerm } from '@/types/dictionary';

/**
 * firestore.rules 의 `validDictionaryTerm` 과 **같은 값**이다.
 *
 * 규칙이 최종 방어선이고 화면·AI 추출은 사람에게 이유를 보여주는 자리다. 값이 갈리면
 * 화면은 통과시키는데 저장이 막히는 상태가 된다 — 규칙을 고치면 여기도 함께 고칠 것.
 * (관리 화면과 추출 라우트가 이 한 곳을 함께 읽는다)
 */
export const DICTIONARY_LIMITS = {
  term: 80,
  definition: 600,
  aliases: 10,
  postSlug: 200,
  /** 분류 이름 — firestore.rules 의 validDictionaryCategory */
  categoryName: 60,
  /** 용어가 가리키는 분류 slug — validDictionaryTerm */
  category: 100,
} as const;

/**
 * 컬렉션 이름 — 서버·클라이언트가 같은 상수를 본다.
 *
 * `.server.ts` 는 `import 'server-only'` 라 클라이언트가 읽을 수 없어, 상수를 거기 두면
 * 클라이언트가 같은 문자열을 다시 적게 된다. 방금 glossary → dictionary 리네임이 정확히
 * "두 곳에 적힌 이름을 함께 고치는" 작업이었다 — 한쪽이 남으면 조용히 빈 컬렉션을 본다.
 */
export const COLLECTION = 'dictionary';
export const CATEGORY_COLLECTION = 'dictionaryCategories';

/** Firestore 문서 → DictionaryTerm. 손상된 필드는 버리지 않고 안전한 값으로 떨어뜨린다 */
export function normalizeDictionaryTerm(id: string, data: Record<string, unknown>): DictionaryTerm {
  const aliases = Array.isArray(data.aliases) ? data.aliases : [];
  return {
    slug: id,
    term: String(data.term ?? id),
    // 빈 문자열이 섞이면 자동 링크 정규식이 빈 대안을 갖게 되어 모든 위치에 매칭된다.
    //
    // 길이도 여기서 자른다. 별칭 하나가 아주 길면(약 4,800자) `buildDictionaryIndex` 가
    // 만든 정규식이 **실행 시점에** `Invalid regular expression` 을 던지고, 그 예외는
    // 글 상세 렌더 경로에 가드가 없어 **발행된 글 전체가 렌더 불능**이 된다. 화면과 규칙이
    // 막는 것은 새로 저장되는 값뿐이라, 이미 들어간 값·Admin SDK 로 넣은 값은 여기가 유일한 관문이다.
    aliases: aliases
      .map((a) =>
        String(a)
          .trim()
          .slice(0, DICTIONARY_LIMITS.term - 1),
      )
      .filter(Boolean)
      .slice(0, DICTIONARY_LIMITS.aliases),
    definition: String(data.definition ?? ''),
    postSlug: String(data.postSlug ?? ''),
    // 분류는 선택 사항이다 — 없으면 빈 값으로 두고 화면이 '분류 없음'으로 그린다.
    // 여기서 임의의 분류로 채우면 사람이 정한 분류와 코드가 정한 분류가 섞여
    // 어느 쪽이 맞는지 알 수 없게 된다.
    category: String(data.category ?? ''),
  };
}

/**
 * 사전 표시 순서 — 가나다 · 알파벳순.
 *
 * 카테고리처럼 `order` 를 두지 않는다. 사전은 "찾아보는" 문서라 순서가
 * 사람이 정한 중요도가 아니라 글자순이어야 하고, 항목이 늘수록 손으로 매긴
 * 번호는 관리가 불가능해진다.
 */
export function sortDictionary(terms: DictionaryTerm[]): DictionaryTerm[] {
  return [...terms].sort((a, b) => a.term.localeCompare(b.term, 'ko'));
}

/**
 * 항목이 묶일 자모/글자 — `ㄱ` · `A` · `#`.
 * 한글은 초성으로, 영문은 대문자 한 글자로, 그 밖(숫자·기호)은 `#` 로 묶는다.
 */
export function dictionaryGroupLabel(term: DictionaryTerm): string {
  const first = [...term.term.trim()][0] ?? '';
  const choseong = hangulChoseong(first);
  if (choseong) return choseong;
  if (/[a-zA-Z]/.test(first)) return first.toUpperCase();
  return '#';
}

export interface DictionaryGroup {
  label: string;
  terms: DictionaryTerm[];
}

/**
 * 사전 페이지가 그릴 묶음 목록.
 *
 * 라벨로 다시 정렬하지 않는다 — `ㄱ` 과 `A` 의 선후는 `sortDictionary` 가 이미 정한
 * 것이고, 여기서 또 정하면 두 규칙이 어긋날 수 있다. 등장 순서는 그대로 따른다.
 *
 * 다만 **같은 라벨을 두 번 열지 않는다.** 인접한 것만 합치면 정렬상 떨어져 있는 같은
 * 라벨이 묶음을 여러 개 만든다 — `#`(숫자·기호)가 특히 그렇다. `localeCompare(_, 'ko')`
 * 는 한자·가나를 한글·라틴 사이사이에 흩어놓기 때문이다. 그러면 페이지가 라벨을 React
 * key 와 DOM id 로 쓰는데 둘 다 중복되고, 자모 바로가기는 언제나 첫 묶음으로만 뛴다.
 */
export function groupDictionary(terms: DictionaryTerm[]): DictionaryGroup[] {
  const groups: DictionaryGroup[] = [];
  const byLabel = new Map<string, DictionaryGroup>();
  for (const term of terms) {
    const label = dictionaryGroupLabel(term);
    const found = byLabel.get(label);
    if (found) {
      found.terms.push(term);
      continue;
    }
    const group: DictionaryGroup = { label, terms: [term] };
    byLabel.set(label, group);
    groups.push(group);
  }
  return groups;
}

/* ═══════════════════════════════════════════════
   용어 분류
   ═══════════════════════════════════════════════ */

/**
 * 분류를 못 찾은 용어가 모이는 자리. 문서 slug 로 쓰이지 않는 값이어야 한다.
 *
 * 분류는 선택 사항이라 이 자리는 예외 상황이 아니라 **정상 상태 중 하나**다 —
 * 아직 정하지 않은 용어와, 분류가 지워진 용어가 함께 모인다.
 */
export const UNCATEGORIZED = '';
export const UNCATEGORIZED_LABEL = '분류 없음';

/** Firestore 문서 → DictionaryCategory. 손상된 필드는 안전한 값으로 떨어뜨린다 */
export function normalizeDictionaryCategory(
  id: string,
  data: Record<string, unknown>,
): DictionaryCategory {
  return {
    slug: id,
    name: String(data.name ?? id),
    // 알 수 없는 슬롯은 첫 번째로 — 색이 없어 분류가 안 보이는 편이 더 나쁘다
    palette: isPaletteId(data.palette) ? data.palette : PALETTE[0].id,
    order: typeof data.order === 'number' ? data.order : 0,
  };
}

/**
 * 분류 표시 순서 — 사람이 매긴 `order` 우선, 같으면 이름순.
 *
 * 용어 자체는 글자순으로 정렬하지만(사전은 찾아보는 문서다) 분류는 다르다.
 * 필터 줄은 항목이 열 개 안쪽이고, 자주 쓰는 분류를 앞에 두는 편이 낫다.
 */
export function sortDictionaryCategories(categories: DictionaryCategory[]): DictionaryCategory[] {
  return [...categories].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'ko'));
}

/** 분류 slug → 분류. 목록에 없으면 null (화면이 미분류로 떨어뜨린다) */
export function findDictionaryCategory(
  categories: readonly DictionaryCategory[],
  slug: string,
): DictionaryCategory | null {
  return categories.find((c) => c.slug === slug) ?? null;
}

/**
 * 필터 줄에 세울 분류 — **용어가 실제로 하나라도 있는 것만.**
 *
 * 등록된 분류를 전부 세우면 누르면 빈 화면이 되는 버튼이 생긴다. 반대로 용어에만
 * 있고 분류 목록에는 없는 slug(분류를 지웠거나 콘솔로 넣은 값)도 세어야 한다 —
 * 그러지 않으면 그 용어들이 어느 필터로도 닿지 않는 사각지대에 남는다.
 * 그런 용어는 미분류로 함께 모은다.
 */
export interface DictionaryFacet {
  slug: string;
  name: string;
  /** 미분류는 팔레트가 없다 — 화면이 무채색으로 그린다 */
  palette: DictionaryCategory['palette'] | null;
  count: number;
}

export function dictionaryFacets(
  terms: readonly DictionaryTerm[],
  categories: readonly DictionaryCategory[],
): DictionaryFacet[] {
  const counts = new Map<string, number>();
  for (const term of terms) {
    const key = findDictionaryCategory(categories, term.category) ? term.category : UNCATEGORIZED;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const facets: DictionaryFacet[] = [];
  for (const category of sortDictionaryCategories([...categories])) {
    const count = counts.get(category.slug) ?? 0;
    if (count > 0) {
      facets.push({ slug: category.slug, name: category.name, palette: category.palette, count });
    }
  }
  // 미분류는 언제나 끝에 — 분류를 정하지 않은 것이 목록의 첫 축이 되면 안 된다
  const loose = counts.get(UNCATEGORIZED) ?? 0;
  if (loose > 0) {
    facets.push({
      slug: UNCATEGORIZED,
      name: UNCATEGORIZED_LABEL,
      palette: null,
      count: loose,
    });
  }
  return facets;
}

/* ═══════════════════════════════════════════════
   입력 정리 · 검증 (관리 화면과 발행 확인 화면이 함께 쓴다)
   ═══════════════════════════════════════════════ */

/**
 * 쉼표로 끊고 빈 조각을 버린다.
 *
 * 빈 별칭이 남으면 자동 링크 정규식이 빈 대안을 갖게 되어 본문의 **모든 위치**에
 * 매칭된다(`buildDictionaryIndex`). 두 화면이 각자 나누면 그 규칙이 두 곳이 된다.
 */
export function parseAliases(input: string): string[] {
  return [
    ...new Set(
      input
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean),
    ),
  ];
}

/**
 * 저장 전 검사 — `firestore.rules` 의 `validDictionaryTerm` 과 같은 기준.
 *
 * 규칙이 최종 방어선이고 여기는 사람에게 이유를 보여주는 자리다. 화면마다 따로 적으면
 * 규칙이 늘 때 한쪽만 반영돼, 한 화면에서는 저장되는 값이 다른 화면에서는
 * `Missing or insufficient permissions.` 원문으로 막힌다.
 *
 * @returns 문제가 있으면 사람이 읽을 문구, 없으면 null
 */
export function dictionaryDraftError(draft: {
  term: string;
  definition: string;
  aliases: string[];
  postSlug: string;
}): string | null {
  const term = draft.term.trim();
  const definition = draft.definition.trim();

  if (!term) return '표제어를 입력하세요.';
  if (!definition) return '정의를 입력하세요. 사전 항목은 정의가 본체입니다.';
  if (term.length >= DICTIONARY_LIMITS.term) {
    return `표제어는 ${DICTIONARY_LIMITS.term}자 미만이어야 합니다 (현재 ${term.length}자).`;
  }
  if (definition.length >= DICTIONARY_LIMITS.definition) {
    return `정의는 ${DICTIONARY_LIMITS.definition}자 미만이어야 합니다 (현재 ${definition.length}자).`;
  }
  if (draft.aliases.length > DICTIONARY_LIMITS.aliases) {
    return `별칭은 최대 ${DICTIONARY_LIMITS.aliases}개입니다 (현재 ${draft.aliases.length}개).`;
  }
  // 별칭 하나가 길면 그 문자열이 글을 그릴 때마다 정규식에 통째로 들어간다
  const tooLong = draft.aliases.find((a) => a.length >= DICTIONARY_LIMITS.term);
  if (tooLong) {
    return `별칭 하나는 ${DICTIONARY_LIMITS.term}자 미만이어야 합니다 ("${tooLong.slice(0, 20)}…").`;
  }
  if (draft.postSlug.trim().length >= DICTIONARY_LIMITS.postSlug) {
    return `연결할 글 slug 은 ${DICTIONARY_LIMITS.postSlug}자 미만이어야 합니다.`;
  }
  return null;
}

/* ═══════════════════════════════════════════════
   용어 → 글 역참조
   ═══════════════════════════════════════════════ */

/** 사전이 글을 가리킬 때 필요한 최소 형태 — 주소와 제목만 */
export interface DictionaryReference {
  slug: string;
  title: string;
}

/**
 * 렌더러가 용어 링크를 걸지 않는 자리를 미리 걷어낸다.
 *
 * `markdown.ts` 는 **본문 텍스트 토큰에만** 링크를 건다 — 코드 블록·인라인 코드는 다른
 * 렌더러가 받고, 제목과 링크 라벨은 `suppressDictionary` 로 꺼둔다. 여기서는 마크다운
 * 원문을 훑으므로 그 구분이 없어, 그대로 두면 **화면에 점선이 없는데 사전의 관련글에는
 * 뜨는** 어긋남이 생긴다 — 이 함수의 존재 이유가 그 어긋남을 막는 것이다.
 *
 * 펜스는 **줄 머리에서만** 펜스다(`^ {0,3}`). 앵커 없이 쓰면 본문 한가운데의 백틱 세 개
 * (마크다운 문법을 설명하는 글에 흔하다)가 여는 펜스로 잡혀 그 뒤 글 전체가 사라진다.
 *
 * 링크·이미지는 라벨까지 통째로 지운다. 렌더러가 링크 라벨 안에서 용어 링크를 억제하므로
 * (`markdown.ts` 의 `link()`), 라벨을 남기면 "본문엔 점선이 없는데 관련글에는 뜨는" 쪽으로
 * 어긋난다. 대상 문자 클래스에서 `(` 를 함께 배제하는 것은 성능 문제다 — `[^)]*` 로 두면
 * 닫는 괄호가 없는 입력에서 시작 위치마다 나머지를 다시 훑어 길이의 제곱으로 느려진다.
 */
function stripNonProse(markdown: string): string {
  return (
    markdown
      // 닫힌 펜스 블록 (``` 과 ~~~). 여는 표시와 같은 것으로 닫아야 한다
      .replace(/^ {0,3}(```|~~~)[\s\S]*?^ {0,3}\1/gm, ' ')
      // 남은 여는 펜스 — 닫히지 않았으면 문서 끝까지가 코드다
      .replace(/^ {0,3}(```|~~~)[\s\S]*/m, ' ')
      // 4칸 들여쓰기 코드블록
      .replace(/^(?: {4}|\t).*$/gm, ' ')
      .replace(/`[^`\n]*`/g, ' ')
      // 제목 — ATX(`## 제목`)와 setext(다음 줄이 === 또는 ---) 둘 다
      .replace(/^ {0,3}#{1,6} .*$/gm, ' ')
      .replace(/^.+\n {0,3}(=+|-+)[ \t]*$/gm, ' ')
      // 링크·이미지는 라벨까지 — 렌더러가 그 안에서 용어 링크를 걸지 않는다
      .replace(/!?\[[^\]\n]*\]\([^()\n]*\)/g, ' ')
  );
}

/**
 * 용어마다 "이 용어가 나오는 글" 목록을 만든다 — 글 하단 '관련 용어'의 역방향이다.
 *
 * 판정은 본문 자동 링크와 **같은 색인**으로 한다. 사전에서 글을 찾아 들어간 독자가
 * 그 글에서 실제로 점선 낱말을 보게 하려면, 두 판정이 갈라지면 안 된다.
 *
 * `postSlug`(자세히 다룬 글)를 맨 앞에 둔다. 사람이 직접 이어둔 글이라 본문에 낱말이
 * 우연히 섞인 글보다 먼저 와야 한다. 발행되지 않은 글을 가리키면 목록에서 빠진다 —
 * 사전은 공개 화면이고, 없는 글로 가는 링크를 보여줄 이유가 없다.
 */
export function referencesByTerm(
  terms: readonly DictionaryTerm[],
  posts: readonly { slug: string; title: string; content: string }[],
): Record<string, DictionaryReference[]> {
  const index = buildDictionaryIndex(toDictionaryAnchors([...terms]));
  const byPostSlug = new Map(posts.map((p) => [p.slug, p]));

  /** 용어 slug → 글 slug 들 (등장 순서 유지) */
  const found = new Map<string, string[]>();
  if (index.pattern) {
    for (const post of posts) {
      // 글 하나를 그릴 때와 같은 방식 — 한 글에서 같은 용어는 한 번만 센다
      const linked = new Set<string>();
      splitByDictionary(stripNonProse(post.content), index, linked);
      for (const termSlug of linked) {
        const list = found.get(termSlug);
        if (list) list.push(post.slug);
        else found.set(termSlug, [post.slug]);
      }
    }
  }

  const out: Record<string, DictionaryReference[]> = {};
  for (const term of terms) {
    const slugs = [...(term.postSlug ? [term.postSlug] : []), ...(found.get(term.slug) ?? [])];
    const seen = new Set<string>();
    const refs: DictionaryReference[] = [];
    for (const slug of slugs) {
      if (seen.has(slug)) continue;
      seen.add(slug);
      const post = byPostSlug.get(slug);
      if (post) refs.push({ slug: post.slug, title: post.title });
    }
    if (refs.length > 0) out[term.slug] = refs;
  }
  return out;
}

/* ═══════════════════════════════════════════════
   검색
   ═══════════════════════════════════════════════ */

/**
 * 검색 대상은 표제어 · 별칭 · 정의문 셋이다.
 *
 * 정의문까지 넣는 이유: 사전을 찾는 사람은 이름을 아는 경우보다 "이런 개념이었는데"
 * 로 더듬는 경우가 많다. 이름만 뒤지면 그 검색이 전부 빈손으로 끝난다.
 *
 * 초성 검색(`ㅅㅂㅋㅍㄴㅌ` → `서버 컴포넌트`)은 **표제어와 별칭에만** 적용한다.
 * 정의문까지 초성으로 훑으면 두세 글자 입력에 거의 모든 항목이 걸려 필터가 아니라
 * 소음이 된다.
 */
function foldSearchText(value: string): string {
  // 공백을 지운다 — `서버 컴포넌트` 를 `서버컴포넌트` 로 쳐도 찾히게
  return value.toLowerCase().replace(/\s+/g, '');
}

/** 표제어·별칭의 초성만 이어붙인 문자열. 한글이 아닌 글자는 그대로 남긴다 */
function choseongOf(value: string): string {
  let out = '';
  for (const ch of value) {
    if (/\s/.test(ch)) continue;
    out += hangulChoseong(ch) || ch.toLowerCase();
  }
  return out;
}

/** 입력이 초성만으로 이뤄졌는가 — `ㅅㅂ` 은 초성 질의, `서버` 는 아니다 */
function isChoseongQuery(query: string): boolean {
  return /^[ㄱ-ㅎ]+$/.test(query.replace(/\s+/g, ''));
}

export function searchDictionary(
  terms: readonly DictionaryTerm[],
  rawQuery: string,
): DictionaryTerm[] {
  const query = rawQuery.trim();
  if (!query) return [...terms];

  if (isChoseongQuery(query)) {
    const needle = foldSearchText(query);
    return terms.filter((t) => [t.term, ...t.aliases].some((s) => choseongOf(s).includes(needle)));
  }

  const needle = foldSearchText(query);
  return terms.filter((t) =>
    [t.term, ...t.aliases, t.definition].some((s) => foldSearchText(s).includes(needle)),
  );
}

/** 분류 필터 — `null` 이면 전체. 목록에 없는 분류를 가리키는 용어는 미분류로 본다 */
export function filterDictionaryByCategory(
  terms: readonly DictionaryTerm[],
  categories: readonly DictionaryCategory[],
  category: string | null,
): DictionaryTerm[] {
  if (category === null) return [...terms];
  if (category === UNCATEGORIZED) {
    return terms.filter((t) => !findDictionaryCategory(categories, t.category));
  }
  return terms.filter((t) => t.category === category);
}

/** 본문 렌더러에 넘길 최소 형태 — 정의문은 빼고 찾을 표기만 */
export function toDictionaryAnchors(terms: DictionaryTerm[]): DictionaryAnchor[] {
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
  '이라는',
  '이라고',
  '에서는',
  '에게서',
  '으로써',
  '으로서',
  '이란',
  '라는',
  '라고',
  '에서',
  '에게',
  '으로',
  '부터',
  '까지',
  '처럼',
  '보다',
  '이나',
  '이며',
  '이고',
  '이다',
  '입니다',
  '을',
  '를',
  '이',
  '가',
  '은',
  '는',
  '의',
  '에',
  '와',
  '과',
  '랑',
  '로',
  '도',
  '만',
  '나',
  '며',
  '고',
  '다',
];

export interface DictionaryIndex {
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
export function buildDictionaryIndex(anchors: readonly DictionaryAnchor[]): DictionaryIndex {
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

export interface DictionarySegment {
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
export function splitByDictionary(
  text: string,
  index: DictionaryIndex,
  linked: Set<string>,
): DictionarySegment[] {
  if (!index.pattern || !text) return [{ text, slug: null }];

  const segments: DictionarySegment[] = [];
  let cursor = 0;
  // 같은 인덱스를 한 렌더 안의 text 토큰마다 재사용하므로 lastIndex 를 매번 초기화한다
  // (모듈 스코프 캐시는 없다 — buildDictionaryIndex 는 renderMarkdown 호출마다 돈다)
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
