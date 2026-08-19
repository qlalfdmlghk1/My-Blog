import { CATEGORIES, TAG_COLOR } from '@/lib/categories';

/**
 * categories.ts 의 색 값에서 CSS 변수를 생성한다.
 *
 * 왜 globals.css 에 직접 쓰지 않는가: OG 이미지(satori)는 CSS 변수를 해석하지
 * 못해 색을 TS 값으로 읽어야 한다. 양쪽에 hex 를 손으로 적어두면 언젠가 어긋난다.
 * 정의는 categories.ts 한 곳에 두고 CSS 는 여기서 파생시킨다.
 *
 * 결과는 정적 문자열이라 layout 에서 한 번 렌더되고 그대로 캐시된다.
 */
export function categoryCssVariables(): string {
  const light = CATEGORIES.map(
    (c) => `--cat-${c.slug}-bg:${c.light.bg};--cat-${c.slug}-fg:${c.light.fg};`,
  ).join('');
  const dark = CATEGORIES.map(
    (c) => `--cat-${c.slug}-bg:${c.dark.bg};--cat-${c.slug}-fg:${c.dark.fg};`,
  ).join('');

  return (
    `:root{${light}--tag-bg:${TAG_COLOR.light.bg};--tag-fg:${TAG_COLOR.light.fg};}` +
    // 파스텔을 다크 배경에 그대로 쓰면 붕괴한다 → bg/fg 를 뒤집은 2벌째
    `.dark{${dark}--tag-bg:${TAG_COLOR.dark.bg};--tag-fg:${TAG_COLOR.dark.fg};}`
  );
}
