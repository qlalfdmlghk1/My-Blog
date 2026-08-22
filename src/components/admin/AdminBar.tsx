'use client';

import { onAuthStateChanged, signOut } from 'firebase/auth';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { auth, isClientConfigured } from '@/lib/firebase/client';

/**
 * 관리자 컨텍스트 띠 — 루트 레이아웃의 `SiteHeader` 바로 아래에 붙는다.
 *
 * 브랜드·테마 토글을 다시 넣지 않는다. 위에 이미 있어서 두 줄이 같은 걸
 * 두 번 말하게 된다. 여기서만 할 수 있는 말(지금 누구로 로그인했는지,
 * 어떻게 빠져나가는지)만 남긴다.
 *
 * `AuthGuard` 바깥에 둔다 — 권한 없는 계정으로 들어왔을 때 로그아웃 버튼이
 * 함께 사라지면 다른 계정으로 갈아탈 방법이 화면에서 없어진다.
 * 로그인 상태를 직접 구독하는 이유도 같다: 로그아웃은 로그인했을 때만 띄운다.
 */
export function AdminBar() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!isClientConfigured()) return;
    return onAuthStateChanged(auth(), (user) => setEmail(user?.email ?? null));
  }, []);

  return (
    <div className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-shell items-center gap-3 px-5 py-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-ink-dim">
          관리자
        </span>
        {email && (
          <span className="min-w-0 truncate text-xs text-ink-dim" title={email}>
            {email}
          </span>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-3">
          {/* 새 탭으로 연다 — 작성 중인 글을 두고 화면을 떠나지 않게 한다 */}
          <Link
            href="/"
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium text-ink-dim hover:text-ink"
          >
            블로그 보기 ↗
          </Link>
          {email && (
            <button
              type="button"
              onClick={() => void signOut(auth())}
              className="rounded-md px-1.5 py-1 text-xs font-medium text-ink-dim hover:text-ink"
            >
              로그아웃
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
