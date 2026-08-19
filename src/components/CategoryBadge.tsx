import { categoryName, isCategorySlug } from '@/lib/categories';

/**
 * 태그 1개 = 색 1개, 영구 고정. slug 로 CSS 변수를 찾으므로
 * 글마다 색이 바뀔 여지가 없다 (색이 바뀌면 단순 장식이 된다).
 */
export function CategoryBadge({
  slug,
  size = 'md',
}: {
  slug: string;
  size?: 'sm' | 'md';
}) {
  const known = isCategorySlug(slug);
  return (
    <span
      className={
        size === 'sm'
          ? 'inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold'
          : 'inline-block rounded-full px-2.5 py-1 text-xs font-semibold'
      }
      style={{
        backgroundColor: known ? `var(--cat-${slug}-bg)` : 'var(--tag-bg)',
        color: known ? `var(--cat-${slug}-fg)` : 'var(--tag-fg)',
      }}
    >
      {categoryName(slug)}
    </span>
  );
}
