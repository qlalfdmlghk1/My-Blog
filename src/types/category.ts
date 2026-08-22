import type { PaletteId } from '@/lib/palette';

/**
 * categories/{slug}
 *
 * 문서 ID 가 곧 slug 다. 별도 필드로 두면 문서 ID 와 slug 가 갈라질 수 있고,
 * 글의 `category` 값으로 카테고리 문서를 바로 찾을 수 없게 된다.
 *
 * 색은 hex 가 아니라 팔레트 슬롯 ID 로 저장한다 — 색 값 자체는 `lib/palette.ts` 가
 * 갖고, 여기엔 "어느 슬롯을 쓰는지"만 남는다. 나중에 슬롯 색을 손보면
 * 그 슬롯을 쓰는 카테고리가 한꺼번에 따라온다.
 */
export interface Category {
  /** 문서 ID = URL 조각. `/categories/{slug}` */
  slug: string;
  name: string;
  /** 사이드바 툴팁과 카테고리 페이지 부제에 쓰이는 한 줄 설명 */
  hint: string;
  palette: PaletteId;
  /** 사이드바 정렬 순서 — 작을수록 위 */
  order: number;
}

/** 관리 화면의 생성 · 수정 폼이 다루는 형태 (slug 는 생성 시 확정하고 이후 바꾸지 않는다) */
export interface CategoryDraft {
  name: string;
  hint: string;
  palette: PaletteId;
  order: number;
}

/**
 * categories/{categorySlug}/subcategories/{subSlug} — 소분류
 *
 * 하위 컬렉션에 두는 이유가 셋이다.
 *  - slug 유일성이 카테고리 안에서만 보장되면 된다 (`프론트엔드/react` 와
 *    `백엔드/react` 가 공존할 수 있다). 최상위 컬렉션이면 전역 유일해야 한다.
 *  - 보안 규칙에서 `exists(.../categories/{cat}/subcategories/{sub})` 한 번으로
 *    "존재하는가"와 "그 카테고리 소속인가"를 동시에 검사한다.
 *  - 부모를 필드로 중복 저장하지 않아도 된다 — 경로가 곧 소속이다.
 *
 * 색을 갖지 않는다. 색은 카테고리(대분류)에만 쓴다는 원칙 그대로다.
 */
export interface Subcategory {
  /** 문서 ID = URL 조각. `/categories/{category}/{slug}` */
  slug: string;
  /** 부모 카테고리 slug — 문서에 저장하지 않고 경로에서 채운다 */
  category: string;
  name: string;
  /** 같은 카테고리 안에서의 정렬 순서 — 작을수록 위 */
  order: number;
}

/** 관리 화면의 소분류 생성 · 수정 폼 (slug 과 부모 카테고리는 생성 시 확정) */
export interface SubcategoryDraft {
  name: string;
  order: number;
}
