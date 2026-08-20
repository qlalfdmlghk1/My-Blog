/**
 * 사이트 메타 — 제목·RSS·sitemap·OG 이미지가 모두 이 값을 쓴다.
 *
 * name · description · author 모두 확정값이다.
 * 이 값들은 검색 결과 요약과 OG 카드에 그대로 노출되므로 바꿀 때는 그 점을 감안한다.
 */
export const SITE = {
  name: "CHOI's BLOG",
  description: '성능 · 아키텍처 · 트러블슈팅을 기록하는 프론트엔드 기술 블로그.',
  author: 'CHOI',
  locale: 'ko_KR',
} as const;

/**
 * canonical · RSS · sitemap · OG 의 절대경로 기준이 되는 주소.
 *
 * 폴백으로 VERCEL_URL 을 쓰지 않는다 — 그 값은 배포마다 새로 생기는
 * deployment URL(my-blog-abc123.vercel.app)이라 안정적인 주소가 아니다.
 * 그걸 canonical 로 내보내면 배포마다 canonical 이 달라지고, RSS guid 가 흔들려
 * 구독자에게 같은 글이 새 글로 다시 나간다.
 *
 * 대신 VERCEL_PROJECT_PRODUCTION_URL(프로덕션 도메인 고정값)을 쓴다.
 * NEXT_PUBLIC_ 값은 빌드 시점에 인라인되므로, 배포 후에 등록하면 재빌드해야 반영된다.
 */
export function siteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : '') ||
    'http://localhost:3000';
  return raw.replace(/\/+$/, '');
}

export function absoluteUrl(path: string): string {
  return `${siteUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}
