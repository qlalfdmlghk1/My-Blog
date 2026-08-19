'use client';

import { onAuthStateChanged, type User } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { auth, hasAdminClaim, isClientConfigured } from '@/lib/firebase/client';

type State = { status: 'loading' } | { status: 'denied'; reason: string } | { status: 'ok'; user: User };

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
      setState({
        status: 'denied',
        reason: 'Firebase 설정이 없습니다. .env.local 의 NEXT_PUBLIC_FIREBASE_* 를 채우세요.',
      });
      return;
    }
    let cancelled = false;
    const unsubscribe = onAuthStateChanged(auth(), (user) => {
      if (!user) {
        router.replace('/login');
        setState({ status: 'denied', reason: '로그인이 필요합니다.' });
        return;
      }
      // 클레임 확인은 토큰 갱신을 동반하므로 비동기다.
      // 콜백이 여러 번 불릴 수 있어 언마운트 후 setState 를 막는다.
      void hasAdminClaim(user).then((ok) => {
        if (cancelled) return;
        setState(
          ok
            ? { status: 'ok', user }
            : { status: 'denied', reason: '이 계정에는 관리자 권한이 없습니다.' },
        );
      });
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [router]);

  if (state.status === 'loading') {
    return <p className="px-5 py-20 text-center text-sm text-ink-dim">확인 중…</p>;
  }
  if (state.status === 'denied') {
    return <p className="px-5 py-20 text-center text-sm text-ink-dim">{state.reason}</p>;
  }
  return <>{children}</>;
}
