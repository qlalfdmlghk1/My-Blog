import { TagChip } from '@/components/TagChip';
import type { TagCount } from '@/lib/posts';

/**
 * v1 은 상단 태그 필터 한 줄.
 * 레퍼런스의 좌측 카테고리 트리는 글 872개라서 성립하는 구조 —
 * 글 3편에 적용하면 빈 공간이 드러난다. 글이 쌓인 뒤 사이드바로 확장(v2).
 */
export function TagFilter({
  tags,
  activeTag,
}: {
  tags: TagCount[];
  activeTag?: string;
}) {
  if (tags.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-line pb-5">
      <TagChip tag="all" label="전체" href="/" active={!activeTag} />
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
  );
}
