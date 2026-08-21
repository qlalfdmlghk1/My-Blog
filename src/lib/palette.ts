/**
 * 카테고리에 배정할 수 있는 색 슬롯 — 12개 고정.
 *
 * ── 왜 자유 색상이 아니라 슬롯인가 ──
 * 카테고리는 이제 관리 화면에서 만든다. 색까지 컬러피커로 열어두면 한 색마다
 * 라이트 배경 · 라이트 글자 · 다크 배경 · 다크 글자 네 값을 사람이 직접 맞춰야 하고,
 * 그중 하나만 어긋나도 다크 모드에서 글자가 안 읽힌다. 슬롯은 그 네 값이 이미
 * 짝지어진 단위라, 무엇을 고르든 대비가 깨지지 않는다.
 * (실측 대비 — 라이트 8.05:1 ~ 9.68:1, 다크 6.27:1 ~ 7.12:1. 기준은 WCAG AA 4.5:1)
 *
 * 부수 효과가 하나 더 있다. 슬롯 목록이 정적이라 CSS 변수를 빌드 시점에 전부
 * 깔아둘 수 있다 — 카테고리가 런타임에 생겨도 색을 주입할 필요가 없고,
 * 루트 레이아웃이 Firestore 조회에 엮이지 않는다.
 *
 * 앞 6개는 v1 의 카테고리 색을 그대로 옮긴 값이다 (기존 글의 색이 바뀌지 않는다).
 *
 * 파스텔은 배경에만, 글자는 같은 계열의 진한 값 —
 * 연한 배경 + 회색 글자는 대비 미달이고 A11y 95+ 목표와 직결된다.
 */
export const PALETTE = [
  { id: 'coral', name: '코랄', light: { bg: '#FAECE7', fg: '#712B13' }, dark: { bg: '#712B13', fg: '#F5C4B3' } },
  { id: 'blue', name: '블루', light: { bg: '#E6F1FB', fg: '#0C447C' }, dark: { bg: '#0C447C', fg: '#B5D4F4' } },
  { id: 'purple', name: '퍼플', light: { bg: '#EEEDFE', fg: '#3C3489' }, dark: { bg: '#3C3489', fg: '#CECBF6' } },
  { id: 'amber', name: '앰버', light: { bg: '#FAEEDA', fg: '#633806' }, dark: { bg: '#633806', fg: '#FAC775' } },
  { id: 'teal', name: '틸', light: { bg: '#E1F5EE', fg: '#085041' }, dark: { bg: '#085041', fg: '#9FE1CB' } },
  { id: 'pink', name: '핑크', light: { bg: '#FBEAF0', fg: '#72243E' }, dark: { bg: '#72243E', fg: '#F4C0D1' } },
  { id: 'lime', name: '라임', light: { bg: '#EDF4E1', fg: '#3B4F14' }, dark: { bg: '#3B4F14', fg: '#CFE3AC' } },
  { id: 'cyan', name: '시안', light: { bg: '#E2F2F8', fg: '#0B4557' }, dark: { bg: '#0B4557', fg: '#AFDCEC' } },
  { id: 'rose', name: '로즈', light: { bg: '#FBEAEA', fg: '#7A2222' }, dark: { bg: '#7A2222', fg: '#F3C2C2' } },
  { id: 'indigo', name: '인디고', light: { bg: '#E8ECFB', fg: '#22367F' }, dark: { bg: '#22367F', fg: '#C0CCF3' } },
  { id: 'brown', name: '브라운', light: { bg: '#F3EDE6', fg: '#5A3D20' }, dark: { bg: '#5A3D20', fg: '#DECBB4' } },
  { id: 'slate', name: '슬레이트', light: { bg: '#ECEFF3', fg: '#333C48' }, dark: { bg: '#333C48', fg: '#C6CDD7' } },
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
