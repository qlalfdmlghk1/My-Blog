'use client';

import { useEffect, useState } from 'react';

/** layout 의 인라인 스크립트가 이미 결정해둔 값을 읽어와 UI 를 맞춘다 */
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
      onClick={toggle}
      aria-label={dark ? '라이트 모드로 전환' : '다크 모드로 전환'}
      className="rounded-md border border-line px-2.5 py-1.5 text-xs font-medium hover:bg-surface"
    >
      {dark ? '라이트' : '다크'}
    </button>
  );
}
