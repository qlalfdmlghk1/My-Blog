import type { Metadata } from 'next';

import { ClickBaseball } from '@/components/ClickBaseball';
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

/**
 * 같은 이유로 글 상세의 "목차 접기"도 첫 페인트 전에 확정한다 — 접어 둔 독자가
 * 글을 열 때마다 좁은 본문이 한 번 찍혔다 넓어지지 않게. 키는 TocCollapseToggle 과 같다.
 * 클래스는 모든 페이지의 html 에 붙지만 `toc-collapsed:` 를 쓰는 곳이 글 상세뿐이라
 * 다른 화면에는 아무 영향이 없다.
 */
const tocInit = `(function(){try{if(localStorage.getItem('toc')==='collapsed'){
document.documentElement.classList.add('toc-collapsed')}}catch(e){}})();`;

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

          둥근바람의 @font-face 는 CDN CSS 가 아니라 globals.css 에 직접 있다 —
          Regular 의 세로 메트릭이 깨져 있어 override 가 필요하다 (그쪽 주석 참조).
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
        <script dangerouslySetInnerHTML={{ __html: tocInit }} />
      </head>
      <body className="flex min-h-dvh flex-col font-sans">
        <SiteHeader />
        {/* 콘텐츠가 짧은 화면(404·로그인·빈 카테고리)에서도 푸터를 바닥에 붙인다 */}
        <div className="flex-1">{children}</div>
        <SiteFooter />
        {/* 클릭한 자리로 공이 날아와 튕겨 나가는 레이어. fixed 라 DOM 순서는 상관없지만,
            본문 뒤에 두어 스크린리더가 먼저 마주치지 않게 한다.
            동작 최소화 설정과 관리 화면에서는 스스로 꺼진다. */}
        <ClickBaseball />
      </body>
    </html>
  );
}
