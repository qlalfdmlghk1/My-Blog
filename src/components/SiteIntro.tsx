import { SITE } from '@/lib/site';

/**
 * 홈 상단 소개 — 처음 온 사람에게 "여기가 뭐 하는 곳인지" 한 화면에 알린다.
 *
 * SITE.description 은 메타태그로만 쓰이고 화면에는 어디에도 없었다.
 * 검색 결과에는 보이는데 정작 사이트에 오면 이름 한 줄뿐인 상태였다.
 *
 * 색은 쓰지 않는다 — 색은 분류(카테고리)에만 등장한다는 원칙을 지킨다.
 * 위계는 크기 · 굵기 · 면(surface)으로만 만든다.
 *
 * 밑줄 하나였던 구분을 옅은 판으로 바꿨다. 아래로 이어지는 글 카드가 전부
 * 배경색 없는 목록이라, 소개까지 같은 바탕이면 첫 화면에 시작점이 보이지 않는다.
 * 판 위쪽의 점 세 개는 헤더 로고와 같은 표식이다 — 같은 모티프를 반복해
 * 장식을 새로 들이지 않고 브랜드를 잇는다.
 */
export function SiteIntro() {
  return (
    <section className="rounded-2xl border border-line bg-surface px-5 py-7 shadow-card sm:px-7 sm:py-8">
      <span aria-hidden className="flex items-center gap-1.5">
        <span className="size-1.5 rounded-full bg-ink" />
        <span className="size-1.5 rounded-full bg-ink opacity-40" />
        <span className="size-1.5 rounded-full bg-ink opacity-20" />
      </span>
      <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-[30px]">
        {SITE.name}
      </h1>
      <p className="mt-2.5 max-w-prose text-sm leading-relaxed text-ink-dim sm:text-base">
        {SITE.description}
      </p>
    </section>
  );
}
