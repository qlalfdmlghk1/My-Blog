'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { PALETTE_IDS, type PaletteId } from '@/lib/palette';

/**
 * 클릭한 자리로 공이 날아와 맞고 튕겨 나가는 효과 — 투구와 타구.
 *
 * ── 왜 야구공인가 ──
 * 이 자리는 폭죽 → 꽃 → 나비를 거쳤다. 나비에서 배운 것은 **밖에서 들어와 지나가는**
 * 효과여야 연타해도 자국이 겹치지 않는다는 점이었다. 야구는 그 구조를 그대로 갖고
 * 있다 — 공이 화면 밖에서 클릭 지점으로 날아오고(투구), 닿는 순간 방향이 꺾여 위로
 * 빠져나간다(타구). 클릭한 자리가 곧 배트가 공을 만난 자리다. 나비 세 마리 대신 공
 * 하나다 — 공이 여럿이면 투구가 아니라 우박이다.
 *
 * ── 색을 어디서 가져오는가 ──
 * 공 자체는 무채색이다(면은 바탕색, 윤곽은 글자색). 실밥에만 카테고리 팔레트 슬롯
 * (`--pal-*-fg`)의 색을 입힌다. "색은 분류에만" 규칙이 막으려던 것은 정체불명의 색이
 * 화면에 늘어나 무엇이 분류 표시인지 흐려지는 상황인데, 이 공은 1초 뒤 사라지고
 * 아무것도 가리키지 않으므로 분류 표시와 경쟁하지 않는다. 슬롯은 클릭마다 하나만 뽑는다.
 *
 * ── 두 움직임을 나누는 이유 ──
 * 바깥 span 이 비행(경로·크기·투명도)을 맡고 안쪽 SVG 가 회전을 맡는다. 한 요소에
 * 겹치면 비행 경로의 transform 이 회전을 덮어써 공이 굳은 채 미끄러진다.
 *
 * ── 라이브러리를 쓰지 않는 이유 ──
 * 인라인 SVG 하나를 Web Animations API 로 굴리면 의존성이 0 이고, transform·opacity 만
 * 움직이므로 브라우저가 합성 단계에서 처리한다.
 *
 * ── 켜지지 않는 자리 ──
 * - `prefers-reduced-motion: reduce` — 매 클릭마다 화면을 가로지르는 움직임은 전정기관이
 *   민감한 사용자에게 부담이다(WCAG 2.3.3). 값이 세션 도중 바뀔 수 있어 클릭할 때마다 본다.
 * - 관리 화면과 로그인 — 글을 쓰고 발행하는 작업 화면이다. 저장 버튼을 누를 때마다
 *   공이 날아들면 재미가 아니라 방해다(야구공 커서를 끄는 기준과 같다).
 * - 키보드로 활성화된 클릭(`detail === 0`) — 좌표가 (0, 0) 이라 화면 왼쪽 위 구석으로
 *   날아간다. 누른 자리가 아니면 효과의 의미가 없다.
 * - 글을 드래그해 고른 직후 — 이 블로그는 드래그 선택에 형광펜 색을 쓴다. 그 위를
 *   가로질러 날면 선택한 범위를 가린다.
 * - **무언가를 하는 클릭** — 링크·버튼·입력칸처럼 누르면 실제로 일이 벌어지는 자리다.
 *   누른 결과(페이지 이동 · 메뉴 열림 · 저장)에 눈이 가야 하는데 공이 함께 날아오면
 *   시선이 갈린다. 링크는 특히 그 자리를 곧 떠나므로 공이 반쯤 오다 잘린다.
 *   공은 **아무 일도 일어나지 않는 클릭**에만 남긴다 — 여백이나 글 위를 눌렀을 때다.
 */

/**
 * 누르면 무언가 일어나는 요소들. 이 안(또는 그 자손)을 누르면 공을 부르지 않는다.
 *
 * 태그 이름만으로 가르지 않고 `role` 까지 함께 보는 이유는, 스타일 때문에 `div` 로
 * 만든 뒤 `role="button"` 을 붙인 조작 요소가 흔하기 때문이다. 반대로 태그가 `button`
 * 이면 role 이 없어도 조작 요소다 — 두 축을 다 적어야 새는 자리가 없다.
 * `summary` 는 접기·펼치기(용어 사전의 필터)라 누르면 화면이 바뀐다.
 */
