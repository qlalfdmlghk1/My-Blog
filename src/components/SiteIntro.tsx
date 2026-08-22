import { SITE } from '@/lib/site';

/**
 * 홈 상단 소개 — 처음 온 사람에게 "여기가 뭐 하는 곳인지" 한 화면에 알린다.
 *
 * SITE.description 은 메타태그로만 쓰이고 화면에는 어디에도 없었다.
 * 검색 결과에는 보이는데 정작 사이트에 오면 이름 한 줄뿐인 상태였다.
 *
 * 색은 쓰지 않는다 — 색은 분류(카테고리)에만 등장한다는 원칙을 지킨다.
 * 위계는 크기와 굵기로만 만든다.
 */
export function SiteIntro() {
  return (
    <section className="border-b border-line pb-8">
      <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">{SITE.name}</h1>
      <p className="mt-2.5 max-w-prose text-sm leading-relaxed text-ink-dim sm:text-base">
        {SITE.description}
      </p>
    </section>
  );
}
