/**
 * 날짜 표기 — 공개 목록과 관리자 화면이 같은 함수를 쓴다.
 *
 * timeZone 을 고정하는 이유: 공개 목록은 서버에서 프리렌더되고 관리자 목록은
 * 브라우저에서 렌더된다. 로캘·시간대를 런타임에 맡기면 같은 글의 날짜가
 * 두 화면에서 하루 어긋나 보인다.
 */
const YMD = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: 'Asia/Seoul',
});

/** 잘못된 값이 오면 빈 문자열 — 목록 한 줄 때문에 화면 전체가 죽지 않게 한다 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : YMD.format(date);
}
