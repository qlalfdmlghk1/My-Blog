'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { PALETTE_IDS, type PaletteId } from '@/lib/palette';

/**
 * 클릭한 자리로 나비가 날아왔다 다시 날아가는 효과.
 *
 * ── 왜 나비인가 ──
 * 처음에는 조각이 사방으로 튀는 폭죽이었고, 다음에는 그 자리에서 피는 꽃이었다.
 * 둘 다 "터졌다 · 피었다"로 끝나는 제자리 효과라 클릭이 잦아지면 같은 자국이 겹쳤다.
 * 나비는 **밖에서 들어와 지나간다.** 오는 길과 가는 길이 매번 달라 연타해도 겹치지 않고,
 * 클릭한 지점은 나비가 잠깐 머무는 자리로 자연스럽게 짚어진다.
 *
 * ── 색을 어디서 가져오는가 ──
 * 임의의 색을 새로 들이지 않고 카테고리 팔레트 슬롯(`--pal-*-fg` · `--pal-*-bg`)에서
 * 뽑아 쓴다. "색은 분류에만" 규칙이 막으려던 것은 정체불명의 색이 화면에 늘어나 무엇이
 * 분류 표시인지 흐려지는 상황인데, 이 나비는 1.2초 뒤 사라지고 아무것도 가리키지
 * 않으므로 분류 표시와 경쟁하지 않는다.
 *
 * **한 번의 클릭에는 슬롯 하나만 쓴다.** 날개는 그 슬롯의 진한 색(fg), 날개 무늬는 같은
 * 슬롯의 옅은 색(bg)이다. 두 색은 팔레트에서 이미 대비가 맞춰진 한 쌍이라 어느 슬롯이
 * 뽑혀도 무늬가 날개에 묻히지 않고, 라이트·다크 두 벌이 함께 딸려 와 테마별로 색을
 * 따로 정할 필요가 없다. 몸통과 더듬이만 본문 색(`--text`)이다 — 몸까지 색을 칠하면
 * 나비가 아니라 색 얼룩으로 보인다.
 *
 * ── 라이브러리를 쓰지 않는 이유 ──
 * canvas-confetti 류는 이 효과 하나에 수십 KB 를 더한다. 나비 3마리를 인라인 SVG 로
 * 만들어 Web Animations API 로 굴리면 의존성이 0 이고, transform·opacity 만 움직이므로
 * 브라우저가 합성 단계에서 처리한다.
 *
 * ── 켜지지 않는 자리 ──
 * - `prefers-reduced-motion: reduce` — 매 클릭마다 화면을 가로지르는 움직임은 전정기관이
 *   민감한 사용자에게 부담이다(WCAG 2.3.3). 값이 세션 도중 바뀔 수 있어 클릭할 때마다 본다.
 * - 관리 화면과 로그인 — 글을 쓰고 발행하는 작업 화면이다. 저장 버튼을 누를 때마다
 *   나비가 날아들면 재미가 아니라 방해다(꽃 커서를 끄는 기준과 같다).
 * - 키보드로 활성화된 클릭(`detail === 0`) — 좌표가 (0, 0) 이라 화면 왼쪽 위 구석으로
 *   날아간다. 누른 자리가 아니면 효과의 의미가 없다.
 * - 글을 드래그해 고른 직후 — 이 블로그는 드래그 선택에 형광펜 색을 쓴다. 그 위를
 *   가로질러 날면 선택한 범위를 가린다.
 * - **무언가를 하는 클릭** — 링크·버튼·입력칸처럼 누르면 실제로 일이 벌어지는 자리다.
 *   누른 결과(페이지 이동 · 메뉴 열림 · 저장)에 눈이 가야 하는데 나비가 함께 날아오면
 *   시선이 갈린다. 링크는 특히 그 자리를 곧 떠나므로 나비가 반쯤 오다 잘린다.
 *   나비는 **아무 일도 일어나지 않는 클릭**에만 남긴다 — 여백이나 글 위를 눌렀을 때다.
 */

/**
 * 누르면 무언가 일어나는 요소들. 이 안(또는 그 자손)을 누르면 나비를 부르지 않는다.
 *
 * 태그 이름만으로 가르지 않고 `role` 까지 함께 보는 이유는, 스타일 때문에 `div` 로
 * 만든 뒤 `role="button"` 을 붙인 조작 요소가 흔하기 때문이다. 반대로 태그가 `button`
 * 이면 role 이 없어도 조작 요소다 — 두 축을 다 적어야 새는 자리가 없다.
 * `summary` 는 접기·펼치기(용어 사전의 필터)라 누르면 화면이 바뀐다.
 */
const INTERACTIVE_SELECTOR =
  'a, button, input, textarea, select, label, summary, [role="button"], [role="link"], [role="tab"], [role="menuitem"], [contenteditable="true"]';

/** 한 번에 날아오는 나비 수. 4마리부터는 무리로 보여 "한 마리가 왔다"는 맛이 사라진다 */
const BUTTERFLY_COUNT = 3;

/** 한 마리가 들어와 지나갈 때까지. 이보다 짧으면 날갯짓이 눈에 안 남는다 */
const FLIGHT_MS = 1200;

