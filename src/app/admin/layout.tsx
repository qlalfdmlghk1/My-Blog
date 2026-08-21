import type { Metadata } from 'next';

import { AuthGuard } from '@/components/admin/AuthGuard';

/** 관리자 화면은 검색엔진에 노출할 필요가 없다 */
export const metadata: Metadata = {
  title: '관리',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // 랜드마크를 레이아웃에 둔다 — 에디터 화면(write·edit)은 자체 main 이 없어
  // 관리자 경로 중 목록에만 랜드마크가 있고 나머지엔 없는 상태였다.
  //
  // AuthGuard 바깥에 둔다. 안쪽에 두면 인증이 끝나기 전(loading·denied)에는
  // 랜드마크가 아예 없어 건너뛰기 링크가 갈 곳을 잃는다.
  return (
    <main id="main">
      <AuthGuard>{children}</AuthGuard>
    </main>
  );
}
