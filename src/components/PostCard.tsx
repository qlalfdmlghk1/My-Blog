import Link from 'next/link';

import { CategoryBadge } from '@/components/CategoryBadge';
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
        호버·키보드 포커스 시 이 판에 색이 깔린다 — 눌리는 범위가 카드 한 칸임을 보여준다.
        좌우로는 글 폭 밖까지 넓힌다(-mx). 좁은 화면에서는 바깥 여백이 20px 뿐이라
        16px 을 다 쓰면 화면 끝에 닿아 잘린 것처럼 보이므로 한 단계 줄여 둔다.
      */}
      <div className="-mx-3 rounded-xl px-3 py-4 transition-colors group-hover:bg-surface group-focus-within:bg-surface sm:-mx-4 sm:px-4">
        <div className="mb-2.5 flex items-center gap-2.5">
          <CategoryBadge slug={post.category} category={category} size="sm" />
          <time
            dateTime={post.publishedAt ?? undefined}
            className="text-xs text-ink-dim tabular-nums"
          >
            {formatDate(post.publishedAt)}
          </time>
        </div>

        <h2 className="text-[19px] font-bold leading-snug tracking-tight sm:text-xl">
          {/* 가로 폭은 판과 정확히 맞춘다 — 색은 깔리는데 눌리지는 않는 띠가 생기지 않게 */}
          <Link
            href={`/posts/${post.slug}`}
            className="after:absolute after:-inset-x-3 after:inset-y-0 after:content-[''] sm:after:-inset-x-4"
          >
            {post.title}
          </Link>
        </h2>

        {post.excerpt && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-dim">
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
    </article>
  );
}
