import 'server-only';

import { createHash } from 'node:crypto';

import { COMMENT_LIMITS, THROTTLE_COLLECTION } from '@/lib/comments';
import { adminDb, hasAdminCredentials } from '@/lib/firebase/admin';

/**
 * 도배 제한 — 같은 곳에서 연달아 쓰는 것을 막는다.
 *
 * ## 왜 IP 인가
 *
 * 익명 댓글에는 계정이 없고, 닉네임은 브라우저가 기억하는 표시일 뿐이라 바꾸면 그만이다.
 * 요청마다 달라지지 않는 값은 사실상 IP 하나뿐이다.
 *
 * ## 왜 원문을 저장하지 않는가
 *
 * IP 는 개인정보로 취급될 수 있다. 판정에 필요한 것은 "같은 곳인가"뿐이고 주소 자체가
 * 아니므로 해시만 남긴다.
 *
 * 그냥 해시하면 안 된다 — IPv4 는 43억 개뿐이라 전부 미리 계산해 역산할 수 있다.
 * 서버에만 있는 salt(`COMMENT_IP_SALT`)를 섞어야 그 표가 소용없어진다.
 *
 * ## 왜 금방 지우는가
 *
 * 30초 판정에 필요한 기록을 오래 둘 이유가 없다. `expireAt` 을 함께 써서 Firestore TTL
 * 정책이 지우게 한다 — **콘솔에서 `commentThrottle.expireAt` 기준 TTL 을 켜야 동작한다.**
 * 켜지 않으면 기록이 계속 쌓인다. 만료 시각이 지난 문서는 여기서 없는 것으로 보므로
 * 판정 자체는 TTL 설정과 무관하게 맞게 동작한다.
 */

/**
 * 요청자 IP.
 *
 * `x-forwarded-for` 는 프록시를 거칠 때마다 뒤로 붙으므로 **첫 값**이 원 요청자다.
 * 이 헤더는 클라이언트가 위조할 수 있지만, 여기서는 문제가 되지 않는다 — 위조하면
 * 자기 쿨다운을 피할 뿐이고, 그건 IP 를 바꿔 쓰는 것과 같은 수준의 우회다.
 * (막으려면 사람 확인(Turnstile 등)이 필요하고, 그건 이번 범위가 아니다)
 *
 * 로컬 개발에는 이 헤더가 없다. 그때는 `local` 하나로 묶이므로 브라우저를 바꿔도
 * 같은 쿨다운을 받는다 — 실제 동작을 그대로 확인할 수 있어 따로 끄지 않는다.
 */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return headers.get('x-real-ip')?.trim() || 'local';
}

/** salt 가 없으면 해시하지 않는다 — salt 없는 해시는 역산 가능해서 안 하느니만 못하다 */
export function hashIp(ip: string): string | null {
  const salt = process.env.COMMENT_IP_SALT;
  if (!salt) return null;
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex');
}

export type ThrottleResult =
  /** 써도 된다 */
  | { allowed: true }
  /** 쿨다운 중 — 남은 시간(밀리초) */
  | { allowed: false; retryAfterMs: number };

/**
 * 쿨다운 확인과 기록을 한 번에 한다.
 *
 * 확인과 기록을 나누면 그 사이에 들어온 두 번째 요청이 같은 "통과"를 보고 함께 저장된다.
 * 트랜잭션으로 묶어 한 요청만 통과시킨다.
 *
 * salt 나 자격증명이 없으면 통과시킨다. 이 함수는 도배를 늦추는 장치이지 권한 경계가
 * 아니고, 설정이 빠졌다고 댓글 기능 전체가 멈추면 원인을 찾기가 더 어렵다.
 * 대신 조용히 넘어가지 않고 로그를 남긴다.
 */
export async function checkAndMarkThrottle(ipHash: string | null): Promise<ThrottleResult> {
  if (!ipHash) {
    console.warn('[throttle] COMMENT_IP_SALT 가 없어 도배 제한을 건너뜁니다.');
    return { allowed: true };
  }
  if (!hasAdminCredentials()) return { allowed: true };

  const ref = adminDb().collection(THROTTLE_COLLECTION).doc(ipHash);

  try {
    return await adminDb().runTransaction<ThrottleResult>(async (tx) => {
      const snap = await tx.get(ref);
      const now = Date.now();

      if (snap.exists) {
        const lastAt = Number(snap.get('lastAt') ?? 0);
        const elapsed = now - lastAt;
        if (elapsed >= 0 && elapsed < COMMENT_LIMITS.cooldownMs) {
          return { allowed: false, retryAfterMs: COMMENT_LIMITS.cooldownMs - elapsed };
        }
      }

      tx.set(ref, {
        lastAt: now,
        // TTL 정책이 보는 필드. Date 로 넣어야 Firestore 가 timestamp 로 저장한다
        expireAt: new Date(now + COMMENT_LIMITS.throttleTtlMs),
      });
      return { allowed: true };
    });
  } catch (error) {
    // 판정을 못 했다고 댓글을 막지는 않는다 — 위와 같은 이유
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[throttle] 확인 실패 — 제한 없이 통과시킵니다.\n  ${message}`);
    return { allowed: true };
  }
}
