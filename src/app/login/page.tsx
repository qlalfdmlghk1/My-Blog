'use client';

import { onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { auth, hasAdminClaim, isClientConfigured } from '@/lib/firebase/client';

/** 관리자 로그인 — Firebase Auth, 계정 1개(본인) */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const configured = isClientConfigured();

  useEffect(() => {
    if (!configured) return;
    let cancelled = false;
    const unsubscribe = onAuthStateChanged(auth(), (user) => {
      if (!user) return;
      void hasAdminClaim(user).then((ok) => {
        if (ok && !cancelled) router.replace('/admin');
      });
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [configured, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { user } = await signInWithEmailAndPassword(auth(), email, password);
      if (!(await hasAdminClaim(user))) {
        setError('이 계정에는 관리자 권한이 없습니다.');
        return;
      }
      router.replace('/admin');
    } catch {
      // 계정 존재 여부가 드러나지 않도록 원인을 구분하지 않는다
      setError('이메일 또는 비밀번호가 올바르지 않습니다.');
    } finally {
      setBusy(false);
    }
  }

  const field = 'w-full rounded-md border border-line bg-bg px-3 py-2 text-sm';

  return (
    <main className="mx-auto max-w-sm px-5 py-24">
      <h1 className="text-lg font-bold tracking-tight">관리자 로그인</h1>

      {!configured ? (
        <p className="mt-4 text-sm text-ink-dim">
          Firebase 설정이 없습니다. <code className="font-mono">.env.local</code> 의
          <code className="font-mono"> NEXT_PUBLIC_FIREBASE_*</code> 를 채우고 다시 시도하세요.
        </p>
      ) : (
        <form onSubmit={(e) => void submit(e)} className="mt-6 space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-dim" htmlFor="email">
              이메일
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              className={field}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-dim" htmlFor="password">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              className={field}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <p role="alert" className="text-xs" style={{ color: 'var(--cat-performance-fg)' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md border border-line bg-ink px-3.5 py-2.5 text-sm font-semibold text-bg disabled:opacity-50"
          >
            {busy ? '확인 중…' : '로그인'}
          </button>
        </form>
      )}
    </main>
  );
}
