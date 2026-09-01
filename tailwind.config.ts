import type { Config } from 'tailwindcss';

/**
 * 색은 장식이 아니라 길찾기 — 무채색이 화면의 90%.
 * 카테고리 색은 globals.css 의 CSS 변수로만 정의하고 Tailwind 팔레트에 넣지 않는다.
 * (Tailwind 유틸로 노출하면 본문·버튼에 쓰이기 시작해 규칙이 무너진다)
 */
const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /**
         * bg · surface 만 `rgb(... / <alpha-value>)` 형태다.
         * 이 두 색에는 투명도 수식(`bg-bg/70`)이 실제로 필요하다 — sticky 헤더가
         * 뒤를 비쳐야 하기 때문이다. 나머지 토큰은 알파를 쓸 일이 없어 raw var 로 둔다.
         * (raw var 에 `/70` 을 붙이면 유틸이 조용히 생성되지 않는다)
         */
        bg: 'rgb(var(--bg-rgb) / <alpha-value>)',
        surface: 'rgb(var(--surface-rgb) / <alpha-value>)',
        line: 'var(--border)',
        ink: 'var(--text)',
        'ink-dim': 'var(--text-dim)',
        /**
         * 주요 버튼 전용 제비꽃색. 카테고리 팔레트가 아니라 globals.css 의 --accent 를
         * 가리키므로, Tailwind 유틸로 열어도 카테고리 색이 본문에 새지 않는다.
         * 쓰는 곳을 주요 버튼으로 한정한다 — 링크·본문·배경에 쓰기 시작하면
         * `purple` 배지와 부딪혀 어느 보라가 분류인지 흐려진다.
         */
        accent: 'var(--accent)',
        'accent-fg': 'var(--accent-fg)',
        'accent-hover': 'var(--accent-hover)',
      },
      /**
       * 그림자 두 단계 — 값은 globals.css 가 테마별로 정의한다.
       * 다크에서는 검정 그림자가 배경에 묻히므로 그쪽에서 안쪽 흰 선으로 바뀐다.
       * Tailwind 기본 shadow-* 를 쓰면 그 전환이 안 되어 다크에서 깊이가 사라진다.
       */
      boxShadow: {
        card: 'var(--shadow-card)',
        raise: 'var(--shadow-raise)',
      },
      fontFamily: {
        sans: [
          'Tmoney Round Wind',
          'Pretendard Variable',
          'Pretendard',
          'system-ui',
          'sans-serif',
        ],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      // shell 은 사이드바가 붙은 목록 화면, prose 는 글 본문 한 줄 길이
      maxWidth: { prose: '44rem', shell: '76rem' },
    },
  },
  plugins: [],
};

export default config;
