import type { Category } from '@/types/category';

/**
 * 카테고리 — 색 있음 · 글 1개당 정확히 1개 · **관리 화면에서 만든다**
 *
 * v1 에서는 이 파일의 배열이 정본이었다. 지금은 Firestore `categories` 컬렉션이
 * 정본이고, 여기 남은 건 처음 한 번 심는 기본값과 이름 판정 유틸뿐이다.
 * 읽기는 `lib/categories.server.ts`(서버) · `lib/categories.client.ts`(관리 화면).
 *
 * 왜 스택 이름이 아니라 주제인가: 스택별로 쪼개면 글이 흩어져 아무것도
 * 증명되지 않는다. 주제로 묶어야 '성능' 카테고리에 글이 축적되고
 * 그 자체가 포지션 증명이 된다. 카테고리를 늘릴 때 참고할 기준이다.
 *
 * 색 값은 여기 없다 — `lib/palette.ts` 의 슬롯 ID 만 참조한다.
 */
export const DEFAULT_CATEGORIES: readonly Category[] = [
  { slug: 'performance', name: '성능', hint: '대표 카테고리', palette: 'coral', order: 0 },
  { slug: 'frontend', name: '프론트엔드', hint: '구현 · 브라우저 API', palette: 'blue', order: 1 },
  { slug: 'architecture', name: '아키텍처', hint: '구조 · 기술 선택 근거', palette: 'purple', order: 2 },
  { slug: 'troubleshooting', name: '트러블슈팅', hint: '실제로 막혔던 문제', palette: 'amber', order: 3 },
  { slug: 'devenv', name: '개발 환경', hint: 'Claude Code · 빌드 · 배포', palette: 'teal', order: 4 },
  { slug: 'retrospective', name: '회고', hint: '프로젝트 마무리', palette: 'pink', order: 5 },
];

/**
 * 일반 태그 — 색 없음(회색).
 *
 * ── 태그에 붙는 유일한 규칙: 고유명사만 ──
 * 태그는 기술 · 도구 · 스펙 이름(`Next.js` `Firestore` `ISR`)만 받는다.
 * 카테고리 이름(`프론트엔드` `성능`)을 태그로 다시 붙이면 두 축이 같은 말을
 * 되풀이해 태그가 아무것도 구분하지 못한다. 카테고리는 "무슨 성격의 글인가",
 * 태그는 "무엇이 나오는가"로 축을 갈라야 태그가 소주제 역할을 할 수 있다.
 * (판정은 아래 categoryWordSet, 화면 경고는 PostEditor)
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

/**
 * 표기 흔들림을 흡수한 비교용 형태.
 * `Next.js` 와 `nextjs`, `프론트 엔드` 와 `프론트엔드` 를 같은 낱말로 본다.
 *
 * `#` 도 떼어낸다 — 에디터는 저장 전에 이미 벗겨내지만, 그걸 거치지 않은
 * 기존 데이터(`#프론트엔드`)를 판정할 때 여기서 걸러야 한다.
 */
export function normalizeWord(value: string): string {
  return value.trim().toLowerCase().replace(/[#\s._-]/g, '');
}

/**
 * 카테고리가 이미 쓰고 있는 낱말 집합 — 태그로 쓰면 안 되는 값의 판정 재료.
 * slug(`frontend`)와 한글 이름(`프론트엔드`)을 모두 막는다.
 *
 * 카테고리가 런타임에 늘어나므로 정적 상수로 둘 수 없다. 화면이 이미 읽어둔
 * 목록을 넘겨 만든다.
 */
export function categoryWordSet(categories: readonly Category[]): Set<string> {
  return new Set(categories.flatMap((c) => [c.slug, c.name]).map(normalizeWord));
}

/** Firestore 문서 → Category. 손상된 필드는 버리지 않고 안전한 값으로 떨어뜨린다. */
export function normalizeCategory(id: string, data: Record<string, unknown>): Category {
  const order = Number(data.order);
  return {
    slug: id,
    name: String(data.name ?? id),
    hint: String(data.hint ?? ''),
    // 알 수 없는 슬롯은 palette 쪽에서 첫 슬롯으로 떨어진다 — 여기선 원본을 넘긴다
    palette: String(data.palette ?? 'slate') as Category['palette'],
    order: Number.isFinite(order) ? order : 999,
  };
}

/** 사이드바·선택 목록의 표시 순서 — order 우선, 같으면 이름 가나다순 */
export function sortCategories(categories: Category[]): Category[] {
  return [...categories].sort(
    (a, b) => a.order - b.order || a.name.localeCompare(b.name, 'ko'),
  );
}
