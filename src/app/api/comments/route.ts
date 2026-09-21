import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

import {
  bodyKey,
  COLLECTION,
  COMMENT_LIMITS,
  containsUrl,
  isValidBodyLength,
  normalizeBody,
} from '@/lib/comments';
import { isCommentableSlug, latestCommentBody } from '@/lib/comments.server';
import { adminDb, hasAdminCredentials } from '@/lib/firebase/admin';
import { judgeComment } from '@/lib/moderation.server';
import { isValidAvatarSeed, isValidNickname } from '@/lib/nickname';
import { findProfanity } from '@/lib/profanity';
import { checkAndMarkThrottle, clientIp, hashIp } from '@/lib/throttle.server';
import type { Comment, CommentRejectReason } from '@/types/comment';

/**
 * 익명 댓글 저장.
 *
 * ## 왜 브라우저가 Firestore 에 직접 쓰지 않는가
 *
 * 보안 규칙으로 익명 쓰기를 열면, 이 라우트의 검사를 전부 건너뛰고 컬렉션에 아무 문서나
 * 넣을 수 있다. 규칙은 필드의 모양만 볼 수 있을 뿐 "이 문장이 욕설인가"를 판정하지
 * 못한다. 그래서 `comments` 의 생성은 규칙에서 **완전히 막고**, 이 라우트만 Admin SDK
 * 로 쓴다.
 *
 * ## 검사 순서
 *
 * 싼 것부터 본다 — 형식 → 글 존재 → 쿨다운 → 링크 → 중복 → 단어 사전 → Gemini.
 * 모델 호출이 제일 비싸므로 앞에서 걸러낼 수 있는 것은 앞에서 끝낸다. 쿨다운을
 * 링크·사전보다 앞에 두는 이유는, 거절되는 요청이라도 모델까지 가지 않게 하려는 것이다.
 */
export const dynamic = 'force-dynamic';
/** Gemini 판정이 붙어 기본 상한으로는 모자란다 */
export const maxDuration = 30;

function reject(
  reason: CommentRejectReason,
  message: string,
  status: number,
): NextResponse {
  return NextResponse.json({ ok: false, reason, message }, { status });
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!hasAdminCredentials()) {
    return reject('unavailable', '댓글 기능이 아직 준비되지 않았습니다.', 503);
  }

  let payload: { postSlug?: unknown; nickname?: unknown; avatarSeed?: unknown; body?: unknown };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return reject('invalid', '요청을 읽을 수 없습니다.', 400);
  }

  const postSlug = typeof payload.postSlug === 'string' ? payload.postSlug : '';
  const nickname = typeof payload.nickname === 'string' ? payload.nickname : '';
  const avatarSeed = typeof payload.avatarSeed === 'string' ? payload.avatarSeed : '';
  const body = normalizeBody(typeof payload.body === 'string' ? payload.body : '');

  // 1. 형식 — 닉네임이 우리가 발급할 수 있는 조합인지까지 본다.
  //    브라우저가 보낸 값을 그대로 믿으면 '관리자'·글쓴이 이름으로 댓글을 달 수 있다.
  if (!isValidNickname(nickname) || !isValidAvatarSeed(avatarSeed)) {
    return reject('invalid', '닉네임을 다시 발급받아 주세요.', 400);
  }
  if (!isValidBodyLength(body)) {
    return reject(
      'invalid',
      `댓글은 1자 이상 ${COMMENT_LIMITS.maxBody}자 이하로 적어주세요.`,
      400,
    );
  }

  // 2. 댓글을 받을 수 있는 글인가 (발행된 글만)
  if (!(await isCommentableSlug(postSlug))) {
    return reject('not-found', '댓글을 달 수 없는 글입니다.', 404);
  }

  // 3. 쿨다운 — 통과하면 이 시점에 기록이 남는다(확인과 기록이 한 트랜잭션)
  const throttle = await checkAndMarkThrottle(hashIp(clientIp(request.headers)));
  if (!throttle.allowed) {
    const seconds = Math.ceil(throttle.retryAfterMs / 1000);
    return reject('cooldown', `조금 천천히 남겨주세요. ${seconds}초 후에 가능합니다.`, 429);
  }

  // 4. 링크 — 스팸 광고의 대부분이 링크다
  if (containsUrl(body)) {
    return reject('link', '링크가 포함된 댓글은 남길 수 없습니다.', 400);
  }

  // 5. 직전 댓글과 같은 내용인가
  const latest = await latestCommentBody(postSlug);
  if (latest !== null && bodyKey(latest) === bodyKey(body)) {
    return reject('duplicate', '바로 앞 댓글과 같은 내용입니다.', 409);
  }

  // 6. 단어 사전 — 무엇에 걸렸는지는 로그에만 남긴다.
  //    작성자에게 알려주면 그 낱말만 바꿔 다시 시도하게 된다.
  const hit = findProfanity(body);
  if (hit) {
    console.warn(`[comments] 비속어 차단 (${postSlug}) — "${hit}"`);
    return reject('profanity', '비속어가 포함되어 있어 등록할 수 없습니다.', 400);
  }

  // 7. Gemini 판정 — 실패는 통과가 아니다 (moderation.server.ts 주석 참고)
  const verdict = await judgeComment(body);
  if (!verdict.ok) {
    return reject('unavailable', '지금은 댓글을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.', 503);
  }
  if (verdict.abusive) {
    console.warn(`[comments] 판정 차단 (${postSlug}) — ${verdict.reason}`);
    return reject('abusive', '다른 사람이 불쾌할 수 있는 표현이 있어 등록할 수 없습니다.', 400);
  }

  // 8. 저장
  const createdAt = new Date();
  try {
    const ref = await adminDb().collection(COLLECTION).add({
      postSlug,
      nickname,
      avatarSeed,
      body,
      createdAt,
    });

    // 글 상세는 정적 페이지(ISR 1시간)다. 여기서 무효화하지 않으면 방금 쓴 댓글이
    // 재검증 주기가 돌 때까지 안 보인다. 목록·RSS 는 댓글로 바뀌지 않으므로
    // 이 경로 하나만 무효화한다 — slug 에 한글을 허용하므로 두 표기를 모두 넣는다
    // (`/api/revalidate` 와 같은 이유. 없는 경로의 revalidatePath 는 무동작이다).
    const path = `/posts/${postSlug}`;
    revalidatePath(path);
    const encoded = `/posts/${encodeURIComponent(postSlug)}`;
    if (encoded !== path) revalidatePath(encoded);

    const comment: Comment = {
      id: ref.id,
      postSlug,
      nickname,
      avatarSeed,
      body,
      createdAt: createdAt.toISOString(),
    };
    return NextResponse.json({ ok: true, comment }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[comments] 저장 실패 (${postSlug})\n  ${message}`);
    return reject('unavailable', '댓글을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.', 500);
  }
}
