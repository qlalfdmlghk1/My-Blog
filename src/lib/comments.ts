/**
 * 익명 댓글 — 서버·클라이언트가 함께 쓰는 규약.
 *
 * 이 파일에는 Firestore 접근이 없다. 읽기는 `comments.server.ts`,
 * 관리자 삭제는 `comments.client.ts`, 쓰기는 `app/api/comments/route.ts` 다.
 * 여기에는 **컬렉션 이름 · 한계값 · 본문 판정**만 둔다 (`dictionary.ts` 와 같은 구성).
 *
 * 특히 한계값을 한 곳에 두는 것이 중요하다. 입력창의 글자 수 표시와 서버 검증이
 * 같은 숫자를 봐야 "화면은 통과시키는데 서버가 거절하는" 상태가 생기지 않는다.
 * `firestore.rules` 에는 댓글 검증 함수가 **없다** — 규칙은 생성 자체를 막고, 검증은
 * 서버 라우트(`api/comments`)가 유일한 관문이다. 규칙에 검증을 "복구"하지 말 것.
 */

import type { Comment } from '@/types/comment';

export const COLLECTION = 'comments';
/** 도배 판정용 기록. 공개 데이터가 아니라 규칙에서 전부 막는다 */
export const THROTTLE_COLLECTION = 'commentThrottle';

export const COMMENT_LIMITS = {
  /** trim 후 최소 — 공백만 있는 입력을 막는다 */
  minBody: 1,
  /** 서버 라우트가 거절하는 상한. 입력창의 maxLength 도 이 값 */
  maxBody: 500,
  /** 한 글의 공개 목록에 그리는 최대 개수 — 정적 HTML 크기를 여기에 묶어 둔다 */
  maxRendered: 100,
  /** 같은 IP 가 다시 쓸 수 있을 때까지 (밀리초) */
  cooldownMs: 30_000,
  /** 도배 기록을 남겨 두는 기간 (밀리초). 만료 후 실제 삭제는 Firestore TTL 일정에 따른다 */
  throttleTtlMs: 60 * 60 * 1000,
} as const;

/**
 * 저장·비교 전에 본문을 다듬는다.
 *
 * 앞뒤 공백을 떼고, 세 줄 이상 연속된 빈 줄을 두 줄로 줄이고, 줄 끝 공백을 버린다.
 * 줄바꿈 자체는 남긴다 — 문단을 나눠 쓰는 것은 정상적인 글쓰기다.
 */
export function normalizeBody(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** 길이 판정 — 화면과 서버가 같은 함수를 본다 */
export function isValidBodyLength(body: string): boolean {
  return body.length >= COMMENT_LIMITS.minBody && body.length <= COMMENT_LIMITS.maxBody;
}

/**
 * 링크가 들어 있는가.
 *
 * 스팸 광고의 대부분이 링크이고, 개인 블로그 댓글에 링크가 필요한 경우는 드물다.
 * `http://` 형태만 보면 `example.com` 처럼 스킴 없이 적은 주소를 놓치므로 둘 다 본다.
 * 점이 들어간 낱말(`Next.js`·`v1.2`)까지 막지 않도록, 뒤에 오는 것이 **알려진 형태의
 * 최상위 도메인**일 때만 주소로 본다.
 */
export function containsUrl(body: string): boolean {
  if (/\b(?:https?:\/\/|www\.)/i.test(body)) return true;
  return /\b[a-z0-9][a-z0-9-]*\.(?:com|net|org|io|co|kr|me|dev|app|xyz|shop|info|biz|link|site|top|cc|tv|gg)\b/i.test(
    body,
  );
}

/**
 * 도배 판정용 비교 키.
 *
 * 공백을 모두 압축하고 소문자로 맞춘다 — 같은 문장에 띄어쓰기만 바꿔 다시 올리는 것을
 * 같은 내용으로 본다. 비교 대상은 **그 글의 가장 최근 댓글 한 건**이다(작성자 무관):
 * 작성자를 따지려면 IP 해시를 댓글에 남겨야 하는데, 그러면 "누가 썼는지"를 사실상
 * 영구 보관하게 된다. 연속 도배는 대부분 바로 다음 자리에 붙으므로 이 정도면 잡힌다.
 */
export function bodyKey(body: string): string {
  return body.replace(/\s+/g, ' ').trim().toLowerCase();
}

/** Firestore 문서 → Comment. 손상된 필드는 버리지 않고 안전한 값으로 떨어뜨린다 */
export function normalizeComment(
  id: string,
  data: Record<string, unknown>,
  toIso: (v: unknown) => string | null,
): Comment {
  return {
    id,
    postSlug: String(data.postSlug ?? ''),
    nickname: String(data.nickname ?? '익명'),
    avatarSeed: String(data.avatarSeed ?? id),
    body: String(data.body ?? ''),
    createdAt: toIso(data.createdAt) ?? new Date(0).toISOString(),
  };
}

/**
 * 최신순 정렬.
 *
 * Firestore `orderBy` 를 쓰지 않는 이유는 글·용어와 같다 — 그 필드가 없는 문서가
 * 쿼리 결과에서 통째로 빠진다. 여기서 정렬하면 값이 깨진 문서도 목록에는 남는다.
 */
export function sortComments(comments: Comment[]): Comment[] {
  return [...comments].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
