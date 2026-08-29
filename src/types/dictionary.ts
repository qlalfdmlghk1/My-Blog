import type { PaletteId } from '@/lib/palette';

/**
 * dictionary/{slug}
 *
 * 카테고리와 같은 규약을 쓴다 — **문서 ID 가 곧 slug**다. 별도 필드로 두면
 * 문서 ID 와 slug 이 갈라질 수 있고, 본문에서 만든 `/dictionary#{slug}` 링크가
 * 가리킬 곳을 잃는다.
 *
 * 용어 사전을 글 안이 아니라 별도 컬렉션에 두는 이유: 같은 용어를 여러 글에서
 * 설명하면 설명이 조금씩 갈라지고, 어느 쪽이 정본인지 알 수 없게 된다.
 * 정의는 한 곳에 두고 글은 링크만 건다.
 */
export interface DictionaryTerm {
  /** 문서 ID = 앵커 조각. `/dictionary#{slug}` */
  slug: string;
  /** 표제어 — 사전에 표시되는 대표 표기 */
  term: string;
  /**
   * 같은 개념의 다른 표기. 본문 자동 링크가 표제어와 똑같이 인식한다.
   * (`서버 컴포넌트` 의 별칭으로 `RSC` · `React Server Component`)
   */
  aliases: string[];
  /**
   * 한두 문장 정의. **마크다운이 아니라 평문이다.**
   * 정의에 마크다운을 허용하면 사전 한 항목이 글만큼 길어질 수 있고,
   * 그 순간 "글이 아니라 사전"이라는 구분이 사라진다. 길게 쓸 내용이면
   * 글을 쓰고 아래 `postSlug` 로 잇는다.
   */
  definition: string;
  /**
   * 더 자세히 다룬 글의 slug — 없으면 빈 문자열.
   * 외부 URL 이 아니라 이 블로그의 글만 가리킨다. 사전이 외부 문서로 나가는
   * 관문이 되면 정의를 직접 쓸 이유가 없어진다.
   */
  postSlug: string;
  /**
   * 용어 분류 문서의 slug — `dictionaryCategories/{slug}`.
   *
   * **글 카테고리(`categories`)와 다른 체계다.** 글은 "무엇에 대해 썼는가"로
   * 나뉘고 용어는 "무엇에 속한 낱말인가"로 나뉜다. 같은 축을 쓰면 회고·트러블슈팅
   * 같은 글 분류에 용어를 억지로 넣게 된다.
   *
   * **선택 사항이다** — 빈 문자열이면 '분류 없음'. 용어를 만드는 순간 분류까지 정하도록
   * 강요하지 않는다(글을 쓰다 급히 넣는 자리에서는 아직 모르는 편이 흔하다).
   * 목록에 없는 slug 을 가리키는 경우도 같은 취급이다.
   */
  category: string;
}

/** 관리 화면의 생성 · 수정 폼 (slug 는 생성 시 확정하고 이후 바꾸지 않는다) */
export interface DictionaryDraft {
  term: string;
  aliases: string[];
  definition: string;
  postSlug: string;
  category: string;
}

/**
 * dictionaryCategories/{slug} — 용어 분류
 *
 * 글 카테고리(`types/category.ts` 의 `Category`)와 모양이 닮았지만 별개 컬렉션이다.
 * 색을 hex 가 아니라 팔레트 슬롯 ID 로 저장하는 규약은 그대로 따른다 —
 * 슬롯이 라이트·다크 네 값을 이미 짝지어 두므로 어느 것을 골라도 대비가 깨지지 않는다.
 *
 * 글 카테고리와 달리 `hint` 가 없다. 사이드바 툴팁처럼 설명이 필요한 자리가 없고,
 * 사전에서 분류는 "좁히는 축"이지 읽을 거리가 아니다.
 */
export interface DictionaryCategory {
  /** 문서 ID = 필터 값 */
  slug: string;
  name: string;
  palette: PaletteId;
  /** 필터 줄에 놓이는 순서 — 작을수록 앞 */
  order: number;
}

/** 분류 생성 · 수정 폼 (slug 는 생성 시 확정) */
export interface DictionaryCategoryDraft {
  name: string;
  palette: PaletteId;
  order: number;
}

/**
 * 본문 자동 링크가 쓰는 최소 형태.
 *
 * 렌더러에 `DictionaryTerm` 전체를 넘기지 않는다 — 정의문까지 딸려가면
 * 글 한 편을 그릴 때마다 쓰지도 않는 문자열이 함께 실린다.
 */
export interface DictionaryAnchor {
  slug: string;
  /** 표제어 + 별칭 — 본문에서 이 표기들을 찾는다 */
  surfaces: string[];
}
