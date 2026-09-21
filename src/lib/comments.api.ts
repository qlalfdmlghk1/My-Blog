'use client';

import type { CommentDraft, CommentIdentity, CommentSubmitResult } from '@/types/comment';

/**
 * 공개 댓글 영역의 데이터 접근 — 서버 라우트 호출과 브라우저 저장소.
 *
 * `comments.client.ts` 에 합치지 않는다. 그 모듈은 `firebase/client`(`auth`·`db`)를
 * import 하므로 여기 합치면 **공개 글 상세 번들에 Firebase 클라이언트 SDK 가 통째로
 * 딸려온다.** 익명 작성자는 Firebase 에 직접 닿을 일이 없다 — 라우트 두 개와
 * localStorage 뿐이다.
 */

const STORAGE_KEY = 'comment:identity';

/**
 * 닉네임은 브라우저에 남긴다 — 같은 사람이 여러 글에 댓글을 달면 같은 이름으로 보인다.
 * 저장소가 막힌 환경(시크릿 모드)에서는 매번 새로 발급받을 뿐 기능은 그대로 돈다.
 */
export function readStoredIdentity(): CommentIdentity | null {
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

export function storeIdentity(identity: CommentIdentity): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
  } catch {
    // 저장소를 못 쓰면 이번 방문에만 쓰는 이름이 된다
  }
}

/** 새 닉네임·아바타 시드. 실패하면 null — 호출부가 입력창을 비활성으로 둔다 */
export async function issueCommentIdentity(): Promise<CommentIdentity | null> {
  try {
    const res = await fetch('/api/comments/identity', { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as CommentIdentity;
  } catch {
    return null;
  }
}

/**
 * 댓글 저장 요청.
 *
 * 네트워크 오류도 거절과 같은 모양(`ok: false`)으로 돌려준다 — 화면은 두 경우를
 * 같은 자리에 같은 방식으로 보여주므로 갈라 받을 이유가 없다.
 */
export async function submitComment(draft: CommentDraft): Promise<CommentSubmitResult> {
  try {
    const res = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    });
    return (await res.json()) as CommentSubmitResult;
  } catch {
    return {
      ok: false,
      reason: 'unavailable',
      message: '댓글을 보내지 못했습니다. 연결을 확인해 주세요.',
    };
  }
}
