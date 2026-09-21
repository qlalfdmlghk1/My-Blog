'use client';

import { collection, deleteDoc, doc, getDocs, Timestamp } from 'firebase/firestore';

import { COLLECTION, normalizeComment, sortComments } from '@/lib/comments';
import { auth, db } from '@/lib/firebase/client';
import type { Comment } from '@/types/comment';

/**
 * 관리 화면의 댓글 읽기·삭제.
 *
 * 쓰기(작성)는 여기 없다. 익명 작성은 서버 라우트(`api/comments`)만 할 수 있고,
 * 보안 규칙이 `comments` 의 생성을 **완전히 막는다** — 브라우저에서 만들 수 있으면
 * 서버의 비속어·도배 검사를 통째로 건너뛸 수 있다.
 *
 * 삭제는 관리자 권한이 필요한 동작이라 규칙(`isAdmin()`)이 최종 방어선이고,
 * 여기서는 글·용어 관리와 같은 방식으로 클라이언트가 직접 부른다.
 */

function toIso(v: unknown): string | null {
  if (!v) return null;
  if (typeof v === 'string') return v;
  if (v instanceof Timestamp) return v.toDate().toISOString();
  return null;
}

/** 전체 댓글, 최신순. 정렬은 메모리에서 한다 (필드 없는 문서가 빠지지 않게) */
export async function listAllComments(): Promise<Comment[]> {
  const snap = await getDocs(collection(db(), COLLECTION));
  return sortComments(snap.docs.map((d) => normalizeComment(d.id, d.data(), toIso)));
}

export async function deleteComment(id: string): Promise<void> {
  await deleteDoc(doc(db(), COLLECTION, id));
}

/**
 * 삭제한 글의 정적 페이지를 다시 만든다.
 *
 * `scope: 'comment'` 는 그 글 하나만 무효화한다 — 댓글은 목록·RSS·sitemap·카테고리
 * 집계 어디에도 나타나지 않으므로 기본 scope 의 전량 무효화가 필요 없다.
 *
 * 실패해도 삭제 자체는 이미 끝났다. 호출부는 경고만 띄우고 목록을 갱신한다 —
 * 재검증이 안 되면 그 글에서 지운 댓글이 재검증 주기(1시간) 동안 남아 보인다.
 */
export async function revalidateCommentPath(slug: string): Promise<void> {
  const user = auth().currentUser;
  if (!user) throw new Error('로그인이 필요합니다.');

  const res = await fetch('/api/revalidate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${await user.getIdToken()}`,
    },
    body: JSON.stringify({ slug, scope: 'comment' }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? '재검증에 실패했습니다.');
  }
}
