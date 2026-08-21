'use client';

import { signOut } from 'firebase/auth';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { CategoryBadge } from '@/components/CategoryBadge';
import { auth } from '@/lib/firebase/client';
import { listAllPosts } from '@/lib/posts.client';
import type { PostSummary } from '@/types/post';

export default function AdminPage() {
  const [posts, setPosts] = useState<PostSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listAllPosts()
      .then(setPosts)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : '목록을 불러오지 못했습니다.'),
      );
  }, []);

  const drafts = posts?.filter((p) => p.status === 'draft') ?? [];
  const published = posts?.filter((p) => p.status === 'published') ?? [];

  return (
    <div className="mx-auto max-w-shell px-5 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-bold tracking-tight">
          글 관리
          {posts && (
            <span className="ml-2 text-sm font-normal text-ink-dim">
              발행 {published.length} · 임시 {drafts.length}
            </span>
          )}
        </h1>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/write"
            className="rounded-md border border-line bg-ink px-3.5 py-2 text-sm font-semibold text-bg"
          >
            새 글
          </Link>
          <button
            type="button"
            onClick={() => void signOut(auth())}
            className="rounded-md border border-line px-3.5 py-2 text-sm font-semibold text-ink-dim"
          >
            로그아웃
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-ink-dim">
          {error}
        </p>
      )}

      {!posts && !error && <p className="text-sm text-ink-dim">불러오는 중…</p>}

      {posts?.length === 0 && (
        <p className="py-16 text-center text-sm text-ink-dim">아직 글이 없습니다.</p>
      )}

      {posts && posts.length > 0 && (
        <ul className="divide-y divide-line border-y border-line">
          {posts.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 py-3.5">
              <span
                className="rounded px-1.5 py-0.5 text-[11px] font-semibold"
                style={
                  p.status === 'published'
                    ? { backgroundColor: 'var(--cat-devenv-bg)', color: 'var(--cat-devenv-fg)' }
                    : { backgroundColor: 'var(--tag-bg)', color: 'var(--tag-fg)' }
                }
              >
                {p.status === 'published' ? '발행' : '임시'}
              </span>
              <CategoryBadge slug={p.category} size="sm" />
              <Link href={`/admin/edit/${p.id}`} className="font-medium hover:underline">
                {p.title || '(제목 없음)'}
              </Link>
              <span className="ml-auto font-mono text-[11px] text-ink-dim">/{p.slug}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
