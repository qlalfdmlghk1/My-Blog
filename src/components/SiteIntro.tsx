import type { CSSProperties } from 'react';

import { SITE } from '@/lib/site';

/**
 * 홈 상단 소개 — 처음 온 사람에게 "여기가 뭐 하는 곳인지" 한 화면에 알린다.
 *
 * SITE.description 은 메타태그로만 쓰이고 화면에는 어디에도 없었다.
 * 검색 결과에는 보이는데 정작 사이트에 오면 이름 한 줄뿐인 상태였다.
 *
 * ── 회색 판을 걷어냈다 ──
 * 한동안 이 자리를 `bg-surface` 라운드 판으로 감쌌다. 아래 글 카드가 전부 배경 없는
 * 목록이라 시작점을 만들어 준다는 생각이었는데, 실제로는 넓고 납작한 회색 덩어리가 되어
 * 카드가 아니라 아직 안 채운 빈 자리처럼 보였다. 오른쪽 절반이 비는 것도 판이 가로를
 * 다 차지해서 생긴 문제였다.
 *
 * 시작점은 판이 아니라 **글자 크기**로 만든다. 제목을 목록의 어떤 글자보다 크게 두면
 * 배경색 없이도 위계가 선다. 아래 구분선이 소개와 목록의 경계를 맡는다.
 *
 * 오른쪽 여백은 숫자로 채운다. 장식을 넣는 대신 이 블로그가 지금 얼마나 쌓였는지를
 * 보여주는 편이, 처음 온 사람이 더 볼지 말지 정하는 데 실제로 쓸모가 있다.
 *
 * 색은 제목 끝의 마침표 하나뿐이다. 나머지는 무채색으로 두어 "색은 분류에만" 규칙을
 * 지킨다 — 마침표는 아무것도 가리키지 않는 표식이라 분류 표시와 경쟁하지 않는다.
 */
export function SiteIntro({
  postCount,
  categoryCount,
  tagCount,
}: {
  /** 발행된 글 전체 수 — 홈 목록이 이미 집계한 값을 넘겨받는다 (여기서 조회하지 않는다) */
  postCount: number;
  categoryCount: number;
  tagCount: number;
}) {
  return (
    <section className="border-b border-line pb-9">
      {/* 세 줄이 60ms 씩 어긋나며 올라온다. 간격을 이보다 벌리면 제목을 읽고 나서
          설명이 뒤늦게 따라붙는 것처럼 보여 한 덩어리로 안 읽힌다. */}
      <h1 className="rise text-[32px] font-bold leading-[1.15] tracking-tight sm:text-[40px]">
        {SITE.name}
        {/* 제비꽃 마침표 하나 — 이름을 문장처럼 끝맺어 로고 구실을 한다.
            aria-hidden 이라 스크린리더는 사이트 이름만 읽는다. */}
        <span aria-hidden className="text-accent">
          .
        </span>
      </h1>

      <p
        className="rise mt-3.5 max-w-prose text-[15px] leading-relaxed text-ink-dim sm:text-base"
        style={{ '--rise-delay': '60ms' } as CSSProperties}
      >
        {SITE.description}
      </p>

      {/* 글이 하나도 없으면 숫자를 감춘다 — 0 을 세 번 늘어놓아 봐야 빈 상태만 강조된다.
          바로 아래에 "아직 발행된 글이 없습니다" 안내가 따로 나온다. */}
      {postCount > 0 && (
        <dl
          className="rise mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-ink-dim"
          style={{ '--rise-delay': '120ms' } as CSSProperties}
        >
          <Stat label="글" value={postCount} unit="편" />
          <Stat label="분류" value={categoryCount} unit="개" />
          <Stat label="태그" value={tagCount} unit="개" />
        </dl>
      )}
    </section>
  );
}

/** 라벨과 숫자를 한 덩어리로 — 숫자만 본문 색으로 올려 시선이 수에 먼저 닿게 한다 */
function Stat({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt>{label}</dt>
      <dd className="font-bold tabular-nums text-ink">
        {value}
        <span className="ml-0.5 font-normal text-ink-dim">{unit}</span>
      </dd>
    </div>
  );
}
