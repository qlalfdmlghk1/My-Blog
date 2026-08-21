'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { CategoryBadge } from '@/components/CategoryBadge';
import { TagChip } from '@/components/TagChip';
import { StatusPill, btnPrimary, btnSecondary } from '@/components/admin/ui';
import { listCategories } from '@/lib/categories.client';
import { formatDate } from '@/lib/date';
import { listAllPosts } from '@/lib/posts.client';
import type { Category } from '@/types/category';
import type { PostSummary } from '@/types/post';

export default function AdminPage() {
  const [posts, setPosts] = useState<PostSummary[] | null>(null);
  // 배지 이름·색은 카테고리 문서에 있다 — 카드마다 조회하지 않도록 한 번 읽어 맵으로 넘긴다
  const [categories, setCategories] = useState<Map<string, Category>>(new Map());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listAllPosts(), listCategories()])
      .then(([found, cats]) => {
        setPosts(found);
        setCategories(new Map(cats.map((c) => [c.slug, c])));
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : '목록을 불러오지 못했습니다.'),
      );
  }, []);

  const drafts = posts?.filter((p) => p.status === 'draft') ?? [];
  const published = posts?.filter((p) => p.status === 'published') ?? [];

  return (
    <div className="mx-auto max-w-shell px-5 py-8 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">글 관리</h1>
          <p className="mt-1.5 text-sm text-ink-dim">
            발행하면 해당 글과 목록 · RSS · sitemap 이 함께 재생성됩니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/categories" className={btnSecondary}>
            카테고리
          </Link>
          <Link href="/admin/write" className={btnPrimary}>
            새 글 쓰기
          </Link>
        </div>
      </div>

      {/* 숫자는 목록을 세지 않아도 상태를 알려준다 — 특히 "쓰다 만 글"의 존재 */}
      <dl className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
        <Stat label="전체" value={posts?.length} />
        <Stat label="발행" value={posts ? published.length : undefined} />
        <Stat label="임시" value={posts ? drafts.length : undefined} />
      </dl>

      {error && (
        <p
          role="alert"
          className="mt-6 rounded-lg border border-line px-3.5 py-3 text-sm"
          style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger-fg)' }}
        >
          {error}
        </p>
      )}

      {!posts && !error && <SkeletonList />}

      {posts?.length === 0 && (
        <div className="mt-6 rounded-xl border border-dashed border-line px-5 py-16 text-center">
          <p className="text-sm font-semibold">아직 글이 없습니다</p>
          <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-ink-dim">
            첫 글을 쓰면 홈 · 카테고리 · RSS 에 함께 실립니다. 임시저장해 두면 공개되지 않습니다.
          </p>
          <Link href="/admin/write" className={`${btnSecondary} mt-5 bg-bg`}>
            첫 글 쓰기
          </Link>
        </div>
      )}

      {/* 쓰다 만 글을 위로 올린다 — 관리자가 다시 여는 건 대개 이쪽이다 */}
      {drafts.length > 0 && (
        <PostSection title="임시" posts={drafts} categories={categories} />
      )}
      {published.length > 0 && (
        <PostSection title="발행" posts={published} categories={categories} />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-3.5 py-3">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-ink-dim">{label}</dt>
      <dd className="mt-0.5 text-xl font-bold tabular-nums">
        {value ?? <span className="text-ink-dim">–</span>}
      </dd>
    </div>
  );
}

function PostSection({
  title,
  posts,
  categories,
}: {
  title: string;
  posts: PostSummary[];
  categories: Map<string, Category>;
}) {
  return (
    <section className="mt-8">
      <h2 className="mb-2.5 flex items-baseline gap-2 text-[11px] font-bold uppercase tracking-wider text-ink-dim">
        {title}
        <span className="tabular-nums">{posts.length}</span>
      </h2>
      <ul className="space-y-2">
        {posts.map((post) => (
          <PostRow key={post.id} post={post} category={categories.get(post.category)} />
        ))}
      </ul>
    </section>
  );
}

/** 태그가 많은 글이 한 줄을 다 먹지 않게 앞의 몇 개만 보여준다 */
const TAG_PREVIEW = 4;

function PostRow({ post, category }: { post: PostSummary; category?: Category }) {
  const shown = post.tags.slice(0, TAG_PREVIEW);
  const hidden = post.tags.length - shown.length;

  return (
    <li className="rounded-xl border border-line p-4 transition-colors hover:bg-surface">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill status={post.status} />
        <CategoryBadge slug={post.category} category={category} size="sm" />
        <time dateTime={post.updatedAt} className="ml-auto text-[11px] tabular-nums text-ink-dim">
          {formatDate(post.updatedAt)} 수정
        </time>
      </div>

      <h3 className="mt-2 text-[15px] font-bold leading-snug tracking-tight sm:text-base">
        <Link href={`/admin/edit/${post.id}`} className="hover:underline">
          {post.title || '(제목 없음)'}
        </Link>
      </h3>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="font-mono text-[11px] text-ink-dim">/{post.slug}</span>
        {shown.map((tag) => (
          <TagChip key={tag} tag={tag} />
        ))}
        {hidden > 0 && <span className="text-[11px] text-ink-dim">+{hidden}</span>}

        <div className="ml-auto flex items-center gap-3 text-xs font-medium">
          {/* 발행된 글만 공개 경로가 존재한다 — 임시글 링크는 404 로 간다 */}
          {post.status === 'published' && (
            <a
              href={`/posts/${post.slug}`}
              target="_blank"
              rel="noreferrer"
              className="text-ink-dim hover:text-ink"
            >
              보기 ↗
            </a>
          )}
          <Link href={`/admin/edit/${post.id}`} className="hover:underline">
            수정
          </Link>
        </div>
      </div>
    </li>
  );
}

/** 목록이 몇 줄짜리인지 미리 보여줘 로딩 중 화면이 튀지 않게 한다 */
function SkeletonList() {
  return (
    <ul className="mt-8 space-y-2" aria-hidden>
      {[0, 1, 2].map((i) => (
        <li key={i} className="animate-pulse rounded-xl border border-line p-4">
          <div className="h-4 w-24 rounded bg-surface" />
          <div className="mt-3 h-4 w-2/3 rounded bg-surface" />
          <div className="mt-3 h-3 w-1/3 rounded bg-surface" />
        </li>
      ))}
    </ul>
  );
}
