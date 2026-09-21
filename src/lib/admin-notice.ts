/**
 * 화면을 옮기면서 안내 한 줄을 넘긴다 (발행 화면 → 글 관리 목록).
 *
 * 발행이 끝나면 목록으로 돌아가야 하는데, 커버 생성 실패처럼 "발행은 됐지만 알아야
 * 할 것"이 있으면 그 문구를 떠나는 화면에 남길 수가 없다. 쿼리스트링에 실으면
 * 주소가 히스토리·북마크에 남아 새로고침마다 같은 안내가 다시 뜬다.
 * sessionStorage 는 탭 안에서만 살고, 읽는 쪽이 지우므로 한 번만 보인다.
 *
 * 저장소가 막힌 환경(시크릿 모드 · 저장소 비활성화)에서는 조용히 넘어간다 —
 * 안내를 잃을 뿐 발행 자체는 이미 끝난 뒤다.
 */
const KEY = 'admin:notice';

export function stashAdminNotice(message: string): void {
  try {
    window.sessionStorage.setItem(KEY, message);
  } catch {
    // 저장소를 못 쓰면 안내만 잃는다
  }
}

/** 읽는 즉시 지운다 — 목록 화면을 다시 열어도 같은 안내가 반복되지 않는다 */
export function takeAdminNotice(): string | null {
  try {
    const message = window.sessionStorage.getItem(KEY);
    if (message !== null) window.sessionStorage.removeItem(KEY);
    return message;
  } catch {
    return null;
  }
}
