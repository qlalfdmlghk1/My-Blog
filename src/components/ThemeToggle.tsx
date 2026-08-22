'use client';

import { useEffect, useState } from 'react';

/**
 * 라이트 · 다크 전환 스위치.
 *
 * 손잡이 위치는 React state 가 아니라 `dark:` 변형으로만 그린다 —
 * layout 의 인라인 스크립트가 첫 페인트 전에 html 에 `.dark` 를 붙여두므로
 * CSS 로 그리면 하이드레이션 전에도 위치가 이미 맞다.
 * state 로 그리면 다크 모드에서 손잡이가 왼쪽에 한 번 찍혔다 튄다.
 * state 는 aria-checked 에만 쓴다.
 */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light');
    } catch {
      // 프라이빗 모드 — 저장만 실패하고 전환 자체는 동작해야 한다
    }
    setDark(next);
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="다크 모드"
      onClick={toggle}
      className="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border border-line bg-surface transition-colors hover:border-ink-dim focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      <span
        aria-hidden
        className="absolute left-[3px] flex size-5 items-center justify-center rounded-full bg-ink text-bg transition-transform duration-200 ease-out motion-reduce:transition-none dark:translate-x-[22px]"
      >
        <SunIcon className="size-3 dark:hidden" />
        <MoonIcon className="hidden size-3 dark:block" />
      </span>
    </button>
  );
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={className}>
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 1.5v2M12 20.5v2M3.5 12h-2M22.5 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M18.4 5.6l1.4-1.4M4.2 19.8l1.4-1.4" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 13.5A9 9 0 1 1 10.5 3a7 7 0 0 0 10.5 10.5Z" />
    </svg>
  );
}
