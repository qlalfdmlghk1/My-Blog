import type { Metadata } from 'next';

import { AuthGuard } from '@/components/admin/AuthGuard';

/** 관리자 화면은 검색엔진에 노출할 필요가 없다 */
export const metadata: Metadata = {
  title: '관리',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
