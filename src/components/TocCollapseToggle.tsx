'use client';

import { useEffect, useState } from 'react';

/**
 * 글 상세 옆자리 목차를 접고 펴는 단추 — 접으면 목차 칸이 빠진 만큼 본문이 넓어진다.
 *
 * 상태의 정본은 html 의 `.toc-collapsed` 클래스다 (ThemeToggle 과 같은 구조).
 * layout 의 인라인 스크립트가 첫 페인트 전에 붙여 두므로, 폭과 화살표 방향은
 * `toc-collapsed:` 변형(CSS)으로만 그린다 — state 로 그리면 접어 둔 독자에게
 * 펼친 모양이 한 번 찍혔다 튄다. state 는 aria 값에만 쓴다.
 *
 * 한 번 접으면 다른 글에서도 접힌 채다 — 넓게 읽는 사람은 대개 계속 넓게 읽는다.
 */
export function TocCollapseToggle() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(document.documentElement.classList.contains('toc-collapsed'));
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains('toc-collapsed');
    document.documentElement.classList.toggle('toc-collapsed', next);
    try {
      if (next) localStorage.setItem('toc', 'collapsed');
      else localStorage.removeItem('toc');
    } catch {
      // 프라이빗 모드 — 기억만 못 하고 접기 자체는 동작해야 한다
    }
    setCollapsed(next);
  }

  return (
    <button
      type="button"
      aria-expanded={!collapsed}
      aria-controls="post-toc-list"
      aria-label={collapsed ? '목차 펼치기' : '목차 접고 본문 넓게 보기'}
      title={collapsed ? '목차 펼치기' : '목차 접고 본문 넓게 보기'}
      onClick={toggle}
      // 테두리 없이 아이콘만 둔다 — 목차 옆 작은 단추라 선이 있으면 목록보다 눈에 띈다.
      // 누를 수 있는 자리임은 마우스를 올렸을 때 깔리는 옅은 면으로 알린다.
      className="flex size-8 shrink-0 items-center justify-center rounded-md text-ink-dim transition-colors hover:bg-surface hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      {/* 펼친 상태: 오른쪽(»)으로 밀어 넣기 / 접힌 상태: 왼쪽(«)으로 꺼내기 */}
      <svg
        aria-hidden
        viewBox="0 0 16 16"
        className="size-4 toc-collapsed:rotate-180"
      >
        <path
          d="M4 3.5 8.5 8 4 12.5M8.5 3.5 13 8l-4.5 4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
