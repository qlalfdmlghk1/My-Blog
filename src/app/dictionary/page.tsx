import type { Metadata } from 'next';
import Link from 'next/link';

import { DictionaryBrowser } from '@/components/DictionaryBrowser';
import {
  getDictionary,
  getDictionaryCategories,
  getDictionaryReferences,
} from '@/lib/dictionary.server';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: '용어 사전',
  description: '이 블로그의 글에서 쓰는 기술 용어의 정의를 한곳에 모았습니다.',
  alternates: { canonical: '/dictionary' },
};

/**
 * 용어 사전 — 정의의 정본.
 *
 * 글마다 용어를 다시 설명하면 설명이 조금씩 갈라지고 어느 쪽이 맞는지 알 수 없게
 * 된다. 정의는 여기 한 곳에 두고, 글 본문에서는 자동으로 링크만 걸린다
 * (`lib/dictionary.ts` 의 자동 링크 → `/dictionary#{slug}`).
 *
 * 목록 화면(홈·카테고리·태그)의 `ListShell` 을 쓰지 않는다. 사이드바의 분류 트리는
 * "글을 좁혀 찾는" 장치인데 사전에는 글이 없어 그 축이 아무것도 하지 않는다.
 * 대신 글 상세와 같은 읽기 폭을 쓴다.
 *
 * 목록 자체(필터·검색·자모 묶음)는 `DictionaryBrowser` 가 그린다 — 검색이 입력마다
 * 결과를 바꿔야 해서 그 부분만 클라이언트다. 이 페이지는 읽기 세 번(용어·분류·관련글)만 한다.
 */
export default async function DictionaryPage() {
  // 분류 조회가 실패해도 빈 배열이라 사전은 필터 없이 전체 목록으로 뜬다
  const [terms, categories] = await Promise.all([getDictionary(), getDictionaryCategories()]);
  // 관련글은 용어 목록이 있어야 계산되므로 위 둘과 나란히 두지 못한다
  const references = await getDictionaryReferences(terms);

  return (
    <main id="main" className="mx-auto max-w-prose px-5 py-12">
      <header className="border-b border-line pb-7">
        <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight">용어 사전</h1>
        <p className="mt-2.5 text-sm leading-relaxed text-ink-dim">
          글에서 쓰는 용어의 정의를 한곳에 모았습니다. 본문에 점선 밑줄로 표시된 낱말은
          여기로 이어집니다.
        </p>
      </header>

      <DictionaryBrowser terms={terms} categories={categories} references={references} />

      <nav className="mt-16 border-t border-line pt-6 text-sm">
        <Link href="/" className="font-semibold hover:underline">
          ← 글 목록
        </Link>
      </nav>
    </main>
  );
}
