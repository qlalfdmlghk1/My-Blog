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
