'use client';

import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { btnSecondary } from '@/components/admin/ui';
import { auth, hasAdminClaim, isClientConfigured } from '@/lib/firebase/client';

/** 거절 사유를 문자열이 아니라 종류로 들고 있는다 — 화면이 사유별로 다른 출구를 제시한다 */
type DeniedKind = 'unconfigured' | 'unauthenticated' | 'forbidden';

type State =
  | { status: 'loading' }
  | { status: 'denied'; kind: DeniedKind }
  | { status: 'ok'; user: User };

const DENIED: Record<DeniedKind, { title: string; body: string }> = {
  unconfigured: {
    title: 'Firebase 설정이 없습니다',
    body: '.env.local 의 NEXT_PUBLIC_FIREBASE_* 값을 채우고 개발 서버를 다시 시작하세요.',
  },
  unauthenticated: {
    title: '로그인이 필요합니다',
    body: '로그인 화면으로 이동하는 중입니다.',
  },
  forbidden: {
    title: '이 계정에는 관리자 권한이 없습니다',
    body: '글을 쓰려면 admin 커스텀 클레임이 부여된 계정이어야 합니다. 다른 계정으로 다시 로그인해 보세요.',
  },
};

/**
 * 관리자 라우트 가드 — 클라이언트 렌더 + 인증 확인.
 * 검색엔진 노출이 불필요하므로 서버 렌더하지 않는다.
 *
 * 이건 UI 가드다. 이 컴포넌트를 우회해도 Firestore 보안 규칙이 쓰기를 막고
 * /api/revalidate 가 토큰을 검증한다 — 보안은 그쪽이 담당한다.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    if (!isClientConfigured()) {
      setState({ status: 'denied', kind: 'unconfigured' });
      return;
    }
    let cancelled = false;
    const unsubscribe = onAuthStateChanged(auth(), (user) => {
      if (!user) {
        router.replace('/login');
        setState({ status: 'denied', kind: 'unauthenticated' });
        return;
      }
      // 클레임 확인은 토큰 갱신을 동반하므로 비동기다.
      // 콜백이 여러 번 불릴 수 있어 언마운트 후 setState 를 막는다.
      void hasAdminClaim(user).then((ok) => {
        if (cancelled) return;
        setState(ok ? { status: 'ok', user } : { status: 'denied', kind: 'forbidden' });
      });
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [router]);

  if (state.status === 'loading') {
    return (
      <Centered>
        <p className="text-sm font-semibold" role="status">
          확인 중…
        </p>
        <p className="mt-2 text-xs text-ink-dim">로그인 상태와 관리자 권한을 확인하고 있습니다.</p>
      </Centered>
    );
  }

  if (state.status === 'denied') {
    const { title, body } = DENIED[state.kind];
    return (
      <Centered>
        <p className="text-sm font-bold">{title}</p>
        <p className="mt-2 text-xs leading-relaxed text-ink-dim">{body}</p>
        {state.kind === 'forbidden' && (
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              className={`${btnSecondary} bg-bg`}
              onClick={() => void signOut(auth()).then(() => router.replace('/login'))}
            >
              다른 계정으로 로그인
            </button>
            <Link href="/" className={`${btnSecondary} bg-bg`}>
              블로그로 돌아가기
            </Link>
          </div>
        )}
      </Centered>
    );
  }

  return <>{children}</>;
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-shell justify-center px-5 py-20">
      <div className="w-full max-w-sm rounded-xl border border-line bg-surface p-6 text-center">
        {children}
      </div>
    </div>
  );
}
