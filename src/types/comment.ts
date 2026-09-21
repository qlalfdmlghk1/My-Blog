/**
 * comments/{commentId}
 *
 * 글과 달리 작성자가 계정을 갖지 않는다. 그래서 "누가 썼는지"를 가리키는 값은
 * 닉네임과 아바타 시드뿐이고, 둘 다 브라우저가 기억할 뿐 서버가 사람과 묶어두지 않는다.
 *
 * IP 해시는 **여기 두지 않는다.** 도배 판정에만 쓰는 값이라 `commentThrottle` 에
 * 잠깐 두고 TTL 로 지운다 — 댓글 문서에 남기면 "그 글에 누가 썼는지"를 사실상
 * 영구 보관하게 된다.
 */
export interface Comment {
  id: string;
  /** 어느 글의 댓글인지. 글 문서 ID 가 아니라 slug 다 — 화면이 slug 로 조회한다 */
  postSlug: string;
  /** 형용사+동물 조합. 서버가 목록으로 검증하므로 임의 문자열이 들어올 수 없다 */
  nickname: string;
  /** 아바타 도형·색을 정하는 값. 같은 닉네임이 여러 명이어도 이걸로 갈린다 */
  avatarSeed: string;
  body: string;
  /** RSC 경계를 넘기므로 Firestore Timestamp 가 아닌 ISO 문자열 */
  createdAt: string;
}

/** 브라우저가 기억하는 작성자 표시 — 서버가 발급하고 서버가 검증한다 */
export interface CommentIdentity {
  nickname: string;
  avatarSeed: string;
}

/** 쓰기 API 가 받는 본문 */
export interface CommentDraft extends CommentIdentity {
  postSlug: string;
  body: string;
}

/**
 * 쓰기 API 의 응답.
 *
 * 거절 사유를 코드로 함께 돌려준다 — 화면이 문구를 다시 짓지 않게 `message` 를
 * 그대로 쓰되, 입력창을 비울지 같은 처리는 코드로 갈리기 때문이다.
 */
export type CommentSubmitResult =
  | { ok: true; comment: Comment }
  | { ok: false; reason: CommentRejectReason; message: string };

export type CommentRejectReason =
  /** 길이·공백 등 본문 형식 문제 */
  | 'invalid'
  /**
   * 닉네임·아바타 시드가 서버가 발급한 조합이 아니다. 본문과 갈라 두는 이유:
   * 화면이 이 코드를 보면 닉네임을 **자동으로 다시 발급**받아야 하는데, 본문 길이
   * 문제와 같은 코드면 그때마다 멀쩡한 닉네임까지 바뀐다.
   */
  | 'invalid-identity'
  /** 댓글을 받을 수 없는 글 (draft · 없는 slug) */
  | 'not-found'
  /** 비속어 사전에 걸림 */
  | 'profanity'
  /** Gemini 가 차단 판정 */
  | 'abusive'
  /** 본문에 URL 이 있음 */
  | 'link'
  /** 직전 댓글과 같은 내용 */
  | 'duplicate'
  /** 같은 IP 가 쿨다운 안에 다시 씀 */
  | 'cooldown'
  /** 판정을 못 했다 — Gemini 실패·서버 오류. 게시하지 않는다 */
  | 'unavailable';
