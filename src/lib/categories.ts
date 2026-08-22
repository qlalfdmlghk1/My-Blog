/**
 * 카테고리 — 색 있음 · 글 1개당 정확히 1개 · **관리 화면에서 만든다**
 *
 * 이 파일에는 카테고리 목록이 없다. 정본은 Firestore `categories` 컬렉션이고,
 * 여기에는 이름 판정과 정규화 유틸만 둔다.
 * 읽기는 `lib/categories.server.ts`(서버) · `lib/categories.client.ts`(관리 화면).
 *
 * 코드에 기본 목록을 두지 않는 이유: 어딘가에 6개를 적어두면 그게 폴백이 되고,
 * 관리 화면에서 전부 지워도 되살아나 "처음부터 내가 짠다"가 불가능해진다.
 * 시작할 때 쓸 예시 6개는 `scripts/seed-categories.mjs` 에만 있고, 그 스크립트는
 * 선택 사항이다.
 *
 * 카테고리를 무엇으로 나눌지의 기준: 스택 이름이 아니라 주제로 묶는다.
 * 스택별로 쪼개면 글이 흩어져 아무것도 증명되지 않는다.
 *
 * 색 값은 여기 없다 — `lib/palette.ts` 의 슬롯 ID 만 참조한다.
 */

import { isPaletteId } from '@/lib/palette';
import type { Category, Subcategory } from '@/types/category';

/**
 * 일반 태그 — 색 없음(회색).
 *
 * ── 태그에 붙는 유일한 규칙: 고유명사만 ──
 * 태그는 기술 · 도구 · 스펙 이름(`Next.js` `Firestore` `ISR`)만 받는다.
 * 카테고리 이름(`프론트엔드` `성능`)을 태그로 다시 붙이면 두 축이 같은 말을
 * 되풀이해 태그가 아무것도 구분하지 못한다. 카테고리는 "무슨 성격의 글인가",
 * 태그는 "무엇이 나오는가"로 축을 갈라야 태그가 소주제 역할을 할 수 있다.
 * (판정은 아래 taxonomyWordSet, 화면 경고는 PostEditor)
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
 * 분류가 이미 쓰고 있는 낱말 집합 — 태그로 쓰면 안 되는 값의 판정 재료.
 * slug(`front-end`)과 한글 이름(`프론트엔드`)을 모두 막는다.
 *
 * 소분류 이름도 함께 막는다. 소분류가 생긴 뒤로는 `Next.js` 같은 기술 이름이
 * 소분류 자리에 오므로, 같은 낱말을 태그로 또 붙이면 두 축이 겹친다.
 *
 * 분류가 런타임에 늘어나므로 정적 상수로 둘 수 없다. 화면이 이미 읽어둔
 * 목록을 넘겨 만든다.
 */
export function taxonomyWordSet(
  categories: readonly Category[],
  subcategories: readonly Subcategory[] = [],
): Set<string> {
  return new Set(
    [
      ...categories.flatMap((c) => [c.slug, c.name]),
      ...subcategories.flatMap((s) => [s.slug, s.name]),
    ].map(normalizeWord),
  );
}

/** Firestore 문서 → Category. 손상된 필드는 버리지 않고 안전한 값으로 떨어뜨린다. */
export function normalizeCategory(id: string, data: Record<string, unknown>): Category {
  const order = Number(data.order);
  return {
    slug: id,
    name: String(data.name ?? id),
    hint: String(data.hint ?? ''),
    // 알 수 없는 슬롯은 여기서 떨어뜨린다. 캐스트로 넘기면 타입만 PaletteId 이고
    // 런타임엔 임의 문자열이라, var(--pal-{unknown}-bg) 가 무효가 되어 배지 색이 사라진다.
    // (OG 이미지는 getPaletteSlot 이 폴백해서 두 소비자가 다른 색을 내는 상태였다)
    palette: isPaletteId(data.palette) ? data.palette : 'slate',
    order: Number.isFinite(order) ? order : 999,
  };
}

/** 사이드바·선택 목록의 표시 순서 — order 우선, 같으면 이름 가나다순 */
export function sortCategories(categories: Category[]): Category[] {
  return [...categories].sort(
    (a, b) => a.order - b.order || a.name.localeCompare(b.name, 'ko'),
  );
}

/** Firestore 문서 → Subcategory. 부모 slug 은 문서가 아니라 경로에서 온다. */
export function normalizeSubcategory(
  category: string,
  id: string,
  data: Record<string, unknown>,
): Subcategory {
  const order = Number(data.order);
  return {
    slug: id,
    category,
    name: String(data.name ?? id),
    order: Number.isFinite(order) ? order : 999,
  };
}

/** 소분류 표시 순서 — order 우선, 같으면 이름 가나다순 */
export function sortSubcategories(subcategories: Subcategory[]): Subcategory[] {
  return [...subcategories].sort(
    (a, b) => a.order - b.order || a.name.localeCompare(b.name, 'ko'),
  );
}
