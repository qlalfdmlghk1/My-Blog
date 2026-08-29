/**
 * glossary/{slug}
 *
 * 카테고리와 같은 규약을 쓴다 — **문서 ID 가 곧 slug**다. 별도 필드로 두면
 * 문서 ID 와 slug 이 갈라질 수 있고, 본문에서 만든 `/glossary#{slug}` 링크가
 * 가리킬 곳을 잃는다.
 *
 * 용어 사전을 글 안이 아니라 별도 컬렉션에 두는 이유: 같은 용어를 여러 글에서
 * 설명하면 설명이 조금씩 갈라지고, 어느 쪽이 정본인지 알 수 없게 된다.
 * 정의는 한 곳에 두고 글은 링크만 건다.
 */
export interface GlossaryTerm {
  /** 문서 ID = 앵커 조각. `/glossary#{slug}` */
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
}

/** 관리 화면의 생성 · 수정 폼 (slug 는 생성 시 확정하고 이후 바꾸지 않는다) */
export interface GlossaryDraft {
  term: string;
  aliases: string[];
  definition: string;
  postSlug: string;
}

/**
 * 본문 자동 링크가 쓰는 최소 형태.
 *
 * 렌더러에 `GlossaryTerm` 전체를 넘기지 않는다 — 정의문까지 딸려가면
 * 글 한 편을 그릴 때마다 쓰지도 않는 문자열이 함께 실린다.
 */
export interface GlossaryAnchor {
  slug: string;
  /** 표제어 + 별칭 — 본문에서 이 표기들을 찾는다 */
  surfaces: string[];
}
