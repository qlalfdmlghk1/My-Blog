import 'server-only';

import type { Timestamp } from 'firebase-admin/firestore';

import { COLLECTION, COMMENT_LIMITS, normalizeComment, sortComments } from '@/lib/comments';
import { adminDb, hasAdminCredentials } from '@/lib/firebase/admin';
import { safeRead, warnUnconfigured } from '@/lib/safe-read';
import type { Comment } from '@/types/comment';

/** Firestore Timestamp | ISO 문자열 | null 을 ISO 문자열로 정규화 (posts.ts 와 같은 형태) */
function toIso(v: unknown): string | null {
  if (!v) return null;
  if (typeof v === 'string') return v;
  const ts = v as Partial<Timestamp>;
  if (typeof ts.toDate === 'function') return ts.toDate().toISOString();
  return null;
}

/**
 * 한 글의 공개 댓글 — 글 상세가 프리렌더할 때 읽는다.
 *
 * 실패하면 빈 배열이고, 그때 그 글은 **댓글 영역 없이 본문만** 뜬다. 사전 조회와
 * 같은 판단이다 — 댓글 조회 한 번이 글 본문을 못 띄우는 이유가 되어선 안 된다.
 *
 * 정렬과 개수 제한은 메모리에서 한다. `orderBy` 는 필드가 없는 문서를 통째로
 * 떨어뜨리고, `limit` 은 그 정렬에 묶여 있어 같은 문제를 물려받는다.
 */
export async function getComments(postSlug: string): Promise<Comment[]> {
  if (!postSlug) return [];
  if (!hasAdminCredentials()) {
    warnUnconfigured('getComments');
    return [];
  }
  return safeRead(
    'getComments',
    async () => {
      const snap = await adminDb()
        .collection(COLLECTION)
        .where('postSlug', '==', postSlug)
        .get();
      const comments = snap.docs.map((d) => normalizeComment(d.id, d.data(), toIso));
      return sortComments(comments).slice(0, COMMENT_LIMITS.maxRendered);
    },
    [],
  );
}

/**
 * 댓글을 받을 수 있는 글인가.
 *
 * `published` 만 허용한다. 초안은 관리자만 볼 수 있는데 그 주소로 댓글이 들어오면
 * 발행 시점에 갑자기 나타나고, 없는 slug 는 어디에도 안 보이는 댓글을 만든다.
 *
 * 실패하면 `false` 다 — 판정을 못 한 상태에서 저장하면 그 댓글이 어느 글에도
 * 속하지 않을 수 있다. 여기서는 열어주는 쪽이 아니라 막는 쪽으로 실패한다.
 */
export async function isCommentableSlug(postSlug: string): Promise<boolean> {
  if (!postSlug || !hasAdminCredentials()) return false;
  return safeRead(
    'isCommentableSlug',
    async () => {
      const snap = await adminDb()
        .collection('posts')
        .where('slug', '==', postSlug)
        .where('status', '==', 'published')
        .limit(1)
        .get();
      return !snap.empty;
    },
    false,
  );
}

/**
 * 그 글의 가장 최근 댓글 본문 — 같은 내용 연속 작성 판정에 쓴다.
 * `getComments` 가 이미 최신순으로 돌려주므로 첫 항목이 답이다.
 */
export async function latestCommentBody(postSlug: string): Promise<string | null> {
  return (await getComments(postSlug))[0]?.body ?? null;
}
