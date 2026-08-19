import Link from 'next/link';

import { CategoryBadge } from '@/components/CategoryBadge';
import { TagChip } from '@/components/TagChip';
import type { PostSummary } from '@/types/post';

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Seoul',
  }).format(new Date(iso));
}

export function PostCard({ post }: { post: PostSummary }) {
  return (
    <article className="border-b border-line py-7 first:pt-0">
      <div className="mb-2.5 flex items-center gap-2.5">
        <CategoryBadge slug={post.category} size="sm" />
        <time
          dateTime={post.publishedAt ?? undefined}
          className="text-xs text-ink-dim tabular-nums"
        >
          {formatDate(post.publishedAt)}
        </time>
      </div>

      <h2 className="text-lg font-bold leading-snug tracking-tight">
        <Link href={`/posts/${post.slug}`} className="hover:underline">
          {post.title}
        </Link>
      </h2>

      {post.excerpt && (
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-dim">
          {post.excerpt}
        </p>
      )}

      {post.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {post.tags.map((t) => (
            <TagChip key={t} tag={t} href={`/tags/${encodeURIComponent(t)}`} />
          ))}
        </div>
      )}
    </article>
  );
}
