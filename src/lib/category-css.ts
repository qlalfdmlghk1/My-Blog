import { PALETTE } from '@/lib/palette';
import { TAG_COLOR } from '@/lib/categories';

/**
 * 팔레트 슬롯 12개의 색을 CSS 변수로 깐다.
 *
 * 카테고리별이 아니라 **슬롯별**로 까는 것이 요점이다. 카테고리는 관리 화면에서
 * 런타임에 생기지만 슬롯 목록은 정적이라, 이 문자열이 빌드 시점에 확정된다.
 * 카테고리마다 변수를 만들었다면 루트 레이아웃이 Firestore 조회에 엮여
 * 모든 페이지가 그 조회를 기다려야 했다.
 *
 * 색 정의는 palette.ts 한 곳에 두고 CSS 는 여기서 파생시킨다 —
 * OG 이미지(satori)는 CSS 변수를 해석하지 못해 같은 값을 TS 로 직접 읽는다.
 * 양쪽에 hex 를 손으로 적어두면 언젠가 어긋난다.
 */
export function categoryCssVariables(): string {
  const light = PALETTE.map(
    (p) => `--pal-${p.id}-bg:${p.light.bg};--pal-${p.id}-fg:${p.light.fg};`,
  ).join('');
  const dark = PALETTE.map(
    (p) => `--pal-${p.id}-bg:${p.dark.bg};--pal-${p.id}-fg:${p.dark.fg};`,
  ).join('');

  return (
    `:root{${light}--tag-bg:${TAG_COLOR.light.bg};--tag-fg:${TAG_COLOR.light.fg};}` +
    // 파스텔을 다크 배경에 그대로 쓰면 붕괴한다 → bg/fg 를 뒤집은 2벌째
    `.dark{${dark}--tag-bg:${TAG_COLOR.dark.bg};--tag-fg:${TAG_COLOR.dark.fg};}`
  );
}
