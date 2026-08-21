import Link from 'next/link';

import { TagChip } from '@/components/TagChip';
import { CATEGORIES, type CategorySlug } from '@/lib/categories';
import type { CategoryCount, TagCount } from '@/lib/posts';

/**
 * 좌측 분류 내비게이션.
 *
 * 기획서는 v1 에서 좌측 트리를 피하기로 했었다 — 레퍼런스의 트리가 글 872개라서
 * 성립하는 구조라 글 3편에 적용하면 빈 공간이 드러난다는 판단이었다.
 * 그 판단은 '태그' 기준이었고, 카테고리는 6개로 고정이라 글 수와 무관하게
 * 항목이 6줄로 유지된다. 그래서 빈 공간 문제 없이 세로 목록을 쓸 수 있다.
 *
 * 색은 분류에만 — 카테고리는 자기 색 점을 달고, 태그는 무채색으로 남는다.
 */
export function SiteSidebar({
  categories,
  tags,
  activeCategory,
  activeTag,
}: {
  categories: CategoryCount[];
  tags: TagCount[];
  activeCategory?: CategorySlug;
  activeTag?: string;
}) {
  const countOf = new Map(categories.map((c) => [c.slug, c.count]));
  const total = categories.reduce((sum, c) => sum + c.count, 0);

  return (
    <aside className="lg:sticky lg:top-8 lg:order-1 lg:max-h-[calc(100dvh-4rem)] lg:self-start lg:overflow-y-auto">
      <nav aria-label="카테고리">
        <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-dim">
          카테고리
        </h2>

        <ul className="space-y-0.5">
          <li>
            <SidebarRow href="/" label="전체" count={total} active={!activeCategory && !activeTag} />
          </li>
          {CATEGORIES.map((c) => {
            const count = countOf.get(c.slug) ?? 0;
            return (
              <li key={c.slug}>
                {/* 글이 0편이어도 링크를 건다 — 페이지는 존재하고 빈 상태 문구가 있다.
                    링크를 끊으면 sitemap 에는 실리는데 사이트 안에서 도달할 수 없고,
                    발행 직후 사이드바 집계가 낡은 동안 "글이 있는데 못 누르는" 상태가 된다. */}
                <SidebarRow
                  href={`/categories/${c.slug}`}
                  label={c.name}
                  count={count}
                  active={activeCategory === c.slug}
                  dotSlug={c.slug}
                  title={c.hint}
                  muted={count === 0}
                />
              </li>
            );
          })}
        </ul>
      </nav>

      {tags.length > 0 && (
        <nav aria-label="태그" className="mt-7">
          <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-dim">
            태그
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {tags.map(({ tag, count }) => (
              <TagChip
                key={tag}
                tag={tag}
                count={count}
                href={`/tags/${encodeURIComponent(tag)}`}
                active={activeTag === tag}
              />
            ))}
          </div>
        </nav>
      )}
    </aside>
  );
}

/**
 * 한 줄짜리 분류 항목. 6개 고정이라는 사실 자체가 이 블로그의 설계이므로
 * 글이 0편인 카테고리도 자리를 지킨다.
 *
 * 비어 있음은 opacity 로 표현하지 않는다 — 45% 를 씌우면 본문 대비가 2.9:1 로
 * 떨어져 WCGA 4.5:1 을 못 넘는다. 지금은 6개 중 5개가 0편이라 사이드바 대부분이
 * 그 상태가 된다. 색 토큰(text-ink-dim)으로 낮춰 대비를 지킨다.
 */
function SidebarRow({
  href,
  label,
  count,
  active,
  dotSlug,
  title,
  muted = false,
}: {
  href: string;
  label: string;
  count: number;
  active?: boolean;
  dotSlug?: CategorySlug;
  title?: string;
  muted?: boolean;
}) {
  const className = [
    'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-surface',
    active ? 'bg-surface font-bold' : muted ? 'text-ink-dim' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Link href={href} className={className} title={title} aria-current={active ? 'page' : undefined}>
      {dotSlug && (
        <span
          aria-hidden
          className={`size-2 shrink-0 rounded-full${muted ? ' opacity-50' : ''}`}
          style={{ backgroundColor: `var(--cat-${dotSlug}-fg)` }}
        />
      )}
      <span className="truncate">{label}</span>
      <span className="ml-auto text-xs tabular-nums text-ink-dim">{count}</span>
      {muted && <span className="sr-only">아직 글 없음</span>}
    </Link>
  );
}
