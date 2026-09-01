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
  //
  // `cursor-auto` 는 관리 화면에서 꽃 커서를 끈다(globals.css 의 body). 글을 쓰고
  // 발행하는 작업 화면이라, 어디를 겨냥하고 있는지가 재미보다 먼저다 — ClickBurst 가
  // 이 경로에서 스스로 꺼지는 것과 같은 기준이다. `contents` 를 함께 주어 이 div 가
  // 레이아웃에는 끼어들지 않게 한다(상속되는 속성은 그대로 통과한다).
  return (
    <div className="contents cursor-auto">
      <AdminBar />
      <main id="main">
        <AuthGuard>{children}</AuthGuard>
      </main>
    </div>
  );
}
