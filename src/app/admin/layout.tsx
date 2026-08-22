import type { Metadata } from 'next';

import { AdminBar } from '@/components/admin/AdminBar';
import { AuthGuard } from '@/components/admin/AuthGuard';

/** 관리자 화면은 검색엔진에 노출할 필요가 없다 */
export const metadata: Metadata = {
  title: '관리',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // 랜드마크와 관리자 띠를 `AuthGuard` 바깥에 둔다 — 안쪽이면 인증 전(loading)과
  // 권한 없음(denied) 화면에서 #main 앵커와 로그아웃 버튼이 함께 사라진다.
  // 에디터 화면(write·edit)은 자체 main 이 없어 랜드마크를 여기서 준다.
  return (
    <>
      <AdminBar />
      <main id="main">
        <AuthGuard>{children}</AuthGuard>
      </main>
    </>
  );
}