/** 날갯짓 한 번(폈다 접기). 사람이 '펄럭인다'로 읽는 하한이 대략 이 언저리다 */
const FLAP_MS = 150;

/**
 * 오른쪽 날개 하나. 위·아래 날개가 이어진 한 붓 모양이다.
 *
 * 위아래를 따로 그리면 20px 남짓한 크기에서는 둘 사이가 붙어 버려 두 장으로 안 보이고
 * 획만 늘어난다. 허리를 잘록하게 판 이 한 장이 작은 크기에서 나비로 가장 잘 읽힌다.
 * 왼쪽 날개는 이 좌표를 x 축으로 뒤집어 쓴다 — 두 벌을 따로 두면 한쪽만 고치게 된다.
 */
const WING_PATH =
  'M20 16 C 21.5 6.5 28 0.5 34 2.5 C 39.5 4.5 37 13 28.5 16 C 36 18.5 37.5 26 32.5 29 C 26.5 31.5 21 24.5 20 16 Z';

export function ClickButterflies() {
  const layerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const muted = pathname.startsWith('/admin') || pathname.startsWith('/login');

  useEffect(() => {
    if (muted) return;
    const layer = layerRef.current;
    if (!layer) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    function handleClick(event: MouseEvent) {
      if (!layer) return;
      // 주 버튼만 — 가운데 클릭(새 탭)·오른쪽 클릭(메뉴)에는 반응하지 않는다
      if (event.button !== 0) return;
      if (event.detail === 0) return;
      if (reduced.matches) return;

      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) return;

      // 누른 지점이 조작 요소 **안**인지를 본다. `event.target` 자신만 검사하면
      // 버튼 안의 아이콘이나 링크 안의 글자를 눌렀을 때 그 자식이 target 이 되어
      // 그대로 통과한다. closest() 는 조상까지 거슬러 올라가 그 경우를 막는다.
      const target = event.target;
      if (target instanceof Element && target.closest(INTERACTIVE_SELECTOR)) return;

      release(layer, event.clientX, event.clientY);
    }

    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('click', handleClick);
      // 날던 나비를 남기지 않는다 — 라우트가 바뀌어도 레이어는 살아 있다
      layer.replaceChildren();
    };
  }, [muted]);

  // 나비는 뷰포트 좌표(clientX/Y)에 놓이므로 레이어도 fixed 여야 한다.
  // pointer-events 를 끄지 않으면 이 레이어가 화면 전체의 클릭을 삼킨다.
  return (
    <div
      ref={layerRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[100] overflow-hidden"
    />
  );
}

function release(layer: HTMLElement, x: number, y: number) {
  // 슬롯은 클릭마다 하나만 뽑는다 — 마리마다 다른 색이면 나비가 아니라 색종이 조각이다.
  // 마지막 `?? PALETTE_IDS[0]` 은 인덱스 접근이 undefined 를 낼 수 있다는 타입 규칙
  // (noUncheckedIndexedAccess) 때문이고, 실제로는 목록이 비지 않아 닿지 않는다.
  const paletteId: PaletteId =
    PALETTE_IDS[Math.floor(Math.random() * PALETTE_IDS.length)] ?? PALETTE_IDS[0]!;
  // 세 마리가 같은 쪽에서 오면 한 덩어리로 보인다. 원을 등분해 나눠 두고 각도만 흔든다.
  const baseAngle = Math.random() * Math.PI * 2;

  for (let i = 0; i < BUTTERFLY_COUNT; i += 1) {
    const angle = baseAngle + ((Math.PI * 2) / BUTTERFLY_COUNT) * i + (Math.random() - 0.5) * 0.7;
    layer.append(makeButterfly(paletteId, x, y, angle, i));
  }
}

/**
 * 나비 한 마리.
 *
 * 바깥 span 이 비행을 맡고 안쪽 SVG 의 날개 두 장이 따로 펄럭인다. 두 움직임을 한
 * 요소에 겹치면 비행 경로의 transform 이 날갯짓을 덮어써 날개가 굳는다.
 */
