import Link from 'next/link';

import type { CategoryNode } from '@/lib/posts';

/**
 * 목록 화면 상단의 분류 탭 — "전체" 와 대분류를 한 줄로 늘어놓는다 (ListShell 이 단다).
 *
 * 좌측 사이드바(분류 트리)를 걷어내고 그 자리를 대신한다. 헤더에 넣지 않은 이유는
 * 루트 레이아웃이 Firestore 조회에 엮이지 않는다는 결정 때문이다(category-css.ts 참조).
 * 대신 본문 맨 위에 두어 헤더 바로 아래에 붙은 것처럼 보이게 한다.
 *
 * 소분류와 태그는 여기 없다 — 탭 한 줄에 다 넣으면 줄이 넘친다. 소분류는 카테고리
 * 화면의 칩(SubcategoryChips)이, 태그는 글 카드의 칩이 맡는다. 색은 대분류 점에만 쓴다.
 *
 * 좁은 화면에서는 줄바꿈하지 않고 가로로 넘긴다. 탭이 두 줄로 접히면 히어로가
 * 아래로 밀려 첫 화면에서 제목이 잘린다.
 */
export function CategoryNav({
  categories,
  active,
}: {
  categories: CategoryNode[];
  /** 활성 카테고리 slug. 없으면 "전체" 가 활성이다 */
  active?: string;
}) {
  return (
    <nav aria-label="분류" className="-mx-5 overflow-x-auto px-5 [scrollbar-width:none]">
      <ul className="flex w-max items-center gap-1 text-sm">
        <li>
          <Tab href="/" label="전체" active={!active} />
        </li>
        {categories.map((c) => (
          <li key={c.slug}>
            <Tab
              href={`/categories/${c.slug}`}
              label={c.name}
              active={active === c.slug}
              palette={c.palette}
              title={c.hint || undefined}
            />
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * 탭 하나 — 활성은 면 + 굵기로, 나머지는 흐린 글자로 두어 색 없이 위계를 만든다.
 * 활성을 본문색으로 뒤집지 않는 이유: 그 위에 올라가는 분류 색 점이 진한 면에 묻힌다.
 */
function Tab({
  href,
  label,
  active,
  palette,
  title,
}: {
  href: string;
  label: string;
  active: boolean;
  palette?: string;
  title?: string;
}) {
  const className = [
    'flex items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-1.5 transition-colors',
    active ? 'bg-surface font-bold text-ink' : 'font-semibold text-ink-dim hover:text-ink',
  ].join(' ');

  return (
    <Link href={href} className={className} title={title} aria-current={active ? 'page' : undefined}>
      {palette && (
        <span
          aria-hidden
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: `var(--pal-${palette}-fg)` }}
        />
      )}
      {label}
    </Link>
  );
}
