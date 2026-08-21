'use client';

import { onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Field, btnPrimary, fieldClass } from '@/components/admin/ui';
import { auth, hasAdminClaim, isClientConfigured } from '@/lib/firebase/client';
import { SITE } from '@/lib/site';

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

  return (
    <main id="main" className="mx-auto flex max-w-shell justify-center px-5 py-16 sm:py-24">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink-dim">
            {SITE.name}
          </p>
          <h1 className="mt-1.5 text-xl font-bold tracking-tight">관리자 로그인</h1>
          <p className="mt-2 text-xs leading-relaxed text-ink-dim">
            글을 쓰고 발행하는 화면입니다. 블로그를 읽는 데는 로그인이 필요 없습니다.
          </p>
        </div>

        <div className="rounded-xl border border-line bg-surface p-6">
          {!configured ? (
            <p className="text-sm leading-relaxed text-ink-dim">
              Firebase 설정이 없습니다. <code className="font-mono">.env.local</code> 의
              <code className="font-mono"> NEXT_PUBLIC_FIREBASE_*</code> 를 채우고 다시 시도하세요.
            </p>
          ) : (
            <form onSubmit={(e) => void submit(e)} className="space-y-4">
              <Field htmlFor="email" label="이메일">
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  required
                  className={fieldClass}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>

              <Field htmlFor="password" label="비밀번호">
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className={fieldClass}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>

              {error && (
                <p
                  role="alert"
                  className="rounded-lg px-3 py-2.5 text-xs leading-relaxed"
                  style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger-fg)' }}
                >
                  {error}
                </p>
              )}

              <button type="submit" disabled={busy} className={`${btnPrimary} w-full py-2.5`}>
                {busy ? '확인 중…' : '로그인'}
              </button>
            </form>
          )}
        </div>

        <p className="mt-4 text-center text-[11px] leading-relaxed text-ink-dim">
          로그인에 성공해도 admin 커스텀 클레임이 없는 계정은 관리 화면에 들어갈 수 없습니다.
        </p>
      </div>
    </main>
  );
}
