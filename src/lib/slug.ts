import { romanizeKorean } from '@/lib/romanize';

/**
 * 공백·특수문자만 정리한다. **한글은 그대로 남긴다.**
 *
 * 본문 제목 앵커(`markdown.ts`)가 이 함수를 쓴다. 앵커까지 로마자로 바꾸면
 * 이미 공유된 `#설치-방법` 링크가 한꺼번에 죽는다. 주소가 되는 slug 은
 * 아래 `toAsciiSlug` 를 쓴다.
 */
export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\p{Letter}\p{Number}-]/gu, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * 발행 주소로 쓸 slug — **한글은 로마자로 바꿔 ASCII 만 남긴다.**
 *
 * 한글 slug 은 브라우저 주소창에서만 한글로 보이고, 복사해 붙이는 순간
 * `%EC%B2%AB-...` 가 된다. 공유 링크·검색 결과·RSS 어디서도 읽히지 않고
 * 길이도 3배가 된다. 표기 방식은 `lib/romanize.ts` 참고.
 *
 * 번역이 아니라 발음 표기다(`리팩토링` → `ripaektoring`). 진짜 영어 낱말을
 * 원하면 관리자가 slug 입력란에서 직접 고친다 — 자동 생성은 어디까지나 초안이고,
 * 외부 번역 API 를 물리면 키·비용·실패 폴백이 생기는 데다 같은 제목이 호출마다
 * 다른 주소가 될 수 있다.
 *
 * 로마자로 옮길 것이 하나도 남지 않으면(기호·이모지만 있는 제목) 빈 문자열이다.
 * 그 경우 저장 검사(`slug 를 입력하세요`)가 막고 관리자가 직접 채운다.
 */
export function toAsciiSlug(input: string): string {
  return slugify(romanizeKorean(input))
    // 로마자로 옮겨지지 않은 비-ASCII(한자·가나·이모지)는 여기서 떨군다 —
    // slugify 는 \p{Letter} 를 통과시키므로 그것만으로는 ASCII 가 보장되지 않는다.
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}


/**
 * **이미 영문인 값**을 주소 조각으로 다듬는다 — 모델이 제안한 slug 이 그 대상이다.
 *
 * `toAsciiSlug` 와 갈라지는 지점이 하나다: 이 함수는 한글을 **로마자로 옮기지 않고
 * 버린다.** 제안의 존재 이유가 "발음 표기를 피하는 것"이라, 모델이 지시를 어기고
 * 한글을 넣었을 때 옮겨주면 정확히 피하려던 결과가 나온다. 남는 게 없으면 빈 문자열이고,
 * 그때 호출부가 로마자 폴백으로 떨어진다.
 */
export function sanitizeAsciiSlug(input: string, max = 80): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, max)
    // 잘린 끝이 하이픈으로 남을 수 있다
    .replace(/-$/, '');
}

/**
 * 라우트 params 로 받은 slug 를 저장값과 맞춘다.
 *
 * slug 에 한글을 허용하므로 URL 에서는 퍼센트 인코딩된 채로 들어온다
 * (`/posts/첫-번째-글` → `%EC%B2%AB-...`). 그대로 Firestore 와 대조하면
 * 언제나 어긋나 글이 통째로 404 가 된다.
 *
 * 잘못 만들어진 이스케이프(`%`, `%zz`)는 decodeURIComponent 가 던지므로
 * 원문을 그대로 돌려준다 — 어차피 매칭에 실패해 404 로 떨어질 값이고,
 * 여기서 예외가 새어나가면 500 이 된다.
 */
export function decodeSlugParam(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/** 마크다운에서 발췌문 자동 생성 — 관리자가 비워두면 이 값을 쓴다 */
export function autoExcerpt(markdown: string, max = 160): string {
  const plain = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_`>#-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length <= max ? plain : `${plain.slice(0, max).trimEnd()}…`;
}
