import { TagChip } from '@/components/TagChip';
import { LOOSE_SUBCATEGORY, LOOSE_SUBCATEGORY_NAME, type CategoryNode } from '@/lib/posts';

/**
 * 카테고리 화면의 소분류 칩 한 줄 — "전체 · Next.js · React · CSS · 분류 없음".
 *
 * 사이드바 트리에서 세로로 펼쳐지던 2단을 가로로 눕힌 것이다. 칩은 태그와 같은
 * TagChip 을 쓴다 — 소분류는 색을 갖지 않는다는 규칙(색은 대분류에만)이 그대로고,
 * 무채색 알약이 이미 그 뜻으로 화면에 쓰이고 있어 새 모양을 늘릴 이유가 없다.
 *
 * 글이 0편인 소분류도 보인다. 사이드바가 그랬던 이유와 같다 — 빈 칸이 보여야
 * 무엇을 쓸 차례인지 드러나고, 링크를 끊으면 발행 직후 집계가 낡은 동안 못 누른다.
 *
 * 소분류가 비어 있는 글(looseCount)은 맨 끝의 '분류 없음' 칩으로 모은다. 이 칩만은
 * 0편이면 숨긴다 — 사람이 만든 칸이 아니라 "아직 분류하지 않은 글"의 자리라,
 * 비어 있을 때 보이면 쓸 차례를 알리는 게 아니라 잡음이 된다.
 */
export function SubcategoryChips({
  category,
  active,
}: {
  category: CategoryNode;
  /** 활성 소분류 slug. 없으면 "전체" */
  active?: string;
}) {
  if (category.subs.length === 0) return null;

  const base = `/categories/${encodeURIComponent(category.slug)}`;

  return (
    <nav aria-label="소분류" className="mt-4 flex flex-wrap gap-1.5">
      <TagChip tag="" label="전체" count={category.count} href={base} active={!active} />
      {category.subs.map((s) => (
        <TagChip
          key={s.slug}
          tag={s.slug}
          label={s.name}
          count={s.count}
          href={`${base}/${encodeURIComponent(s.slug)}`}
          active={active === s.slug}
        />
      ))}
      {category.looseCount > 0 && (
        <TagChip
          tag={LOOSE_SUBCATEGORY}
          label={LOOSE_SUBCATEGORY_NAME}
          count={category.looseCount}
          href={`${base}/${LOOSE_SUBCATEGORY}`}
          active={active === LOOSE_SUBCATEGORY}
        />
      )}
    </nav>
  );
}
