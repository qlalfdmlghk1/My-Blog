/** TODO: 블로그 이름 · 설명 · 도메인 확정 후 교체 (기획서 "채울 거리") */
export const SITE = {
  name: 'TODO: 블로그 이름',
  description: 'TODO: 한 줄 소개',
  author: 'TODO: 이름',
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