const INTERACTIVE_SELECTOR =
  'a, button, input, textarea, select, label, summary, [role="button"], [role="link"], [role="tab"], [role="menuitem"], [contenteditable="true"]';

/** 들어와서 맞고 나갈 때까지. 이보다 짧으면 "맞았다"가 아니라 "지나갔다"로 보인다 */
const FLIGHT_MS = 950;

/** 공이 클릭 지점에 닿는 시점(0~1). 투구가 타구보다 길어야 기다렸다 치는 맛이 난다 */
const CONTACT_AT = 0.5;

/** 한 바퀴 도는 시간. 실제 투구 회전은 이보다 빠르지만, 그러면 실밥이 뭉개져 공으로 안 보인다 */
const SPIN_MS = 420;

/** 공 지름(px). 나비(30px)보다 작다 — 공은 한 개라 크면 클릭 지점을 통째로 가린다 */
const BALL_PX = 22;

export function ClickBaseball() {
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

      layer.append(makeBall(event.clientX, event.clientY));
    }

    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('click', handleClick);
      // 날던 공을 남기지 않는다 — 라우트가 바뀌어도 레이어는 살아 있다
      layer.replaceChildren();
    };
  }, [muted]);

  // 공은 뷰포트 좌표(clientX/Y)에 놓이므로 레이어도 fixed 여야 한다.
  // pointer-events 를 끄지 않으면 이 레이어가 화면 전체의 클릭을 삼킨다.
  return (
    <div
      ref={layerRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[100] overflow-hidden"
    />
  );
}

/**
 * 공 하나 — 투구와 타구를 한 애니메이션에 담는다.
 *
 * 들어오는 길은 **직선**이다. 나비는 호를 그렸지만 공은 던진 것이라 휘면 안 된다
 * (변화구까지 흉내 내면 궤적이 매번 달라 "던졌다"로 안 읽힌다). 대신 나가는 길은
 * 위로 꺾여 포물선 꼭대기에서 사라진다 — 관중석으로 넘어가는 타구다.
 *
 * 들어오는 방향은 아래쪽 반원에서만 고른다. 위에서 떨어지는 공은 투구가 아니라
 * 낙하이고, 나가는 방향이 위쪽이라 위에서 오면 되감기처럼 보인다.
 */
