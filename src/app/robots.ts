import type { MetadataRoute } from 'next';

import { absoluteUrl } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // 관리자 화면은 검색엔진 노출이 불필요하다
        disallow: ['/admin', '/admin/', '/login', '/api/'],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
