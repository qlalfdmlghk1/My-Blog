/**
 * 카테고리 — 색 있음 · 6개 고정 · 글 1개당 정확히 1개
 *
 * 왜 고정인가: 색 태그를 자유 증식시키면 태그 20개 시점에 배정할 색이 없어
 * 시스템이 붕괴한다. 색의 개수를 고정해 확장성을 확보한다.
 *
 * 왜 스택 이름이 아니라 주제인가: 스택별로 쪼개면 글이 흩어져 아무것도
 * 증명되지 않는다. 주제로 묶어야 '성능' 카테고리에 글이 축적되고
 * 그 자체가 포지션 증명이 된다.
 *
 * ── 색 값의 단일 진실 공급원 ──
 * 여기가 유일한 정의처다. 화면용 CSS 변수는 category-css.ts 가 이 값에서
 * 생성해 layout 에서 주입하고, OG 이미지(satori)는 CSS 변수를 해석하지 못하므로
 * 이 객체를 직접 읽는다. 카테고리를 추가할 때 고칠 곳은 이 파일 하나뿐이다.
 *
 * 파스텔은 배경에만, 글자는 같은 계열의 진한 값 —
 * 연한 배경 + 회색 글자는 대비 미달이고 A11y 95+ 목표와 직결된다.
 */
export const CATEGORIES = [
  {
    slug: 'performance',
    name: '성능',
    hint: '대표 카테고리',
    tone: '코랄',
    light: { bg: '#FAECE7', fg: '#712B13' },
    dark: { bg: '#712B13', fg: '#F5C4B3' },
  },
  {
    slug: 'frontend',
    name: '프론트엔드',
    hint: '구현 · 브라우저 API',
    tone: '블루',
    light: { bg: '#E6F1FB', fg: '#0C447C' },
    dark: { bg: '#0C447C', fg: '#B5D4F4' },
  },
  {
    slug: 'architecture',
    name: '아키텍처',
    hint: '구조 · 기술 선택 근거',
    tone: '퍼플',
    light: { bg: '#EEEDFE', fg: '#3C3489' },
    dark: { bg: '#3C3489', fg: '#CECBF6' },
  },
  {
    slug: 'troubleshooting',
    name: '트러블슈팅',
    hint: '실제로 막혔던 문제',
    tone: '앰버',
    light: { bg: '#FAEEDA', fg: '#633806' },
    dark: { bg: '#633806', fg: '#FAC775' },
  },
  {
    slug: 'devenv',
    name: '개발 환경',
    hint: 'Claude Code · 빌드 · 배포',
    tone: '틸',
    light: { bg: '#E1F5EE', fg: '#085041' },
    dark: { bg: '#085041', fg: '#9FE1CB' },
  },
  {
    slug: 'retrospective',
    name: '회고',
    hint: '프로젝트 마무리',
    tone: '핑크',
    light: { bg: '#FBEAF0', fg: '#72243E' },
    dark: { bg: '#72243E', fg: '#F4C0D1' },
  },
] as const;

/**
 * 일반 태그 — 색 없음(회색). 카테고리와 같은 자리에서 관리한다.
 *
 * ── 태그에 붙는 유일한 규칙: 고유명사만 ──
 * 태그는 기술 · 도구 · 스펙 이름(`Next.js` `Firestore` `ISR`)만 받는다.
 * 카테고리 이름(`프론트엔드` `성능`)을 태그로 다시 붙이면 두 축이 같은 말을
 * 되풀이해 태그가 아무것도 구분하지 못한다. 카테고리는 "무슨 성격의 글인가",
 * 태그는 "무엇이 나오는가"로 축을 갈라야 태그가 소주제 역할을 할 수 있다.
 * (판정은 아래 isCategoryWord, 화면 경고는 PostEditor)
 *
 * ── 색 값 ──
 * globals.css 의 무채색 스케일과 같은 색상각(H≈220)을 쓴다. 예전 값(#F1EFE8/#444441)은
 * H≈50 올리브 계열이었는데, 뉴트럴을 중립으로 바꾼 뒤에는 태그 칩만 누렇게 떠 보인다.
 * 명도는 그대로 두어 대비를 지켰다 (라이트 8.49→8.17, 다크 6.38→6.35).
 */
export const TAG_COLOR = {
  light: { bg: '#EEF0F4', fg: '#43474F' },
  dark: { bg: '#3F434C', fg: '#CBCFD8' },
} as const;

export type Category = (typeof CATEGORIES)[number];
export type CategorySlug = Category['slug'];

export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug) as readonly CategorySlug[];

const BY_SLUG = new Map<string, Category>(CATEGORIES.map((c) => [c.slug, c]));

export function isCategorySlug(v: unknown): v is CategorySlug {
  return typeof v === 'string' && BY_SLUG.has(v);
}

export function getCategory(slug: CategorySlug): Category {
  const found = BY_SLUG.get(slug);
  if (!found) throw new Error(`알 수 없는 카테고리: ${slug}`);
  return found;
}

/** 카테고리 이름 — 알 수 없는 값이면 slug 를 그대로 보여준다(데이터 유실보다 나음) */
export function categoryName(slug: string): string {
  return BY_SLUG.get(slug)?.name ?? slug;
}

/**
 * 표기 흔들림을 흡수한 비교용 형태.
 * `Next.js` 와 `nextjs`, `프론트 엔드` 와 `프론트엔드` 를 같은 낱말로 본다.
 *
 * `#` 도 떼어낸다 — 에디터는 저장 전에 이미 벗겨내지만, 그걸 거치지 않은
 * 기존 데이터(`#프론트엔드`)를 판정할 때 여기서 걸러야 한다.
 */
function normalizeWord(value: string): string {
  return value.trim().toLowerCase().replace(/[#\s._-]/g, '');
}

const CATEGORY_WORDS = new Set(
  CATEGORIES.flatMap((c) => [c.slug, c.name]).map(normalizeWord),
);

/**
 * 카테고리가 이미 쓰고 있는 낱말인지 — 태그로 쓰면 안 되는 값 판정.
 * slug(`frontend`)와 한글 이름(`프론트엔드`)을 모두 막는다.
 */
export function isCategoryWord(value: string): boolean {
  return CATEGORY_WORDS.has(normalizeWord(value));
}

/**
 * 라이트 모드 색쌍. CSS 변수를 쓸 수 없는 곳(OG 이미지 satori)에서 사용한다.
 * 알 수 없는 카테고리는 무채색 태그 색으로 떨어뜨린다.
 */
export function categoryLightColor(slug: string): { bg: string; fg: string } {
  return BY_SLUG.get(slug)?.light ?? TAG_COLOR.light;
}