function makeBall(x: number, y: number): HTMLElement {
  // 슬롯은 클릭마다 하나만 뽑는다. 마지막 `?? PALETTE_IDS[0]` 은 인덱스 접근이 undefined 를
  // 낼 수 있다는 타입 규칙(noUncheckedIndexedAccess) 때문이고, 실제로는 목록이 비지 않아 닿지 않는다.
  const paletteId: PaletteId =
    PALETTE_IDS[Math.floor(Math.random() * PALETTE_IDS.length)] ?? PALETTE_IDS[0]!;

  const el = document.createElement('span');
  el.style.position = 'absolute';
  // 클릭 지점이 곧 접점이다. 좌표를 여기 고정해 두고 이동은 transform 으로만 한다 —
  // left/top 을 움직이면 매 프레임 레이아웃이 다시 계산된다.
  el.style.left = `${x - BALL_PX / 2}px`;
  el.style.top = `${y - BALL_PX / 2}px`;
  el.style.width = `${BALL_PX}px`;
  el.style.height = `${BALL_PX}px`;
  el.style.willChange = 'transform, opacity';
  el.innerHTML = ballSvg(paletteId);

  // 아래쪽 반원(0 ~ π, 화면 좌표라 y 가 아래로 증가)에서 들어온다. 양 끝(수평)은 조금
  // 잘라 낸다 — 정확히 옆에서 오면 나가는 방향(위)과 90° 라 꺾임이 어색하다.
  const angle = Math.PI * (0.15 + Math.random() * 0.7);
  // 들어오는 거리. 화면 밖에서 출발시키면 도착까지 시간을 다 쓰고, 너무 가까우면
  // '날아왔다'가 아니라 '나타났다'가 된다.
  const distance = 150 + Math.random() * 80;
  const startX = Math.cos(angle) * distance;
  const startY = Math.sin(angle) * distance;
  // 나가는 방향: 들어온 쪽의 반대편 위. 정확히 반대(되튕김)가 아니라 위로 더 꺾는다 —
  // 배트에 맞은 공은 온 길로 돌아가지 않고 떠오른다.
  const exitX = -Math.cos(angle) * (90 + Math.random() * 60) + (Math.random() - 0.5) * 40;
  const exitPeakY = -(110 + Math.random() * 50);

  const animation = el.animate(
    [
      {
        transform: `translate(${startX}px, ${startY}px) scale(0.55)`,
        opacity: 0,
      },
      {
        transform: `translate(${startX * 0.7}px, ${startY * 0.7}px) scale(0.7)`,
        opacity: 1,
        offset: 0.12,
      },
      // 접점. 여기서 가장 크다 — 가까이 온 공이 눈앞을 지나는 순간이다.
      { transform: 'translate(0px, 0px) scale(1)', opacity: 1, offset: CONTACT_AT },
      {
        transform: `translate(${exitX * 0.55}px, ${exitPeakY * 0.75}px) scale(0.8)`,
        opacity: 1,
        offset: CONTACT_AT + 0.22,
      },
      {
        transform: `translate(${exitX}px, ${exitPeakY}px) scale(0.35)`,
        opacity: 0,
      },
    ],
    {
      duration: FLIGHT_MS,
      // 접점까지는 등속에 가깝게(던진 공은 감속하지 않는다), 맞은 뒤에는 빠르게 튀어
      // 나가며 멀어질수록 느려진다. 구간마다 easing 을 달리 주지 못하는 API 라 전체를
      // 완만한 곡선 하나로 두고, 키프레임 간격으로 속도감을 만든다.
      easing: 'cubic-bezier(0.3, 0.6, 0.35, 1)',
      fill: 'both',
    },
  );

  // 회전은 비행과 무관하게 계속 돈다. 방향은 들어오는 쪽에 맞춘다 — 오른쪽에서 온 공이
  // 시계 방향으로 돌면 굴러오는 것이 아니라 뒤로 미끄러지는 것처럼 보인다.
  const spin = el.querySelector<SVGSVGElement>('svg');
  if (spin) {
    const clockwise = startX < 0;
    spin.animate(
      [{ transform: 'rotate(0deg)' }, { transform: `rotate(${clockwise ? 360 : -360}deg)` }],
      { duration: SPIN_MS, iterations: Infinity, easing: 'linear' },
    );
  }

  animation.onfinish = () => el.remove();
  return el;
}

/**
 * 공 그림 — components/BaseballIcon.tsx 와 같은 좌표다.
 *
 * 다른 점은 둘이다. ① 채운다 — 글자 위를 지나가므로 속이 비면 공으로 안 읽힌다.
 * ② 실밥에 팔레트 색을 입힌다(위 "색을 어디서 가져오는가"). 아이콘 컴포넌트를 그대로
 * 쓰지 않는 이유는 이 파일이 문자열로 innerHTML 에 넣는 구조라서다 — React 렌더로
 * 바꾸면 클릭마다 상태를 만들어야 하고, 그 리렌더가 본문까지 번진다.
 */
function ballSvg(paletteId: PaletteId): string {
  const seam = `stroke: var(--pal-${paletteId}-fg)`;
  const tick = (x: number, y: number, r: number) =>
    `<line x1="-1.6" x2="1.6" transform="translate(${x} ${y}) rotate(${r})" />`;
  const ticks = [
    [11.56, 11.6, -18],
    [12.64, 15.8, -10],
    [13, 20, 0],
    [12.64, 24.2, 10],
    [11.56, 28.4, 18],
  ] as const;
  const left = ticks.map(([x, y, r]) => tick(x, y, r)).join('');
  const right = ticks.map(([x, y, r]) => tick(40 - x, y, -r)).join('');

  return `<svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" stroke-linecap="round" style="display:block">
    <circle cx="20" cy="20" r="17.5" fill="var(--bg)" stroke="var(--text)" stroke-width="2" />
    <g stroke-width="2" style="${seam}">
      <path d="M 9 6 Q 17 20 9 34" /><path d="M 31 6 Q 23 20 31 34" />
      ${left}${right}
    </g>
  </svg>`;
}