function makeButterfly(
  paletteId: PaletteId,
  x: number,
  y: number,
  angle: number,
  index: number,
): HTMLElement {
  const el = document.createElement('span');
  const scale = 0.7 + Math.random() * 0.45;
  const width = 30 * scale;
  const height = 24 * scale;

  el.style.position = 'absolute';
  // 클릭 지점이 곧 도착점이다. 좌표를 여기 고정해 두고 이동은 transform 으로만 한다 —
  // left/top 을 움직이면 매 프레임 레이아웃이 다시 계산된다.
  el.style.left = `${x - width / 2}px`;
  el.style.top = `${y - height / 2}px`;
  el.style.width = `${width}px`;
  el.style.height = `${height}px`;
  el.style.willChange = 'transform, opacity';
  el.innerHTML = butterflySvg(paletteId);

  // 들어오는 거리. 화면 밖에서 출발시키면 도착까지 시간을 다 쓰고, 너무 가까우면
  // '날아왔다'가 아니라 '나타났다'가 된다.
  const distance = 110 + Math.random() * 70;
  const startX = Math.cos(angle) * distance;
  const startY = Math.sin(angle) * distance;
  // 경로가 직선이면 화살처럼 꽂힌다. 진행 방향의 수직으로 밀어 호를 만든다 —
  // 부호를 무작위로 뒤집어 어떤 마리는 위로, 어떤 마리는 아래로 돌아 들어온다.
  const bend = (60 + Math.random() * 50) * (Math.random() < 0.5 ? 1 : -1);
  const midX = startX * 0.45 + Math.sin(angle) * bend;
  const midY = startY * 0.45 - Math.cos(angle) * bend;
  // 떠날 때는 위로 빠진다. 왔던 길로 되돌아가면 되감기처럼 보인다.
  const exitX = (Math.random() - 0.5) * 90;
  const exitY = -70 - Math.random() * 50;
  const tilt = (Math.random() - 0.5) * 40;

  const animation = el.animate(
    [
      {
        transform: `translate(${startX}px, ${startY}px) rotate(${tilt}deg) scale(0.45)`,
        opacity: 0,
      },
      {
        transform: `translate(${midX}px, ${midY}px) rotate(${tilt * 0.5}deg) scale(0.85)`,
        opacity: 1,
        offset: 0.35,
      },
      // 클릭 지점에 닿는 순간. 여기서만 각도가 0 이라 나비가 바로 선다.
      { transform: 'translate(0px, 0px) rotate(0deg) scale(1)', opacity: 1, offset: 0.62 },
      {
        transform: `translate(${exitX * 0.4}px, ${exitY * 0.35}px) scale(0.95)`,
        opacity: 1,
        offset: 0.78,
      },
      {
        transform: `translate(${exitX}px, ${exitY}px) rotate(${-tilt}deg) scale(0.7)`,
        opacity: 0,
      },
    ],
    {
      duration: FLIGHT_MS,
      // 마리마다 출발을 어긋내 줄지어 오게 한다. 동시에 오면 세 마리가 한 덩어리다.
      delay: index * 110,
      // 들어올 때 빠르고 도착 언저리에서 느려진다 — 머무는 느낌은 이 감속에서 나온다
      easing: 'cubic-bezier(0.22, 0.9, 0.3, 1)',
      fill: 'both',
    },
  );

  // 날갯짓은 비행과 무관하게 계속 돈다. 접힘 정도와 박자를 마리마다 달리해
  // 세 마리가 같은 리듬으로 펄럭이지 않게 한다.
  const fold = 0.18 + Math.random() * 0.16;
  const flapMs = FLAP_MS + Math.random() * 60;
  for (const wing of el.querySelectorAll<SVGGElement>('[data-wing]')) {
    wing.animate([{ transform: 'scaleX(1)' }, { transform: `scaleX(${fold})` }], {
      duration: flapMs,
      direction: 'alternate',
      iterations: Infinity,
      easing: 'ease-in-out',
    });
  }

  animation.onfinish = () => el.remove();
  return el;
}

/**
 * 나비 그림.
 *
 * 날개는 각각 두 겹의 `g` 로 감싼다. 바깥은 왼쪽 날개를 만드는 좌우 반전(속성
 * transform), 안쪽은 날갯짓(CSS transform)이다. 한 요소에 두 변형을 겹치면 CSS 쪽이
 * 속성 쪽을 통째로 덮어써 반전이 풀리고 두 날개가 같은 방향을 본다.
 *
 * 안쪽 `g` 에 `transform-box: fill-box` 를 주면 확대·축소의 기준이 그 날개의 경계
 * 상자가 된다. 그래서 좌우 어느 쪽이든 `transform-origin: 0% 50%` 하나로 "몸통에
 * 붙은 안쪽 끝"을 가리킬 수 있다 — 반전된 좌표계에서도 안쪽 끝은 여전히 x 가 가장
 * 작은 자리이기 때문이다.
 */
function butterflySvg(paletteId: PaletteId): string {
  const wingStyle = `fill: var(--pal-${paletteId}-fg)`;
  const markStyle = `fill: var(--pal-${paletteId}-bg)`;
  const pivot = 'transform-box: fill-box; transform-origin: 0% 50%';
  const wing = `
    <g data-wing style="${pivot}">
      <path d="${WING_PATH}" style="${wingStyle}" />
      <circle cx="31" cy="8.5" r="2.4" style="${markStyle}" />
      <circle cx="29.5" cy="24" r="1.7" style="${markStyle}" />
    </g>`;

  return `<svg viewBox="0 0 40 32" width="100%" height="100%" fill="none">
    <g transform="translate(40 0) scale(-1 1)">${wing}</g>
    <g>${wing}</g>
    <path
      d="M19.2 10.5 C 17.5 6.5 15.5 4.5 13.5 3.8 M20.8 10.5 C 22.5 6.5 24.5 4.5 26.5 3.8"
      stroke="var(--text)" stroke-width="1.1" stroke-linecap="round" fill="none" opacity="0.75" />
    <ellipse cx="20" cy="16.5" rx="1.35" ry="7.2" fill="var(--text)" />
  </svg>`;
}
