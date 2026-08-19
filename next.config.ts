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
};

export default nextConfig;
