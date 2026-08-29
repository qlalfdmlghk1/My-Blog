import type { NextConfig } from 'next';

/** 보안 헤더 — 포트폴리오 사이트와 동일 3종 + 블로그용 추가 */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
];

const nextConfig: NextConfig = {
  /**
   * OG 이미지 생성이 fs 로 읽는 폰트 파일은 코드 분석으로 추적되지 않는다.
   * 명시하지 않으면 Vercel 배포 번들에서 빠져 런타임에 ENOENT 로 죽는다.
   */
  outputFileTracingIncludes: {
    '/opengraph-image': ['./src/assets/fonts/**'],
    '/posts/[slug]/opengraph-image': ['./src/assets/fonts/**'],
  },
  images: {
    // Firebase Storage 이미지
    remotePatterns: [
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: 'storage.googleapis.com' },
    ],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  /**
   * 용어 사전의 공개 주소를 `/glossary` 에서 `/dictionary` 로 옮겼다.
   *
   * 본문의 용어 링크는 저장된 HTML 이 아니라 렌더 시점에 붙으므로(lib/markdown.ts)
   * 이미 발행된 글은 재생성되면서 새 주소를 따라온다. 하지만 밖에서 걸어둔 링크와
   * 검색엔진 색인은 옛 주소를 그대로 갖고 있어 이 리다이렉트가 필요하다.
   * 조각(`#slug`)은 서버로 오지 않고 브라우저가 그대로 들고 이동하므로 앵커도 살아 있다.
   */
  async redirects() {
    return [
      { source: '/glossary', destination: '/dictionary', permanent: true },
      // 관리 화면도 함께 옮겼다 — 북마크가 관리자 브라우저에 남아 있다
      { source: '/admin/glossary', destination: '/admin/dictionary', permanent: true },
    ];
  },
};

export default nextConfig;
