import Link from 'next/link';

/**
 * 404 화면.
 *
 * 이 화면에 오는 사람은 이미 한 번 실패한 상태다. 그래서 사과문을 길게 쓰는 대신
 * **다음 행동 두 개**를 크게 놓는다 — 글 목록과 용어 사전이 이 블로그가 가진
 * 전부이므로, 여기서 갈 수 있는 곳도 그 둘뿐이다.
 *
 * 숫자 404 는 화면의 중심 도형으로 쓴다. 크게 키우되 불투명도를 낮춰 뒤로 물리고,
 * 그 위에 작은 라벨을 겹친다. 색을 하나도 쓰지 않고 화면에 무게를 주는 방법이라
 * "색은 분류에만" 규칙과 부딪히지 않는다.
 *
 * 불투명도는 배경이 아니라 **장식 도형**에만 건다. 본문 글자에 걸면 대비가
 * WCAG 4.5:1 아래로 떨어진다 — 이 숫자는 aria-hidden 이라 읽히지 않는다.
 */
export default function NotFound() {
  return (
    <main
      id="main"
      className="mx-auto flex max-w-prose flex-col items-center px-5 py-24 text-center sm:py-32"
    >
      <div className="relative isolate flex items-center justify-center">
        <span
          aria-hidden
          className="select-none font-mono text-[6rem] font-bold leading-none tracking-tighter text-ink opacity-[0.06] sm:text-[8.5rem]"
        >
          404
        </span>
        <span className="absolute text-[11px] font-bold uppercase tracking-[0.22em] text-ink-dim">
          not found
        </span>
      </div>

      <h1 className="mt-6 text-[22px] font-bold tracking-tight sm:text-2xl">
        페이지를 찾을 수 없습니다
      </h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-dim">
        주소가 바뀌었거나, 글이 비공개(draft)로 되돌아갔을 수 있습니다.
        아래에서 다시 찾아보세요.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-lg border border-transparent bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg shadow-card transition-[background-color,box-shadow] duration-200 hover:bg-accent-hover hover:shadow-raise motion-reduce:transition-none"
        >
          글 목록으로
        </Link>
        <Link
          href="/dictionary"
          className="inline-flex items-center gap-1.5 rounded-lg border border-line px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-surface"
        >
          용어 사전
        </Link>
      </div>
    </main>
  );
}
