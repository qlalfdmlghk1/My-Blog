import type { Metadata } from 'next';

import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { categoryCssVariables } from '@/lib/category-css';
import { SITE, siteUrl } from '@/lib/site';

import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: SITE.name, template: `%s · ${SITE.name}` },
  description: SITE.description,
  openGraph: {
    type: 'website',
    siteName: SITE.name,
    locale: SITE.locale,
    title: SITE.name,
    description: SITE.description,
  },
  twitter: { card: 'summary_large_image' },
  alternates: { types: { 'application/rss+xml': '/rss.xml' } },
};

/** 첫 페인트 전에 테마를 확정해 밝은 화면 번쩍임을 막는다 */
const themeInit = `(function(){try{var t=localStorage.getItem('theme');
if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}
if(t==='dark'){document.documentElement.classList.add('dark')}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/*
          본문 · 제목: 티머니 둥근바람. 둥근 획이 이 블로그의 인상을 만든다.
          woff2 838KiB(Regular 388 + ExtraBold 450)로 가볍지 않으므로
          font-display:swap 으로 렌더를 막지 않는다.
          웨이트는 400·800 두 벌뿐이라 font-bold(700)는 800 으로 매칭된다 —
          제목이 쓰는 ExtraBold 는 preload 대상이 아니라 늦게 스왑될 수 있다.
          (Lighthouse 실측 후 부담되면 제목에만 남기고 본문은 Pretendard 로 되돌린다)

          Pretendard 는 폴백으로 남긴다 — 동적 서브셋이라 둥근바람이 덮는 글자에는
          요청이 나가지 않고, 빠진 글자가 있을 때만 내려온다.
        */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link
          rel="preload"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/fonts-archive/TmoneyRoundWind/TmoneyRoundWindRegular.woff2"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/fonts-archive/TmoneyRoundWind/TmoneyRoundWind.css"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        {/* 코드: D2Coding — 한글 폭이 영문 2배로 맞아떨어져 주석이 깨지지 않는다 */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/wan2land/d2coding/d2coding-ligature-subset.css"
        />
        {/* 카테고리 색 변수 — categories.ts 에서 파생 생성 (정의처가 한 곳뿐이어야 한다) */}
        <style dangerouslySetInnerHTML={{ __html: categoryCssVariables() }} />
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="flex min-h-dvh flex-col font-sans">
        <SiteHeader />
        {/* 콘텐츠가 짧은 화면(404·로그인·빈 카테고리)에서도 푸터를 바닥에 붙인다 */}
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
