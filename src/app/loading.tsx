import { BaseballIcon } from '@/components/BaseballIcon';

/**
 * 페이지 전환 중 화면 — 루트 Suspense 경계의 fallback.
 *
 * 목록·글은 ISR 로 미리 만들어져 있어 대개 이 화면을 볼 새가 없다. 보이는 순간은
 * 재생성 직후나 느린 회선 정도라 길어야 1초 안팎이다. 그래서 진행률·안내문 같은 것은
 * 두지 않고, 야구공 하나가 구르는 것으로 "가고 있다"만 알린다.
 *
 * 문구는 `warming up` 하나다. 로딩 화면에 야구 표현을 굵게 넣으면 첫 화면부터
 * 야구 블로그로 읽히므로, 404 의 `not found` 와 같은 작은 라벨 자리에 단어 하나만
 * 바꿔 끼운다. 스크린리더에는 은유 없이 "불러오는 중"으로 읽힌다.
 *
 * 회전은 1.6초 한 바퀴 — Tailwind 기본 `animate-spin`(1초)은 굴러가는 공이 아니라
 * 돌아가는 톱니로 보인다. 동작 최소화 설정에서는 globals.css 의 전역 규칙이
 * 애니메이션을 사실상 멈추지만, 이 아이콘에는 `motion-reduce:animate-none` 을 한 번 더
 * 명시한다 — 전역 규칙은 지속 시간을 0.001ms 로 줄이는 방식이라 무한 반복 애니메이션은
 * 첫 프레임에 멈춰 있을 뿐 "꺼진" 것이 아니고, 전역 규칙을 손볼 때 이 공이 같이 도는
 * 일이 없어야 한다.
 *
 * 레이아웃 치수(max-w-prose · py-24)는 404 와 같다 — 전환 중 화면과 도착 화면의
 * 무게중심이 비슷해야 fallback 이 사라질 때 덜 튄다.
 */
export default function Loading() {
  return (
    <main
      id="main"
      role="status"
      aria-live="polite"
      className="mx-auto flex max-w-prose flex-col items-center px-5 py-24 sm:py-32"
    >
      <BaseballIcon
        aria-hidden
        className="size-8 animate-[spin_1.6s_linear_infinite] text-ink-dim motion-reduce:animate-none"
      />
      <p
        aria-hidden
        className="mt-4 text-[11px] font-bold uppercase tracking-[0.22em] text-ink-dim"
      >
        warming up
      </p>
      <span className="sr-only">불러오는 중</span>
    </main>
  );
}
