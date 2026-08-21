import Link from 'next/link';

import { CATEGORIES, type CategorySlug } from '@/lib/categories';
import type { CategoryNode, TagCount } from '@/lib/posts';

/**
 * 좌측 분류 내비게이션 — 카테고리 6개와 그 안의 태그.
 *
 * 기획서는 v1 에서 좌측 트리를 피하기로 했었다 — 레퍼런스의 트리가 글 872개라서
 * 성립하는 구조라 글 3편에 적용하면 빈 공간이 드러난다는 판단이었다.
 * 그 판단은 '태그' 기준이었고, 카테고리는 6개로 고정이라 글 수와 무관하게
 * 항목이 6줄로 유지된다. 그래서 빈 공간 문제 없이 세로 목록을 쓸 수 있다.
 *
 * 태그를 카테고리 밑에 접어 넣는 이유: 태그를 따로 떼어 나열하면 '프론트엔드'와
 * '#Next.js' 가 서로 무슨 관계인지 화면에서 알 수 없다. 카테고리 안에 두면
 * 소주제로 읽힌다 — 저장 구조는 그대로 2단이고 집계로만 3단처럼 보인다.
 *
 * 색은 분류에만 — 카테고리는 자기 색 점을 달고, 태그는 무채색으로 남는다.
 */
export function SiteSidebar({
  categories,
  activeCategory,
  activeTag,
}: {
  categories: CategoryNode[];
  activeCategory?: CategorySlug;
  activeTag?: string;
}) {
  const byslug = new Map(categories.map((c) => [c.slug, c]));
  const total = categories.reduce((sum, c) => sum + c.count, 0);

  return (
    <aside className="lg:sticky lg:top-20 lg:order-1 lg:max-h-[calc(100dvh-7rem)] lg:self-start lg:overflow-y-auto">
      <nav aria-label="분류">
        <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-dim">
          분류
        </h2>

        <ul className="space-y-0.5">
          <li>
            <CategoryRow
              href="/"
              label="전체"
              count={total}
              active={!activeCategory && !activeTag}
            />
          </li>

          {CATEGORIES.map((c) => {
            const node = byslug.get(c.slug);
            const count = node?.count ?? 0;
            const all = node?.tags ?? [];
            const expanded = activeCategory === c.slug;
            const shown = visibleTags(all, expanded, activeTag);
            const hidden = all.length - shown.length;

            return (
              <li key={c.slug}>
                {/* 글이 0편이어도 링크를 건다 — 페이지는 존재하고 빈 상태 문구가 있다.
                    링크를 끊으면 sitemap 에는 실리는데 사이트 안에서 도달할 수 없고,
                    발행 직후 사이드바 집계가 낡은 동안 "글이 있는데 못 누르는" 상태가 된다. */}
                <CategoryRow
                  href={`/categories/${c.slug}`}
                  label={c.name}
                  count={count}
                  active={expanded}
                  dotSlug={c.slug}
                  title={c.hint}
                  muted={count === 0}
                />

                {shown.length > 0 && (
                  <ul className="ml-3 mt-0.5 space-y-px border-l border-line pl-2">
                    {shown.map((t) => (
                      <li key={t.tag}>
                        <TagRow tag={t} active={activeTag === t.tag} />
                      </li>
                    ))}
                    {hidden > 0 && (
                      // 잘라낸 만큼을 밝힌다. 도착지(카테고리 페이지)에서는 이 카테고리가
                      // 활성이라 태그가 전부 펼쳐지므로, 링크가 빈 약속이 되지 않는다.
                      <li>
                        <Link
                          href={`/categories/${c.slug}`}
                          className="block rounded px-2 py-1 text-[11px] text-ink-dim hover:bg-surface"
                        >
                          +{hidden}개 더
                        </Link>
                      </li>
                    )}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

/** 카테고리 하나에 펼쳐 보일 태그 수 — 활성 카테고리는 제한 없이 전부 보여준다 */
const TAGS_PER_CATEGORY = 6;

/**
 * 지금 보고 있는 태그는 잘라내지 않는다 — 상위 6개 밖에 있더라도 끌어올린다.
 * 그러지 않으면 태그 페이지에서 사이드바에 현재 위치가 표시되지 않는다.
 */
function visibleTags(all: TagCount[], expanded: boolean, activeTag?: string): TagCount[] {
  if (expanded) return all;

  const head = all.slice(0, TAGS_PER_CATEGORY);
  if (!activeTag || head.some((t) => t.tag === activeTag)) return head;

  const current = all.find((t) => t.tag === activeTag);
  return current ? [...head, current] : head;
}

/**
 * 한 줄짜리 분류 항목. 6개 고정이라는 사실 자체가 이 블로그의 설계이므로
 * 글이 0편인 카테고리도 자리를 지킨다.
 *
 * 비어 있음은 opacity 로 표현하지 않는다 — 45% 를 씌우면 본문 대비가 2.9:1 로
 * 떨어져 WCAG 4.5:1 을 못 넘는다. 지금은 6개 중 5개가 0편이라 사이드바 대부분이
 * 그 상태가 된다. 색 토큰(text-ink-dim)으로 낮춰 대비를 지킨다.
 */
function CategoryRow({
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

/** 소주제 자리의 태그 한 줄 — 색을 갖지 않아 카테고리 색 점과 경쟁하지 않는다 */
function TagRow({ tag, active }: { tag: TagCount; active: boolean }) {
  return (
    <Link
      href={`/tags/${encodeURIComponent(tag.tag)}`}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs transition-colors hover:bg-surface ${
        active ? 'bg-surface font-bold' : 'text-ink-dim'
      }`}
    >
      <span className="truncate">#{tag.tag}</span>
      <span className="ml-auto tabular-nums text-ink-dim">{tag.count}</span>
    </Link>
  );
}
