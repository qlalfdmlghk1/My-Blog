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
 * globals.css 의 무채색 스케일과 **같은 색상각**을 쓴다. 이 값이 뉴트럴과 따로 놀면
 * 태그 칩만 다른 색으로 떠 보인다. 실제로 예전에 그런 적이 있다 — 뉴트럴을 차가운
 * 쪽으로 옮긴 뒤에도 칩은 올리브(H≈50)로 남아 혼자 누렇게 떴다.
 * 지금은 뉴트럴을 따라 보라 쪽(OKLCH H≈295)으로 함께 돌렸고, 면·구분선과 같은
 * 배율(1.35)로 채도를 올렸다. 명도는 건드리지 않아 대비가 그대로다
 * (라이트 7.91→7.98, 다크 7.68→7.64).
 *
 * 다크 배경은 한때 #3F434C 였는데 surface 보다 밝아서, 칩이 사이드바 배경 위로 떠올라
 * 회색인데도 카테고리 배지만큼 눈에 띄었다. 태그는 색 없는 축이므로 배지보다 뒤로
 * 물러나 있어야 한다. 지금 값은 L*=21.2 로, 면(16.0)보다는 위이고 배지(35.0~38.0)
 * 보다는 아래다.
 */
export const TAG_COLOR = {
  light: { bg: '#F0EFF6', fg: '#4A4657' },
  dark: { bg: '#34313F', fg: '#CAC7D7' },
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
