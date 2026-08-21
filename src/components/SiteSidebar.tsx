import Link from 'next/link';

import { TagChip } from '@/components/TagChip';
import { CATEGORIES, type CategorySlug } from '@/lib/categories';
import type { CategoryCount, TagCount } from '@/lib/posts';
import { SITE } from '@/lib/site';

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
    <aside className="lg:sticky lg:top-8 lg:self-start">
      <p className="hidden text-[13px] leading-relaxed text-ink-dim lg:block">
        {SITE.description}
      </p>

      <nav aria-label="카테고리" className="mt-0 lg:mt-6">
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
                <SidebarRow
                  href={count > 0 ? `/categories/${c.slug}` : undefined}
                  label={c.name}
                  count={count}
                  active={activeCategory === c.slug}
                  dotSlug={c.slug}
                  title={c.hint}
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
 * 한 줄짜리 분류 항목. 글이 0편이면 갈 곳이 없으므로 링크를 걸지 않되
 * 자리는 지킨다 — 6개 고정이라는 사실 자체가 이 블로그의 설계다.
 */
function SidebarRow({
  href,
  label,
  count,
  active,
  dotSlug,
  title,
}: {
  href?: string;
  label: string;
  count: number;
  active?: boolean;
  dotSlug?: CategorySlug;
  title?: string;
}) {
  const className = [
    'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
    active ? 'bg-surface font-bold' : href ? 'hover:bg-surface' : 'opacity-45',
  ].join(' ');

  const body = (
    <>
      {dotSlug && (
        <span
          aria-hidden
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: `var(--cat-${dotSlug}-fg)` }}
        />
      )}
      <span className="truncate">{label}</span>
      <span className="ml-auto text-xs tabular-nums text-ink-dim">{count}</span>
    </>
  );

  if (!href) {
    return (
      <span className={className} title={title ? `${title} — 아직 글 없음` : undefined}>
        {body}
      </span>
    );
  }
  return (
    <Link href={href} className={className} title={title} aria-current={active ? 'page' : undefined}>
      {body}
    </Link>
  );
}
