/**
 * 사이트 메타 — 제목·RSS·sitemap·OG 이미지가 모두 이 값을 쓴다.
 *
 * name 은 확정. description 과 author 는 임시값이므로 그대로 두지 말 것 —
 * 검색 결과 요약과 OG 카드에 그대로 노출된다. (기획서 "채울 거리": 한 줄 소개)
 */
export const SITE = {
  name: "CHOI's BLOG",
  description: '성능 · 아키텍처 · 트러블슈팅을 기록하는 프론트엔드 기술 블로그.',
  author: 'CHOI',
  locale: 'ko_KR',
} as const;

/** 배포 환경에서는 NEXT_PUBLIC_SITE_URL 을 반드시 설정할 것 (RSS·sitemap·OG 절대경로에 쓰인다) */
export function siteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    'http://localhost:3000';
  return raw.replace(/\/+$/, '');
}

export function absoluteUrl(path: string): string {
  return `${siteUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}
