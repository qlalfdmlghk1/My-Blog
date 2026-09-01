/**
 * 카테고리에 배정할 수 있는 색 슬롯 — 12개 고정.
 *
 * ── 왜 자유 색상이 아니라 슬롯인가 ──
 * 카테고리는 이제 관리 화면에서 만든다. 색까지 컬러피커로 열어두면 한 색마다
 * 라이트 배경 · 라이트 글자 · 다크 배경 · 다크 글자 네 값을 사람이 직접 맞춰야 하고,
 * 그중 하나만 어긋나도 다크 모드에서 글자가 안 읽힌다. 슬롯은 그 네 값이 이미
 * 짝지어진 단위라, 무엇을 고르든 대비가 깨지지 않는다.
 * (실측 대비 — 라이트 5.01:1 ~ 5.11:1, 다크 5.01:1 ~ 5.08:1. 기준은 WCAG AA 4.5:1)
 *
 * 부수 효과가 하나 더 있다. 슬롯 목록이 정적이라 CSS 변수를 빌드 시점에 전부
 * 깔아둘 수 있다 — 카테고리가 런타임에 생겨도 색을 주입할 필요가 없고,
 * 루트 레이아웃이 Firestore 조회에 엮이지 않는다.
 *
 * 파스텔은 배경에만, 글자는 같은 계열의 진한 값 —
 * 연한 배경 + 회색 글자는 대비 미달이고 A11y 95+ 목표와 직결된다.
 *
 * ── 대비 여유를 채도로 바꿨다 ──
 * 예전 값은 대비가 7:1 ~ 9.5:1 이었다. 기준(4.5:1)보다 한참 높은데, 그 여유는
 * 공짜로 생긴 것이 아니라 **채도를 낮추고 명도를 눌러서** 번 것이었다. 그래서
 * 배지를 여러 개 늘어놓으면 색이 전부 탁하게 가라앉아 보였다.
 *
 * 지금 값은 목표 대비를 5.0:1 로 낮추고, 남은 여유를 전부 채도로 돌린 결과다.
 * 색상각마다 OKLCH 에서 sRGB 색역 한계까지 채도를 밀어붙인 뒤, 대비 5.0 을
 * 넘길 때까지 명도만 움직여 뽑았다. 기준은 그대로 넘기면서 색은 맑아진다.
 *
 * 슬롯 **ID 는 그대로**라 기존 글의 카테고리 배정은 건드리지 않는다 — 같은 슬롯이
 * 다른 색을 낼 뿐이다.
 *
 * 값을 다시 만질 일이 생기면 두 가지를 함께 확인한다.
 *  1. bg·fg 쌍의 WCAG 명도 대비가 4.5:1 위인가.
 *  2. 다크 배경의 L* 가 화면의 면(globals.css `--surface`, L*=16.1)보다 위인가 —
 *     아래로 내려가면 배지가 화면에 파인 구멍처럼 보인다. 지금은 35.0 ~ 38.0 이다.
 */
export const PALETTE = [
  { id: 'coral', name: '코랄', light: { bg: '#FFF0EC', fg: '#C43008' }, dark: { bg: '#8B3A28', fg: '#FFC4B6' } },
  { id: 'blue', name: '블루', light: { bg: '#EBF5FF', fg: '#0069BF' }, dark: { bg: '#1C5894', fg: '#B8D9FF' } },
  { id: 'purple', name: '퍼플', light: { bg: '#F5F1FF', fg: '#7D4ACA' }, dark: { bg: '#5F468E', fg: '#DACAFF' } },
  { id: 'amber', name: '앰버', light: { bg: '#FFF1E1', fg: '#905C00' }, dark: { bg: '#784C00', fg: '#FFCC8B' } },
  { id: 'teal', name: '틸', light: { bg: '#D6FEEF', fg: '#00785E' }, dark: { bg: '#006650', fg: '#50F5C9' } },
  { id: 'pink', name: '핑크', light: { bg: '#FFEEF5', fg: '#BA2C7A' }, dark: { bg: '#85375D', fg: '#FFBFDA' } },
  { id: 'lime', name: '라임', light: { bg: '#E8FADB', fg: '#447400' }, dark: { bg: '#3D6313', fg: '#B2EC81' } },
  { id: 'cyan', name: '시안', light: { bg: '#E1F8FF', fg: '#007288' }, dark: { bg: '#006174', fg: '#8EE7FF' } },
  { id: 'rose', name: '로즈', light: { bg: '#FFEFEF', fg: '#C42942' }, dark: { bg: '#8B373E', fg: '#FFC2C3' } },
  { id: 'indigo', name: '인디고', light: { bg: '#F0F3FF', fg: '#5358D6' }, dark: { bg: '#464E95', fg: '#C8D1FF' } },
  { id: 'brown', name: '브라운', light: { bg: '#FFF1E6', fg: '#8F5D35' }, dark: { bg: '#6D503A', fg: '#FACDAC' } },
  { id: 'slate', name: '슬레이트', light: { bg: '#F1F4F7', fg: '#5F6875' }, dark: { bg: '#52575E', fg: '#CED7E2' } },
] as const;

export type PaletteSlot = (typeof PALETTE)[number];
export type PaletteId = PaletteSlot['id'];

export const PALETTE_IDS = PALETTE.map((p) => p.id) as readonly PaletteId[];

const BY_ID = new Map<string, PaletteSlot>(PALETTE.map((p) => [p.id, p]));

export function isPaletteId(v: unknown): v is PaletteId {
  return typeof v === 'string' && BY_ID.has(v);
}

/** 알 수 없는 슬롯은 첫 번째로 떨어뜨린다 — 색이 없어 배지가 사라지는 편이 더 나쁘다 */
export function getPaletteSlot(id: string): PaletteSlot {
  return BY_ID.get(id) ?? PALETTE[0];
}

/**
 * 라이트 모드 색쌍. CSS 변수를 쓸 수 없는 곳(OG 이미지 satori)에서 사용한다.
 */
export function paletteLightColor(id: string): { bg: string; fg: string } {
  return getPaletteSlot(id).light;
}
