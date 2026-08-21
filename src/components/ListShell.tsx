import { SiteSidebar } from '@/components/SiteSidebar';
import type { CategorySlug } from '@/lib/categories';
import type { CategoryCount, TagCount } from '@/lib/posts';

/**
 * 목록 화면(홈 · 카테고리 · 태그)의 공통 골격 — 좌측 분류 내비 + 본문 2단.
 *
 * 세 화면이 같은 사이드바를 쓰므로 한곳에 모은다. 라우트마다 따로 조립하면
 * 카테고리를 하나 늘릴 때 고칠 곳이 세 군데가 된다.
 *
 * 좁은 화면에서는 사이드바를 본문 위로 흘려보낸다 — 220px 를 억지로 유지하면
 * 본문이 읽을 수 없는 폭이 된다.
 */
export function ListShell({
  categories,
  tags,
  activeCategory,
  activeTag,
  children,
}: {
  categories: CategoryCount[];
  tags: TagCount[];
  activeCategory?: CategorySlug;
  activeTag?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto grid max-w-shell gap-8 px-5 py-10 lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:gap-12">
      <SiteSidebar
        categories={categories}
        tags={tags}
        activeCategory={activeCategory}
        activeTag={activeTag}
      />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
