import { TagChip } from '@/components/TagChip';
import type { CategoryNode } from '@/lib/posts';

/**
 * 카테고리 화면의 소분류 칩 한 줄 — "전체 · Next.js · React · CSS".
 *
 * 사이드바 트리에서 세로로 펼쳐지던 2단을 가로로 눕힌 것이다. 칩은 태그와 같은
 * TagChip 을 쓴다 — 소분류는 색을 갖지 않는다는 규칙(색은 대분류에만)이 그대로고,
 * 무채색 알약이 이미 그 뜻으로 화면에 쓰이고 있어 새 모양을 늘릴 이유가 없다.
 *
 * 글이 0편인 소분류도 보인다. 사이드바가 그랬던 이유와 같다 — 빈 칸이 보여야
 * 무엇을 쓸 차례인지 드러나고, 링크를 끊으면 발행 직후 집계가 낡은 동안 못 누른다.
 *
 * 소분류를 지운 뒤 남은 글(looseCount)은 칩으로 만들지 않는다. 그 글들은 갈 주소가
 * 없고, 카테고리 "전체" 에는 이미 잡혀 있다. 정리는 관리 화면이 안내한다.
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
    </nav>
  );
}
