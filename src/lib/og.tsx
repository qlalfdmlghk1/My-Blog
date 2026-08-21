import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { ReactElement } from 'react';

import { categoryLightColor, categoryName } from '@/lib/categories';
import { SITE } from '@/lib/site';

/** OG 이미지 표준 크기 */
export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = 'image/png';

/**
 * satori 는 시스템 폰트를 쓰지 않으므로 한글을 그리려면 폰트를 직접 넘겨야 한다.
 * 넘기지 않으면 모든 한글이 빈 네모로 렌더된다.
 * (satori 는 woff2 를 지원하지 않는다. 반드시 woff/ttf/otf 여야 한다)
 *
 * 저장소에 넣어둔 파일을 fs 로 읽는다 — 외부 CDN 을 타지 않으므로
 * CDN 장애가 이미지 생성 실패로 이어지지 않는다.
 *
 * `new URL(..., import.meta.url)` + fetch 패턴은 쓰지 않는다: 정적 에셋 경로
 * (`/_next/static/media/...`)로 풀려서 프리렌더 중 "Failed to parse URL" 로 죽는다.
 * 대신 next.config 의 outputFileTracingIncludes 가 이 파일을 배포 번들에 포함시킨다.
 */
let fontCache: Buffer | null = null;

export async function loadOgFont(): Promise<Buffer> {
  // 이미지마다 1.1MB 를 다시 읽지 않도록 모듈 스코프에 캐시
  fontCache ??= await readFile(
    join(process.cwd(), 'src/assets/fonts/Pretendard-Bold.woff'),
  );
  return fontCache;
}

/**
 * 무채색 90% — 색은 카테고리 배지에만 등장한다 (화면과 같은 규칙)
 *
 * satori 는 CSS 변수를 해석하지 못해 값을 여기 다시 적는다.
 * globals.css `:root` 의 라이트 뉴트럴과 같은 값이어야 한다 — 한쪽만 바꾸면
 * OG 카드만 옛 색으로 남는다.
 */
const INK = '#16181d';
const INK_DIM = '#5f6672';
const BG = '#ffffff';
const LINE = '#e1e4ea';

export function OgCard({
  title,
  category,
  tags = [],
  date,
}: {
  title: string;
  category?: string;
  tags?: string[];
  date?: string;
}): ReactElement {
  const color = category ? categoryLightColor(category) : null;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: BG,
        padding: '72px 80px',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {color && category && (
          <div
            style={{
              display: 'flex',
              alignSelf: 'flex-start',
              background: color.bg,
              color: color.fg,
              fontSize: 26,
              padding: '10px 22px',
              borderRadius: 999,
              marginBottom: 34,
            }}
          >
            {categoryName(category)}
          </div>
        )}
        <div
          style={{
            display: 'flex',
            fontSize: title.length > 40 ? 60 : 72,
            lineHeight: 1.25,
            letterSpacing: '-0.03em',
            color: INK,
            // satori 에는 line-clamp 가 없다 — 넘치는 만큼 잘라 레이아웃 붕괴를 막는다
            maxHeight: 270,
            overflow: 'hidden',
          }}
        >
          {title}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: `2px solid ${LINE}`,
          paddingTop: 28,
          fontSize: 26,
          color: INK_DIM,
        }}
      >
        <div style={{ display: 'flex', color: INK }}>{SITE.name}</div>
        <div style={{ display: 'flex', gap: 18 }}>
          {tags.slice(0, 3).map((t) => (
            <div key={t} style={{ display: 'flex' }}>
              #{t}
            </div>
          ))}
          {date && <div style={{ display: 'flex' }}>{date}</div>}
        </div>
      </div>
    </div>
  );
}
