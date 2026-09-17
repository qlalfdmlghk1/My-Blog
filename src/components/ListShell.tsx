import { CategoryNav } from '@/components/CategoryNav';
import type { CategoryNode } from '@/lib/posts';

/**
 * 목록 화면(홈 · 카테고리 · 소분류 · 태그)의 공통 골격 — 분류 탭 한 줄 + 본문 한 칸.
 *
 * 네 화면이 같은 탭을 쓰므로 한곳에 모은다. 라우트마다 따로 조립하면 카테고리를 하나
 * 늘릴 때 고칠 곳이 네 군데가 된다.
 *
 * ── 좌측 사이드바를 걷어냈다 ──
 * 한동안 이 골격은 좌측에 분류 트리 + 태그 무더기를 붙인 2단이었다. 홈에서 먼저
 * 걷어내고 나니 카테고리를 누르는 순간 골격이 바뀌어, 같은 사이트의 두 화면이 아니라
 * 다른 사이트로 넘어간 것처럼 보였다. 그래서 전부 한 칸으로 맞췄다.
 *  - 대분류: 위쪽 탭이 맡는다 (어느 화면에서든 같은 자리).
 *  - 소분류: 카테고리 화면 제목 아래 칩 한 줄 (SubcategoryChips).
 *  - 태그: 따로 나열하지 않는다. 글 카드의 칩과 `/tags/…` 화면만 남는다.
 * 트리의 "전체 N편 · 분류별 N편" 숫자는 사라진다 — 첫 화면에서 글보다 먼저 눈에 들어올
 * 만큼 중요한 숫자가 아니었고, 카테고리 화면 부제가 그 분류의 수는 여전히 보여준다.
 *
 * h1 은 여기 두지 않는다 — 카테고리 · 태그 화면은 자기 이름이 h1 이고, 홈은 히어로
 * 제목이 넘길 때마다 바뀌어 h1 을 맡길 수 없어 사이트 이름을 숨긴 h1 으로 둔다.
 * 어느 쪽이든 children 이 정한다.
 */
export function ListShell({
  categories,
  activeCategory,
  children,
}: {
  categories: CategoryNode[];
  /** 탭에서 강조할 대분류 slug. 없으면 "전체" */
  activeCategory?: string;
  children: React.ReactNode;
}) {
  return (
    <main id="main" className="mx-auto max-w-shell px-5 py-6 sm:py-8">
      <CategoryNav categories={categories} active={activeCategory} />
      {children}
    </main>
  );
}
