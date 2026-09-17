/**
 * 커버가 없는 글의 자동 커버 — 카테고리 색 바탕에 둥근 도형 몇 개.
 *
 * 글마다 사진을 고르지 않아도 목록이 한 톤으로 보이게 하려는 장치다. 사진은 글마다
 * 색과 밀도가 제각각이라 나란히 놓으면 화면이 소란해지는데, 도형은 색이 카테고리
 * 팔레트로 고정되고 모양의 어휘도 넷뿐이라 어떤 글끼리 놓여도 같은 시리즈로 읽힌다.
 *
 * 배치는 slug 로 결정된다. 무작위로 뽑으면 재생성할 때마다 커버가 바뀌어 같은 글이
 * 홈과 카테고리 화면에서 다르게 보인다. 같은 slug 는 언제나 같은 그림이다.
 *
 * 구도는 자유롭지 않다 — 큰 도형 하나가 한쪽 모서리에 걸치고, 중간 것이 반대편에,
 * 작은 것이 그 사이에 놓인다. 위치와 크기만 slug 가 정한다. 이 제약이 "비슷한 깔"의
 * 실체다. 완전히 자유로우면 어떤 글은 텅 비고 어떤 글은 도형이 겹쳐 뭉개진다.
 *
 * 좌표계는 가로 160 · 세로 90 (16:9). 정사각형 썸네일은 가운데를 잘라 쓴다(SVG 의
 * preserveAspectRatio slice) — 큰 도형이 모서리에 걸쳐 있으니 잘라도 구도가 남는다.
 */

export type CoverShapeKind = 'circle' | 'square' | 'pill' | 'triangle';

export interface CoverShape {
  kind: CoverShapeKind;
  /** 중심 좌표 (viewBox 160×90 기준) */
  x: number;
  y: number;
  /** 한 변 또는 지름 */
  size: number;
  /** 회전 각도 (도) */
  rotate: number;
  opacity: number;
}

export const COVER_VIEWBOX = { width: 160, height: 90 } as const;

/** FNV-1a — 짧은 문자열을 32비트 정수로. 암호학적 성질은 필요 없고 분산만 있으면 된다 */
function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 — 시드 하나로 0 이상 1 미만의 수열을 만든다 */
function seededRandom(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const KINDS: CoverShapeKind[] = ['circle', 'square', 'pill', 'triangle'];

/** 큰 도형이 걸치는 네 모서리 — 조금 밖으로 나가야 잘린 느낌이 산다 */
const CORNERS = [
  { x: 128, y: 70 },
  { x: 32, y: 70 },
  { x: 128, y: 20 },
  { x: 32, y: 20 },
] as const;

function pick<T>(rand: () => number, items: readonly T[]): T {
  // 배열이 비어 있지 않은 상수 목록에만 쓰므로 인덱스는 항상 범위 안이다
  return items[Math.floor(rand() * items.length)] as T;
}

/** 소수 한 자리로 자른다 — 15자리 좌표는 HTML 만 부풀리고 화면에서는 구분되지 않는다 */
function between(rand: () => number, min: number, max: number): number {
  return Math.round((min + rand() * (max - min)) * 10) / 10;
}

/**
 * slug 하나로 도형 세 개를 만든다. 순서는 뒤에서 앞(큰 것 → 작은 것)이라
 * 그리는 쪽이 그대로 순서대로 그리면 작은 도형이 위에 올라온다.
 */
export function coverShapes(seed: string): CoverShape[] {
  const rand = seededRandom(hashString(seed));

  const cornerIndex = Math.floor(rand() * CORNERS.length);
  const corner = CORNERS[cornerIndex] ?? CORNERS[0];
  // 반대편: 가로로 맞은편, 세로는 같은 줄 — 대각선 반대까지 보내면 가운데가 빈다
  const opposite = { x: corner.x > 80 ? 46 : 114, y: corner.y };

  const large: CoverShape = {
    kind: pick(rand, KINDS),
    x: corner.x + between(rand, -8, 8),
    y: corner.y + between(rand, -6, 6),
    size: between(rand, 52, 64),
    rotate: between(rand, -20, 20),
    opacity: 0.9,
  };

  const medium: CoverShape = {
    kind: pick(rand, KINDS),
    x: opposite.x + between(rand, -12, 12),
    y: opposite.y + between(rand, -10, 10),
    size: between(rand, 24, 32),
    rotate: between(rand, -30, 30),
    opacity: 0.55,
  };

  // 작은 것은 큰 것과 중간 것 사이, 세로로는 반대쪽 줄에 — 세 점이 한 줄에 서지 않게
  const small: CoverShape = {
    kind: pick(rand, KINDS),
    x: Math.round(((large.x + medium.x) / 2 + between(rand, -10, 10)) * 10) / 10,
    y: corner.y > 45 ? between(rand, 16, 30) : between(rand, 60, 74),
    size: between(rand, 10, 15),
    rotate: between(rand, -45, 45),
    opacity: 0.35,
  };

  return [large, medium, small];
}
