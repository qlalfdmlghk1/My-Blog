'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { CommentAvatar } from '@/components/CommentAvatar';
import { COMMENT_LIMITS, normalizeBody, sortComments } from '@/lib/comments';
import { formatDate } from '@/lib/date';
import type { Comment, CommentIdentity, CommentSubmitResult } from '@/types/comment';

/**
 * 글 아래 댓글 영역.
 *
 * 목록은 서버가 프리렌더해서 넘겨준다(`comments` prop) — 정적 HTML 에 댓글이 함께
 * 실려야 검색엔진과 자바스크립트가 꺼진 환경에서도 읽힌다. 이 컴포넌트가 클라이언트인
 * 것은 **입력 때문**이다.
 *
 * 작성자는 자기 댓글을 수정·삭제할 수 없다. 계정이 없어 "본인"을 증명할 방법이
 * 브라우저에 저장된 값밖에 없는데, 그건 지우거나 옮기면 그만이라 권한의 근거가 되지
 * 못한다. 지울 수 있는 사람은 관리자뿐이고, 그 사실을 입력창에 미리 적어둔다.
 */

const STORAGE_KEY = 'comment:identity';

/**
 * 닉네임은 브라우저에 남긴다 — 같은 사람이 여러 글에 댓글을 달면 같은 이름으로 보인다.
 * 저장소가 막힌 환경(시크릿 모드)에서는 매번 새로 발급받을 뿐 기능은 그대로 돈다.
 */
function readStoredIdentity(): CommentIdentity | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CommentIdentity>;
    if (typeof parsed.nickname === 'string' && typeof parsed.avatarSeed === 'string') {
      return { nickname: parsed.nickname, avatarSeed: parsed.avatarSeed };
    }
    return null;
  } catch {
    return null;
  }
}

function storeIdentity(identity: CommentIdentity): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
  } catch {
    // 저장소를 못 쓰면 이번 방문에만 쓰는 이름이 된다
  }
}

export function CommentSection({
  postSlug,
  comments,
}: {
  postSlug: string;
  comments: Comment[];
}) {
  const router = useRouter();
  const [identity, setIdentity] = useState<CommentIdentity | null>(null);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /**
   * 방금 쓴 댓글.
   *
   * 저장 후 `router.refresh()` 로 서버 목록을 다시 받지만, 정적 페이지의 재생성이
   * 끝나기 전에 응답이 오면 방금 쓴 댓글이 빠진 목록이 온다. 그 순간 "등록됐다고
   * 했는데 안 보인다"가 되므로, 서버 목록에 나타날 때까지 여기에 들고 있는다.
   */
  const [justAdded, setJustAdded] = useState<Comment[]>([]);

  const issueIdentity = useCallback(async () => {
    try {
      const res = await fetch('/api/comments/identity', { cache: 'no-store' });
      if (!res.ok) return;
      const next = (await res.json()) as CommentIdentity;
      setIdentity(next);
      storeIdentity(next);
    } catch {
      // 발급에 실패하면 입력창이 비활성으로 남는다 — 아래 disabled 조건
    }
  }, []);

  useEffect(() => {
    const stored = readStoredIdentity();
    if (stored) {
      setIdentity(stored);
      return;
    }
    void issueIdentity();
  }, [issueIdentity]);

  // 서버 목록에 이미 들어온 것은 임시 보관분에서 뺀다 — 같은 댓글이 두 번 보이지 않게
  const visible = useMemo(() => {
    const serverIds = new Set(comments.map((c) => c.id));
    const pending = justAdded.filter((c) => !serverIds.has(c.id));
    return sortComments([...comments, ...pending]);
  }, [comments, justAdded]);

  const trimmed = normalizeBody(body);
  const canSubmit = Boolean(identity) && trimmed.length > 0 && !busy;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!identity || !canSubmit) return;

    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postSlug, ...identity, body: trimmed }),
      });
      const result = (await res.json()) as CommentSubmitResult;

      if (!result.ok) {
        // 거절되면 내용을 지우지 않는다 — 고쳐서 다시 낼 수 있어야 한다
        setError(result.message);
        // 닉네임이 거부되면 새로 발급받는다 — 저장소에 옛 형식이 남은 경우.
        // 본문 문제('invalid')와 코드를 갈라 둔 이유는 types/comment.ts 참조.
        if (result.reason === 'invalid-identity') void issueIdentity();
        return;
      }

      setBody('');
      setJustAdded((prev) => [result.comment, ...prev]);
      router.refresh();
    } catch {
      setError('댓글을 보내지 못했습니다. 연결을 확인해 주세요.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="comments" className="mt-16 border-t border-line pt-8">
      <h2 id="comments" className="text-base font-bold tracking-tight">
        댓글 {visible.length}
      </h2>

      <form onSubmit={submit} className="mt-5">
        <div className="flex items-center gap-2.5">
          <CommentAvatar seed={identity?.avatarSeed ?? 'default'} className="size-9" />
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2">
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">
              {identity?.nickname ?? '닉네임을 받는 중…'}
            </span>
            <button
              type="button"
              onClick={() => void issueIdentity()}
              disabled={busy}
              className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-ink-dim transition-colors hover:bg-bg hover:text-ink disabled:opacity-50 motion-reduce:transition-none"
            >
              랜덤 변경
            </button>
          </div>
        </div>

        <label htmlFor="comment-body" className="sr-only">
          댓글 내용
        </label>
        <textarea
          id="comment-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={!identity || busy}
          rows={4}
          maxLength={COMMENT_LIMITS.maxBody}
          placeholder="입력한 댓글은 수정하거나 삭제할 수 없어요. 또한 허위사실, 욕설, 사칭 등 댓글은 통보없이 삭제될 수 있습니다."
          className="mt-3 w-full resize-y rounded-lg border border-line bg-bg px-3.5 py-3 text-sm leading-relaxed transition-colors placeholder:text-ink-dim hover:border-ink-dim disabled:opacity-60 motion-reduce:transition-none"
        />

        {error && (
          <p role="status" className="mt-2 text-sm leading-relaxed text-ink-dim">
            {error}
          </p>
        )}

        <div className="mt-2 flex items-center justify-end gap-3">
          <span className="text-xs tabular-nums text-ink-dim">
            {trimmed.length} / {COMMENT_LIMITS.maxBody}
          </span>
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex items-center justify-center rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-accent-fg shadow-card transition-[background-color,box-shadow,opacity] duration-200 hover:bg-accent-hover hover:shadow-raise disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
          >
            {busy ? '확인 중…' : '댓글 남기기'}
          </button>
        </div>
      </form>

      {visible.length > 0 && (
        <ul className="mt-8 space-y-3">
          {visible.map((comment) => (
            <li key={comment.id} className="rounded-xl bg-surface px-4 py-3.5">
              <div className="flex items-center gap-2">
                <CommentAvatar seed={comment.avatarSeed} className="size-7" />
                <span className="text-sm font-bold">{comment.nickname}</span>
                <time dateTime={comment.createdAt} className="text-xs tabular-nums text-ink-dim">
                  {formatDate(comment.createdAt)}
                </time>
              </div>
              {/* 본문은 글자로만 그린다 — 마크다운도 자동 링크도 걸지 않는다.
                  줄바꿈만 살리려고 whitespace-pre-line 을 쓴다. */}
              <p className="mt-1.5 whitespace-pre-line break-words text-sm leading-relaxed">
                {comment.body}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
