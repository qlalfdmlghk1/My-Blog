/**
 * 에디터 실시간 미리보기용 — 클라이언트에서 동작한다.
 * 코드 하이라이팅은 넣지 않는다: Shiki 를 클라이언트로 내려보내면
 * 관리자 번들이 수백 KB 커지고, 미리보기는 구조 확인이 목적이므로 필요 없다.
 * 발행된 글은 서버에서 renderMarkdown() 으로 하이라이팅되어 나간다.
 */
import { Marked } from 'marked';

const md = new Marked({ gfm: true, breaks: false });

export function renderPreview(markdown: string): string {
  if (!markdown.trim()) return '';
  return md.parse(markdown) as string;
}
