'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { CommentAvatar } from '@/components/CommentAvatar';
import { btnQuiet, btnSecondary } from '@/components/admin/ui';
import { deleteComment, listAllComments, revalidateCommentPath } from '@/lib/comments.client';
import { formatDate } from '@/lib/date';
import { listAllPosts } from '@/lib/posts.client';
import type { Comment } from '@/types/comment';

/**
 * 댓글 관리 — 목록과 삭제.
 *
 * 익명 댓글에는 작성자가 고칠 수단이 없으므로, **여기가 잘못 올라간 댓글을 치우는
 * 유일한 자리**다. 서버의 비속어·판정 필터가 100% 는 아니라서 이 화면이 마지막
 * 방어선이다.
 *
 * 글 제목은 글 목록과 맞춰 붙인다. 두 조회를 `Promise.all` 로 묶지 않는 것은
 * 글 관리 화면과 같은 이유다 — 한쪽이 실패해도 다른 쪽은 보여준다.
 */
export default function AdminCommentsPage() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [titles, setTitles] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** 제목만 실패한 경우 — 댓글 목록은 살아 있으므로 경고로만 알린다 */
  const [titleError, setTitleError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    listAllComments()
      .then(setComments)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : '댓글을 불러오지 못했습니다.'),
      )
      .finally(() => setLoading(false));

    listAllPosts()
      .then((posts) => setTitles(new Map(posts.map((p) => [p.slug, p.title]))))
      .catch(() => setTitleError('글 제목을 불러오지 못했습니다. 주소만 표시합니다.'));
  }, []);

  /** 같은 글의 댓글이 흩어지지 않게 글별로 묶는다. 글 안에서는 최신순(이미 정렬돼 있다) */
  const grouped = useMemo(() => {
    const map = new Map<string, Comment[]>();
    for (const comment of comments) {
      const list = map.get(comment.postSlug);
      if (list) list.push(comment);
      else map.set(comment.postSlug, [comment]);
    }
    return [...map.entries()];
  }, [comments]);

  async function remove(comment: Comment) {
    // 삭제는 되돌릴 수 없고 작성자가 다시 쓸 수도 없다 — 본문 앞부분을 보여주고 확인받는다
    const preview = comment.body.length > 30 ? `${comment.body.slice(0, 30)}…` : comment.body;
    if (!window.confirm(`이 댓글을 지울까요?\n\n${comment.nickname}: ${preview}`)) return;

    setBusyId(comment.id);
    setError(null);
    try {
      await deleteComment(comment.id);
      setComments((prev) => prev.filter((c) => c.id !== comment.id));

      // 삭제는 이미 끝났다 — 재검증이 실패해도 목록은 갱신하고 경고만 띄운다.
      // 그때 그 글에는 지운 댓글이 재검증 주기(1시간) 동안 남아 보인다.
      try {
        await revalidateCommentPath(comment.postSlug);
      } catch (err: unknown) {
        setError(
          `삭제했지만 글 페이지 갱신에 실패했습니다 — ${
            err instanceof Error ? err.message : '알 수 없는 오류'
          }`,
        );
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '삭제하지 못했습니다.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-shell px-5 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-bold tracking-tight">댓글 관리</h1>
        <Link href="/admin" className={btnQuiet}>
          ← 글 관리
        </Link>
      </div>

      <p className="mt-2 text-sm leading-relaxed text-ink-dim">
        익명 댓글은 작성자가 고치거나 지울 수 없습니다. 여기서만 삭제할 수 있습니다.
      </p>

      {error && (
        <p role="status" className="mt-6 rounded-lg border border-ink-dim px-3.5 py-3 text-sm leading-relaxed">
          {error}
        </p>
      )}

      {titleError && (
        <p role="status" className="mt-6 rounded-lg border border-ink-dim px-3.5 py-3 text-sm leading-relaxed">
          {titleError}
        </p>
      )}

      {loading ? (
        <p className="mt-10 text-sm text-ink-dim">불러오는 중…</p>
      ) : comments.length === 0 ? (
        <p className="mt-10 text-sm text-ink-dim">아직 댓글이 없습니다.</p>
      ) : (
        <div className="mt-8 space-y-8">
          {grouped.map(([slug, list]) => (
            <section key={slug}>
              <h2 className="text-sm font-bold tracking-tight">
                <Link href={`/posts/${slug}`} className="hover:underline">
                  {/* 글이 지워졌어도 댓글은 남는다 — 그때는 주소로라도 어디 것인지 보인다 */}
                  {titles.get(slug) || slug}
                </Link>
                <span className="ml-2 font-normal text-ink-dim">{list.length}</span>
              </h2>

              <ul className="mt-3 space-y-2">
                {list.map((comment) => (
                  <li
                    key={comment.id}
                    className="flex items-start gap-3 rounded-xl bg-surface px-4 py-3"
                  >
                    <CommentAvatar seed={comment.avatarSeed} className="mt-0.5 size-7" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{comment.nickname}</span>
                        <time
                          dateTime={comment.createdAt}
                          className="text-xs tabular-nums text-ink-dim"
                        >
                          {formatDate(comment.createdAt)}
                        </time>
                      </div>
                      <p className="mt-1 whitespace-pre-line break-words text-sm leading-relaxed">
                        {comment.body}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void remove(comment)}
                      disabled={busyId === comment.id}
                      className={`${btnSecondary} shrink-0`}
                    >
                      {busyId === comment.id ? '지우는 중…' : '삭제'}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
