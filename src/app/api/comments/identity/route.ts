import { NextResponse } from 'next/server';

import { randomAvatarSeed, randomNickname } from '@/lib/nickname';
import type { CommentIdentity } from '@/types/comment';

/**
 * 익명 작성자 표시를 하나 발급한다.
 *
 * 브라우저에서 바로 뽑아도 되는 값인데 굳이 서버를 거치는 이유: **발급과 검증이 같은
 * 목록을 봐야 하기 때문이다.** 쓰기 API 는 들어온 닉네임이 우리가 만들 수 있는
 * 조합인지 확인해서 '관리자' 같은 이름을 막는데, 목록이 브라우저 번들에 있으면
 * 그 목록을 읽어 조합만 맞춘 이름을 만들 수 있다. 목록을 서버에만 두면 발급받은
 * 이름 외에는 통과하지 않는다.
 *
 * 인증이 없고 아무 부수효과가 없는 엔드포인트다 — 호출해도 얻는 것은 무작위 이름 하나다.
 */
export const dynamic = 'force-dynamic';

export function GET(): NextResponse<CommentIdentity> {
  return NextResponse.json(
    { nickname: randomNickname(), avatarSeed: randomAvatarSeed() },
    // 캐시되면 모두가 같은 닉네임을 받는다
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
