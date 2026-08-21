import Link from 'next/link';

import { CategoryBadge } from '@/components/CategoryBadge';
import { TagChip } from '@/components/TagChip';
import { formatDate } from '@/lib/date';
import type { PostSummary } from '@/types/post';

export function PostCard({ post }: { post: PostSummary }) {
  return (
    <article className="border-b border-line py-8 first:pt-0">
      <div className="mb-2.5 flex items-center gap-2.5">
        <CategoryBadge slug={post.category} size="sm" />
        <time
          dateTime={post.publishedAt ?? undefined}
          className="text-xs text-ink-dim tabular-nums"
        >
          {formatDate(post.publishedAt)}
        </time>
      </div>

      <h2 className="text-[19px] font-bold leading-snug tracking-tight sm:text-xl">
        <Link href={`/posts/${post.slug}`} className="hover:underline">
          {post.title}
        </Link>
      </h2>

      {post.excerpt && (
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-dim">
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
