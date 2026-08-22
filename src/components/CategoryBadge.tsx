import type { Category } from '@/types/category';

/**
 * 카테고리 배지 — 색은 팔레트 슬롯의 CSS 변수에서 온다.
 *
 * 카테고리 정보를 slug 로 조회하지 않고 **넘겨받는다.** 카테고리가 Firestore 로
 * 옮겨간 뒤로는 slug 만으로 이름과 색을 알 수 없고, 배지 하나 때문에 컴포넌트가
 * 데이터 접근을 하게 되면 목록 한 화면에서 같은 조회가 글 수만큼 일어난다.
 *
 * 목록에 없는 slug(카테고리가 지워졌거나 데이터가 어긋난 글)는 무채색으로
 * 떨어뜨리고 slug 를 그대로 보여준다 — 배지가 사라져 분류를 잃는 편이 더 나쁘다.
 */
export function CategoryBadge({
  slug,
  category,
  size = 'md',
}: {
  slug: string;
  category?: Pick<Category, 'name' | 'palette'> | null;
  size?: 'sm' | 'md';
}) {
  return (
    <span
      className={
        size === 'sm'
          ? 'inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold'
          : 'inline-block rounded-full px-2.5 py-1 text-xs font-semibold'
      }
      style={{
        backgroundColor: category ? `var(--pal-${category.palette}-bg)` : 'var(--tag-bg)',
        color: category ? `var(--pal-${category.palette}-fg)` : 'var(--tag-fg)',
      }}
    >
      {category?.name ?? slug}
    </span>
  );
}
