/**
 * 야구공 — 선으로만 그린다.
 *
 * 이 블로그의 은근한 정체성이 야구다. 그런데 빨간 실밥을 그대로 그리면 화면에 정체불명의
 * 빨강이 하나 생기고, 그 순간 "색은 분류에만" 규칙이 깨진다. 그래서 윤곽과 실밥을
 * 전부 `currentColor` 로 긋는다 — 로고의 점처럼 무채색 표식으로 남고, 부모의
 * 글자색·불투명도를 그대로 물려받아 장식(404 의 큰 숫자)에도 섞여 들어간다.
 *
 * 실밥은 두 곡선이 서로를 향해 휘는 고전 아이콘 구도다. 이 구도가 아니면 "공"이지
 * "야구공"으로 읽히지 않는다. 바늘땀은 곡선 위 다섯 점에 접선과 직각으로 놓았다 —
 * 좌표는 2차 베지어(P0·C·P1)를 t = 0.2 · 0.35 · 0.5 · 0.65 · 0.8 에서 계산한 값이다.
 *
 * 채우지 않는다(fill none). 채우면 배경색을 하나 정해야 하는데, 이 아이콘은 밝은 바탕·
 * 어두운 바탕·반투명 장식 어디에도 놓이므로 선만 남기는 편이 어디서든 같은 인상이다.
 *
 * `aria-hidden`·`className` 은 호출부가 정한다 — 스피너에서는 장식이지만 다른 자리에서
 * 의미를 가질 수도 있어 여기서 못 박지 않고, svg 속성을 그대로 통과시킨다.
 */
export function BaseballIcon(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeLinecap="round" {...props}>
      <circle cx="20" cy="20" r="17.5" strokeWidth="2" />
      {/* 실밥 두 줄 — 왼쪽은 오른쪽으로, 오른쪽은 왼쪽으로 휜다 */}
      <path d="M 9 6 Q 17 20 9 34" strokeWidth="1.5" />
      <path d="M 31 6 Q 23 20 31 34" strokeWidth="1.5" />
      {/* 바늘땀 — 왼쪽 실밥 */}
      <g strokeWidth="1.5">
        <line x1="-1.6" x2="1.6" transform="translate(11.56 11.6) rotate(-18)" />
        <line x1="-1.6" x2="1.6" transform="translate(12.64 15.8) rotate(-10)" />
        <line x1="-1.6" x2="1.6" transform="translate(13 20)" />
        <line x1="-1.6" x2="1.6" transform="translate(12.64 24.2) rotate(10)" />
        <line x1="-1.6" x2="1.6" transform="translate(11.56 28.4) rotate(18)" />
      </g>
      {/* 바늘땀 — 오른쪽 실밥 (왼쪽을 x=20 기준으로 거울 반전) */}
      <g strokeWidth="1.5">
        <line x1="-1.6" x2="1.6" transform="translate(28.44 11.6) rotate(18)" />
        <line x1="-1.6" x2="1.6" transform="translate(27.36 15.8) rotate(10)" />
        <line x1="-1.6" x2="1.6" transform="translate(27 20)" />
        <line x1="-1.6" x2="1.6" transform="translate(27.36 24.2) rotate(-10)" />
        <line x1="-1.6" x2="1.6" transform="translate(28.44 28.4) rotate(-18)" />
      </g>
    </svg>
  );
}
