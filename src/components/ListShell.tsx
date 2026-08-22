import { SiteSidebar } from '@/components/SiteSidebar';
import type { CategoryNode, TagCount } from '@/lib/posts';

/**
 * 목록 화면(홈 · 카테고리 · 소분류 · 태그)의 공통 골격 — 좌측 분류 내비 + 본문 2단.
 *
 * 네 화면이 같은 사이드바를 쓰므로 한곳에 모은다. 라우트마다 따로 조립하면
 * 카테고리를 하나 늘릴 때 고칠 곳이 네 군데가 된다.
 *
 * 좁은 화면에서는 한 칸으로 접히고 사이드바가 글 목록 **아래**로 간다 —
 * 분류 6줄과 태그 무더기를 지나야 첫 글이 나오면 목록 화면 구실을 못 한다.
 * 사이드바 폭(13.5rem)을 좁은 화면에서 유지하지 않는 이유도 같다.
 */
export function ListShell({
  categories,
  tags,
  total,
  activeCategory,
  activeSubcategory,
  activeTag,
  children,
}: {
  categories: CategoryNode[];
  /** 태그는 계층 밖의 가로축이라 트리와 분리해 받는다 */
  tags: TagCount[];
  /** 발행된 글 전체 수 — 사이드바의 "전체" 줄에 쓰인다 */
  total: number;
  activeCategory?: string;
  activeSubcategory?: string;
  activeTag?: string;
  children: React.ReactNode;
}) {
  return (
    // 본문을 DOM 에서 먼저 둔다 — 사이드바의 h2 가 본문 h1 보다 앞서면 제목 순서가
    // 역전돼 접근성 검사에 걸린다. 좌측 배치는 order 로만 되돌린다.
    <div className="mx-auto grid max-w-shell gap-8 px-5 py-10 lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:gap-12">
      <main id="main" className="min-w-0 lg:order-2">
        {children}
      </main>
      <SiteSidebar
        categories={categories}
        tags={tags}
        total={total}
        activeCategory={activeCategory}
        activeSubcategory={activeSubcategory}
        activeTag={activeTag}
      />
    </div>
  );
}
