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
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        line: 'var(--border)',
        ink: 'var(--text)',
        'ink-dim': 'var(--text-dim)',
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
