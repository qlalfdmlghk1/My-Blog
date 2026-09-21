/**
 * 아바타 시드 → 정수.
 *
 * `nickname.ts` 에서 떼어낸 이유: 그 파일은 닉네임 목록을 담고 있어 서버 전용이어야
 * 하는데(`identity/route.ts` 주석 — 목록이 브라우저 번들에 있으면 조합만 맞춘 이름을
 * 만들 수 있다), 아바타를 그리는 `CommentAvatar` 는 클라이언트에서 렌더된다.
 * 한 파일에 두면 트리셰이킹이 목록을 지워 주기를 바라는 수밖에 없다.
 *
 * 암호학적 해시가 아니다 — 같은 시드가 언제나 같은 그림이 되기만 하면 된다.
 * (djb2 변형: 곱하고 더하고 32비트로 자른다)
 */
export function seedToNumber(seed: string): number {
  let hash = 5381;
  for (let i = 0; i < seed.length; i += 1) {
    hash = ((hash << 5) + hash + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}
