import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { HomeList } from '@/components/lists/HomeList';
import { pageHref, pageParams, parsePageParam } from '@/lib/pagination';
import { getPublishedPosts } from '@/lib/posts';

export const revalidate = 3600;

/**
 * 글이 늘면 마지막 페이지 번호도 늘어난다 — 빌드 시점에 목록이 닫히지 않게 둔다.
 * 범위 밖 번호는 HomeList 가 notFound() 로 떨어뜨린다.
 */
export const dynamicParams = true;

type Params = { params: Promise<{ page: string }> };

export async function generateStaticParams() {
  return pageParams((await getPublishedPosts()).length);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const page = parsePageParam((await params).page);
  if (!page) return {};
  return {
    ...(page > 1 && { title: `${page}페이지` }),
    alternates: { canonical: pageHref('/', page) },
  };
}

/**
 * 1페이지의 정본은 기준 URL(`/`)이다. 다만 `/page/1` 로 들어와도 리다이렉트하지 않고
 * 같은 화면을 그린 뒤 `canonical` 로 홈을 가리킨다.
 *
 * `redirect('/')` 를 쓰지 않는 이유: next dev 가 이 라우트(`/page/[page]`)에서 홈으로
 * 리다이렉트할 때 목적지 모듈을 `app/page/` 하위로 잘못 찾아 500 이 난다
 * (`Cannot find module for page: /page/[page]/page`). 프로덕션에서는 정상이지만
 * 개발 중에만 깨지는 경로를 남기지 않는다. 중복 문서는 canonical 이 막는다.
 * 카테고리 · 소분류 · 태그 목록도 같은 규칙을 쓴다.
 */
export default async function HomePagedPage({ params }: Params) {
  const page = parsePageParam((await params).page);
  if (!page) notFound();
  return <HomeList page={page} />;
}
