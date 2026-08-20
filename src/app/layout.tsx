import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';

import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { categoryCssVariables } from '@/lib/category-css';
import { SITE, siteUrl } from '@/lib/site';

import './globals.css';

/** 색을 다채롭게 쓰는 만큼 글꼴은 절제 — 본문 Pretendard, 코드 JetBrains Mono 뿐 */
const mono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});

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
    <html lang="ko" className={mono.variable} suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        {/* 카테고리 색 변수 — categories.ts 에서 파생 생성 (정의처가 한 곳뿐이어야 한다) */}
        <style dangerouslySetInnerHTML={{ __html: categoryCssVariables() }} />
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-dvh font-sans">
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
