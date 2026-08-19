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
