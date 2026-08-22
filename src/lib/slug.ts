/**
 * 한글 제목을 그대로 slug 로 쓰면 URL 인코딩되어 링크가 읽히지 않는다.
 * 한글은 유지하되(가독성) 공백·특수문자만 정리하고, 최종 slug 는 관리자가 직접 고칠 수 있게 한다.
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
