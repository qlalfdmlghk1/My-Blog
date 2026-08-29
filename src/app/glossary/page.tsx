import type { Metadata } from 'next';
import Link from 'next/link';

import { getGlossary } from '@/lib/glossary.server';
import { groupGlossary } from '@/lib/glossary';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: '용어 사전',
  description: '이 블로그의 글에서 쓰는 기술 용어의 정의를 한곳에 모았습니다.',
  alternates: { canonical: '/glossary' },
};

/**
 * 용어 사전 — 정의의 정본.
 *
 * 글마다 용어를 다시 설명하면 설명이 조금씩 갈라지고 어느 쪽이 맞는지 알 수 없게
 * 된다. 정의는 여기 한 곳에 두고, 글 본문에서는 자동으로 링크만 걸린다
 * (`lib/glossary.ts` 의 자동 링크 → `/glossary#{slug}`).
 *
 * 목록 화면(홈·카테고리·태그)의 `ListShell` 을 쓰지 않는다. 사이드바의 분류 트리는
 * "글을 좁혀 찾는" 장치인데 사전에는 글이 없어 그 축이 아무것도 하지 않는다.
 * 대신 글 상세와 같은 읽기 폭을 쓴다.
 */
export default async function GlossaryPage() {
  const terms = await getGlossary();
  const groups = groupGlossary(terms);

  return (
    <main id="main" className="mx-auto max-w-prose px-5 py-12">
      <header className="border-b border-line pb-7">
        <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight">용어 사전</h1>
        <p className="mt-2.5 text-sm leading-relaxed text-ink-dim">
          글에서 쓰는 용어의 정의를 한곳에 모았습니다. 본문에 점선 밑줄로 표시된 낱말은
          여기로 이어집니다.
        </p>
      </header>

      {groups.length === 0 ? (
        // 카테고리와 같은 원칙 — 코드에 기본 목록을 두지 않으므로 빈 상태가 정상이다
        <p className="mt-10 rounded-lg border border-line bg-surface px-4 py-8 text-center text-sm text-ink-dim">
          아직 등록된 용어가 없습니다.
        </p>
      ) : (
        <>
          {/* 자모 바로가기 — 항목이 늘어도 스크롤 없이 원하는 묶음으로 뛴다.
              묶음이 하나뿐이면 뛸 곳이 없어 줄만 차지하므로 그때는 감춘다. */}
          {groups.length > 1 && (
            <nav aria-label="자모 바로가기" className="mt-8 flex flex-wrap gap-1.5">
              {groups.map((g) => (
                <a
                  key={g.label}
                  href={`#group-${encodeURIComponent(g.label)}`}
                  className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold text-ink-dim transition-colors hover:bg-surface hover:text-ink"
                >
                  {g.label}
                </a>
              ))}
            </nav>
          )}

          <div className="mt-10 space-y-10">
            {groups.map((group) => (
              <section key={group.label}>
                <h2
                  id={`group-${encodeURIComponent(group.label)}`}
                  // sticky 헤더(3.5rem) 뒤로 숨지 않게 — globals.css 의 .md h2 와 같은 값
                  className="scroll-mt-20 border-b border-line pb-2 text-sm font-bold tracking-tight text-ink-dim"
                >
                  {group.label}
                </h2>
                <dl className="mt-5 space-y-6">
                  {group.terms.map((term) => (
                    <div key={term.slug} id={term.slug} className="scroll-mt-20">
                      <dt className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                        <span className="font-bold tracking-tight">{term.term}</span>
                        {term.aliases.length > 0 && (
                          <span className="text-xs text-ink-dim">
                            {term.aliases.join(' · ')}
                          </span>
                        )}
                      </dt>
                      <dd className="mt-1.5 text-sm leading-relaxed text-ink-dim">
                        {term.definition}
                        {term.postSlug && (
                          <>
                            {' '}
                            <Link
                              href={`/posts/${term.postSlug}`}
                              className="font-semibold text-ink underline underline-offset-[3px]"
                            >
                              자세히 →
                            </Link>
                          </>
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        </>
      )}

      <nav className="mt-16 border-t border-line pt-6 text-sm">
        <Link href="/" className="font-semibold hover:underline">
          ← 글 목록
        </Link>
      </nav>
    </main>
  );
}
