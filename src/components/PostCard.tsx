import Link from 'next/link';

import { CategoryBadge } from '@/components/CategoryBadge';
import { CoverImage } from '@/components/CoverImage';
import { TagChip } from '@/components/TagChip';
import { formatDate } from '@/lib/date';
import type { Category } from '@/types/category';
import type { PostSummary } from '@/types/post';

export function PostCard({
  post,
  category,
}: {
  post: PostSummary;
  /** 이 글의 카테고리 — 목록 화면이 이미 읽어둔 것을 넘긴다 (배지가 직접 조회하지 않는다) */
  category?: Category | null;
}) {
  return (
    /**
     * 카드 어디를 눌러도 글로 들어간다 — 제목 글자만 링크였던 시절엔 과녁이 너무 좁았다.
     * 카드를 <div onClick> 으로 감싸는 대신 제목 <Link> 의 ::after 를 카드 전체로 늘린다
     * (stretched link). 링크는 여전히 하나뿐이라 새 탭 열기·스크린리더 링크 목록·
     * 키보드 포커스가 그대로 살아 있다.
     *
     * 카드 한 칸의 세로 리듬(32px)은 <article> 과 판이 반씩 나눠 갖는다. 판은 사방
     * 16px 로 균형을 맞추고, 남은 16px 이 판과 구분선 사이 숨 쉴 틈이 된다. 판에 세로
     * 여백을 다 몰아주면 색이 구분선에 딱 붙어 칸이 눌려 보인다.
     *
     * 구분선(border-b)은 <article> 에 남겨 둔다 — 판에 같이 걸면 좌우로 늘어난 만큼
     * 선도 길어져 위쪽 소개 영역의 선과 어긋난다.
     */
    <article className="group relative border-b border-line py-4 first:pt-0">
      {/*
        호버·키보드 포커스 시 이 판에 색이 깔리고 그림자가 붙는다 — 눌리는 범위가
        카드 한 칸임을 보여준다. 배경만으로는 목록이 길어질수록 어느 칸에 올라와 있는지
        흐려져서, 판이 살짝 떠오르게 두어 지금 겨냥한 칸을 분명히 한다.
        좌우로는 글 폭 밖까지 넓힌다(-mx). 좁은 화면에서는 바깥 여백이 20px 뿐이라
        16px 을 다 쓰면 화면 끝에 닿아 잘린 것처럼 보이므로 한 단계 줄여 둔다.

        ── 좁은 화면에서는 세로로 쌓는다 ──
        가로 배치를 그대로 두면 360px 에서 글자에 남는 폭이 240px 도 안 되어 제목이
        한 글자씩 떨어지고, 커버는 96px 짜리 우표만 해진다. 좁을 때는 커버를 카드 폭
        전부로 넓혀 위에 얹고 글자를 그 아래로 내린다. sm 부터는 지금까지의 가로 배치
        그대로다 — items-start 도 그때만 건다(커버는 w-full 이라 세로에서도 안 줄지만,
        글자 칸이 내용 높이로 줄어 판 안에서 위아래가 어긋난다).
      */}
      <div className="-mx-3 flex flex-col gap-3 rounded-xl px-3 py-4 transition-[background-color,box-shadow,transform] duration-200 group-hover:-translate-y-0.5 group-hover:bg-surface group-hover:shadow-card group-focus-within:bg-surface group-focus-within:shadow-card motion-reduce:transform-none motion-reduce:transition-none sm:-mx-4 sm:flex-row sm:items-start sm:gap-8 sm:px-4">
        {/*
          커버가 DOM 에서 글자보다 **먼저** 온다. 세로 배치에서 위에 놓여야 하기도 하지만,
          진짜 이유는 stretched link 의 겹침 순서다 — 제목 링크의 ::after 와 커버는 둘 다
          위치 지정 요소라 z-index 가 없으면 DOM 순서대로 쌓인다. 커버가 뒤에 있으면 커버가
          링크 위를 덮어 그 자리만 눌리지 않는데, 세로 배치에서는 그 면적이 카드의 절반이다.
          커버는 장식(alt="" · aria-hidden)이라 읽는 순서가 앞당겨져도 잃는 것이 없다.
          가로 배치에서의 좌우는 order 로 되돌린다.

          다만 DOM 순서만으로는 절반만 해결된다 — flex 는 **order 가 반영된 순서**로 칠하므로
          sm 이상에서 커버가 sm:order-2 가 되는 순간 다시 링크 위로 올라간다. 그래서 링크
          ::after 에 z-[1] 을 박아 폭과 무관하게 항상 위에 오게 한다. 태그 칩은 z-10 이라
          여전히 그 위에 있고(각자 다른 곳으로 가는 링크라 덮이면 안 된다),
          CategoryBadge 는 span 이라 덮여도 잃는 것이 없다.
        */}
        <CoverImage
          src={post.coverImage}
          seed={post.slug}
          category={category}
          className="aspect-[16/9] w-full shrink-0 rounded-xl sm:order-2 sm:w-56"
        />

        {/* 글자 쪽이 남는 폭을 다 갖는다. min-w-0 이 없으면 긴 제목이 줄바꿈하지 않고
            커버를 판 밖으로 밀어낸다. */}
        <div className="min-w-0 flex-1 sm:order-1">
          <div className="mb-2.5 flex items-center gap-2.5">
            <CategoryBadge slug={post.category} category={category} size="sm" />
            <time
              dateTime={post.publishedAt ?? undefined}
              className="text-xs text-ink-dim tabular-nums"
            >
              {formatDate(post.publishedAt)}
            </time>
          </div>

          {/* break-keep 은 공백에서만 끊는다 — 긴 URL 같은 무공백 토큰이 제목에 있으면
              줄바꿈 대신 판 밖으로 삐져나가 화면에 가로 스크롤이 생긴다. anywhere 를 같이 걸어
              끊을 곳이 없을 때만 강제로 끊게 둔다(한국어 낱말 보호는 break-keep 이 그대로 한다). */}
          <h2 className="break-keep [overflow-wrap:anywhere] text-xl font-bold leading-snug tracking-tight">
            {/* 가로 폭은 판과 정확히 맞춘다 — 색은 깔리는데 눌리지는 않는 띠가 생기지 않게 */}
            <Link
              href={`/posts/${post.slug}`}
              className="after:absolute after:-inset-x-3 after:inset-y-0 after:z-[1] after:content-[''] sm:after:-inset-x-4"
            >
              {post.title}
            </Link>
          </h2>

          {post.excerpt && (
            <p className="mt-2 line-clamp-2 break-keep text-sm leading-relaxed text-ink-dim">
              {post.excerpt}
            </p>
          )}

          {/* 태그는 각자 다른 곳으로 가는 링크다 — 늘어난 제목 링크에 덮이지 않게 위로 올린다 */}
          {post.tags.length > 0 && (
            <div className="relative z-10 mt-3 flex flex-wrap gap-1.5">
              {post.tags.map((t) => (
                <TagChip key={t} tag={t} href={`/tags/${encodeURIComponent(t)}`} />
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
