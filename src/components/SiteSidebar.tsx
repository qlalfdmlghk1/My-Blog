import Link from 'next/link';

import { TagChip } from '@/components/TagChip';
import type { CategoryNode, TagCount } from '@/lib/posts';

/**
 * 좌측 분류 내비게이션 — 대분류(카테고리) → 소분류 2단 트리.
 *
 * 기획서는 v1 에서 좌측 트리를 피하기로 했었다 — 레퍼런스의 트리가 글 872개라서
 * 성립하는 구조라 글 3편에 적용하면 빈 공간이 드러난다는 판단이었다.
 * 그 판단은 '태그' 기준이었고, 카테고리·소분류는 사람이 직접 만드는 값이라
 * 자유 증식하지 않는다. 그래서 빈 공간 문제 없이 세로 트리를 쓸 수 있다.
 *
 * **태그는 트리에 넣지 않는다.** 소분류가 생긴 뒤로 태그는 계층이 아니라
 * 카테고리를 가로지르는 축이다(같은 `#ISR` 이 여러 카테고리 글에 붙는다).
 * 계층 안에 넣으면 그 성질이 가려지므로 트리 아래 별도 구역에 둔다.
 *
 * 색은 대분류에만 — 카테고리는 자기 팔레트 색 점을 달고, 소분류와 태그는 무채색이다.
 * 목록은 Firestore 에서 오며 여기서 조회하지 않는다. 페이지가 읽어 넘긴 것을 그린다.
 */
export function SiteSidebar({
  categories,
  tags,
  total,
  activeCategory,
  activeSubcategory,
  activeTag,
}: {
  categories: CategoryNode[];
  tags: TagCount[];
  /**
   * 발행된 글 전체 수. 카테고리 합계로 구하지 않는다 —
   * 삭제된 카테고리를 참조하는 글은 어느 카테고리에도 안 잡혀서,
   * 합계로 구하면 목록에는 글이 보이는데 "전체 0" 이 뜬다.
   */
  total: number;
  activeCategory?: string;
  activeSubcategory?: string;
  activeTag?: string;
}) {
  const nothingActive = !activeCategory && !activeTag;

  return (
    <aside className="lg:sticky lg:top-20 lg:order-1 lg:max-h-[calc(100dvh-7rem)] lg:self-start lg:overflow-y-auto">
      <nav aria-label="분류">
        <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-dim">
          분류
        </h2>

        <ul className="space-y-0.5">
          <li>
            <Row href="/" label="전체" count={total} active={nothingActive} />
          </li>

          {categories.length === 0 && (
            <li className="px-2 py-1.5 text-xs leading-relaxed text-ink-dim">
              아직 카테고리가 없습니다.
            </li>
          )}

          {categories.map((c) => {
            // 카테고리 자신이 활성일 때만 소분류를 펼친다. 전부 펼치면 대분류가
            // 몇 개인지가 한눈에 안 들어와 트리의 값이 사라진다.
            const open = activeCategory === c.slug;

            return (
              <li key={c.slug}>
                {/* 글이 0편이어도 링크를 건다 — 페이지는 존재하고 빈 상태 문구가 있다.
                    링크를 끊으면 sitemap 에는 실리는데 사이트 안에서 도달할 수 없고,
                    발행 직후 집계가 낡은 동안 "글이 있는데 못 누르는" 상태가 된다. */}
                <Row
                  href={`/categories/${c.slug}`}
                  label={c.name}
                  count={c.count}
                  active={open && !activeSubcategory}
                  palette={c.palette}
                  title={c.hint || undefined}
                  muted={c.count === 0}
                />

                {open && (c.subs.length > 0 || c.looseCount > 0) && (
                  <ul className="ml-3 mt-0.5 space-y-px border-l border-line pl-2">
                    {c.subs.map((s) => (
                      <li key={s.slug}>
                        <Row
                          href={`/categories/${c.slug}/${s.slug}`}
                          label={s.name}
                          count={s.count}
                          active={activeSubcategory === s.slug}
                          muted={s.count === 0}
                          small
                        />
                      </li>
                    ))}
                    {/* 소분류를 지운 뒤 남은 글은 어느 소분류에도 안 잡힌다.
                        숨기면 카테고리 합계와 소분류 합계가 어긋나 보인다. */}
                    {c.looseCount > 0 && (
                      <li className="flex items-center gap-1.5 px-2 py-1 text-xs text-ink-dim">
                        <span className="truncate">분류 없음</span>
                        <span className="ml-auto tabular-nums">{c.looseCount}</span>
                      </li>
                    )}
                  </ul>
                )}
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
          <p className="mb-2 text-[11px] leading-relaxed text-ink-dim">
            분류를 가로지릅니다 — 같은 태그가 여러 카테고리에 걸칩니다.
          </p>
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
 * 트리 한 줄. 대분류·소분류가 같은 컴포넌트를 쓰되 `small`·`palette` 로만 갈린다.
 *
 * 비어 있음은 opacity 로 표현하지 않는다 — 45% 를 씌우면 본문 대비가 2.9:1 로
 * 떨어져 WCAG 4.5:1 을 못 넘는다. 색 토큰(text-ink-dim)으로 낮춰 대비를 지킨다.
 */
function Row({
  href,
  label,
  count,
  active,
  palette,
  title,
  muted = false,
  small = false,
}: {
  href: string;
  label: string;
  count: number;
  active?: boolean;
  palette?: string;
  title?: string;
  muted?: boolean;
  small?: boolean;
}) {
  const className = [
    'flex items-center gap-2 rounded-md transition-colors hover:bg-surface',
    small ? 'px-2 py-1 text-xs' : 'px-2 py-1.5 text-sm',
    active ? 'bg-surface font-bold' : muted ? 'text-ink-dim' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Link href={href} className={className} title={title} aria-current={active ? 'page' : undefined}>
      {palette && (
        <span
          aria-hidden
          className={`size-2 shrink-0 rounded-full${muted ? ' opacity-50' : ''}`}
          style={{ backgroundColor: `var(--pal-${palette}-fg)` }}
        />
      )}
      <span className="truncate">{label}</span>
      <span
        className={`ml-auto tabular-nums text-ink-dim${small ? '' : ' text-xs'}`}
      >
        {count}
      </span>
      {muted && <span className="sr-only">아직 글 없음</span>}
    </Link>
  );
}
