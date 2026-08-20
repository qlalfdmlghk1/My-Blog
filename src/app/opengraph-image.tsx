import { ImageResponse } from 'next/og';

import { OgCard, OG_CONTENT_TYPE, OG_SIZE, loadOgFont } from '@/lib/og';
import { SITE } from '@/lib/site';

export const alt = SITE.name;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/** 사이트 기본 OG — 글 상세가 아닌 모든 경로가 이 이미지를 쓴다 */
export default async function Image() {
  return new ImageResponse(<OgCard title={SITE.name} />, {
    ...size,
    fonts: [
      { name: 'Pretendard', data: await loadOgFont(), style: 'normal', weight: 700 },
    ],
  });
}
