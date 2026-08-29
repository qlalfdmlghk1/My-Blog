'use client';

import Link from 'next/link';
import { useMemo, useState, type CSSProperties } from 'react';

import {
  filterDictionaryByCategory,
  findDictionaryCategory,
  dictionaryFacets,
  groupDictionary,
  searchDictionary,
} from '@/lib/dictionary';
import type { DictionaryReference } from '@/lib/dictionary';
import type { DictionaryCategory, DictionaryTerm } from '@/types/dictionary';

/**
 * 사전 본문 — 분류 필터 · 검색 · 자모 묶음.
 *
 * 이 화면만 클라이언트 컴포넌트다. 검색은 입력마다 결과가 바뀌어야 하는데 정적
 * 페이지(ISR)에서 서버 왕복으로 처리하면 글자마다 요청이 나간다. 용어 수가 수백 개
 * 규모인 개인 블로그라 전체를 한 번 내려보내고 브라우저에서 거르는 편이 싸다.
 *
 * **필터는 서버 렌더 결과를 지우지 않는다.** 초기 상태가 '전체 · 검색어 없음'이라
 * SSR 이 사전 전체를 HTML 로 내보내고, 그 위에서 상태만 얹힌다 — 검색엔진과
 * 자바스크립트가 꺼진 환경에서도 사전은 그대로 읽힌다.
 * 같은 이유로 항목의 `id`(본문 링크가 걸어오는 `/dictionary#{slug}`)도 첫 렌더에 다 있다.
 */
export function DictionaryBrowser({
  terms,
  categories,
  references,
}: {
  terms: DictionaryTerm[];
  categories: DictionaryCategory[];
  /** 용어 slug → 그 용어가 나오는 글. 없는 용어는 키가 없다 */
  references: Record<string, DictionaryReference[]>;
}) {
  const [query, setQuery] = useState('');
  /** null = 전체 */
  const [category, setCategory] = useState<string | null>(null);

  // 필터 줄의 개수는 **거르기 전 전체**로 센다 — 누를 때마다 숫자가 바뀌면
  // 그 숫자가 무엇을 뜻하는지 알 수 없게 된다.
  const facets = useMemo(() => dictionaryFacets(terms, categories), [terms, categories]);

  const visible = useMemo(
    () => searchDictionary(filterDictionaryByCategory(terms, categories, category), query),
    [terms, categories, category, query],
  );
  const groups = useMemo(() => groupDictionary(visible), [visible]);

  const filtered = category !== null || query.trim() !== '';

  return (
    <>
      <div className="mt-8 space-y-3">
        <div>
          <label htmlFor="dictionary-search" className="sr-only">
            용어 검색
          </label>
          <input
            id="dictionary-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="표제어 · 별칭 · 정의로 검색 (초성도 됩니다)"
            className="w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm transition-colors hover:border-ink-dim"
          />
        </div>

        {facets.length > 1 && (
          <nav aria-label="분류 필터" className="flex flex-wrap gap-1.5">
            <FilterChip
              active={category === null}
              onClick={() => setCategory(null)}
              label="전체"
              count={terms.length}
              palette={null}
            />
            {facets.map((facet) => (
              <FilterChip
                key={facet.slug || 'uncategorized'}
                active={category === facet.slug}
                onClick={() => setCategory(facet.slug)}
                label={facet.name}
                count={facet.count}
                palette={facet.palette}
              />
            ))}
          </nav>
        )}
      </div>

      {groups.length === 0 ? (
        <p className="mt-10 rounded-lg border border-line bg-surface px-4 py-8 text-center text-sm text-ink-dim">
          {filtered ? '찾는 용어가 없습니다.' : '아직 등록된 용어가 없습니다.'}
        </p>
      ) : (
        <>
          {/* 자모 바로가기 — 항목이 늘어도 스크롤 없이 원하는 묶음으로 뛴다.
              묶음이 하나뿐이면 뛸 곳이 없어 줄만 차지하므로 그때는 감춘다. */}
          {groups.length > 1 && (
            <nav aria-label="자모 바로가기" className="mt-6 flex flex-wrap gap-1.5">
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
                  {group.terms.map((term) => {
                    const found = findDictionaryCategory(categories, term.category);
                    return (
                      <div
                        key={term.slug}
                        id={term.slug}
                        className="scroll-mt-20"
                        // 이 항목을 드래그했을 때의 선택 색을 그 용어의 분류 색으로 맞춘다.
                        // 글 상세가 글의 카테고리 색으로 맞추는 것과 같은 규약이고
                        // (globals.css 의 ::selection), 사전에서는 화면이 아니라 **항목마다**
                        // 분류가 다르므로 여기 개별 항목에 얹는다.
                        // 분류가 없으면 변수를 얹지 않아 기본 노랑으로 떨어진다.
                        style={
                          found
                            ? ({
                                '--select-bg': `var(--pal-${found.palette}-bg)`,
                                '--select-fg': `var(--pal-${found.palette}-fg)`,
                              } as CSSProperties)
                            : undefined
                        }
                      >
                        <dt className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                          {/* 본문의 용어 링크와 같은 표시 — 점선 밑줄을 그 용어가 속한
                              분류 색으로 긋는다. 글 상세가 카테고리 색으로 긋는 것과
                              같은 규약이고(globals.css 의 .md a.term), 사전에서는 글이
                              아니라 용어 자신의 분류가 그 색을 정한다.
                              분류를 못 찾으면 색을 얹지 않아 무채색으로 떨어진다. */}
                          <span
                            className="font-bold tracking-tight underline decoration-dotted decoration-1 underline-offset-[3px]"
                            style={
                              found
                                ? { textDecorationColor: `var(--pal-${found.palette}-fg)` }
                                : { textDecorationColor: 'var(--text-dim)' }
                            }
                          >
                            {term.term}
                          </span>
                          {found && (
                            <span
                              className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                              style={{
                                backgroundColor: `var(--pal-${found.palette}-bg)`,
                                color: `var(--pal-${found.palette}-fg)`,
                              }}
                            >
                              {found.name}
                            </span>
                          )}
                          {term.aliases.length > 0 && (
                            <span className="text-xs text-ink-dim">
                              {term.aliases.join(' · ')}
                            </span>
                          )}
                        </dt>
                        <dd className="mt-1.5 text-sm leading-relaxed text-ink-dim">
                          {term.definition}
                          <RelatedPosts posts={references[term.slug] ?? []} />
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </section>
            ))}
          </div>
        </>
      )}
    </>
  );
}

/**
 * 관련글 — 접어 둔다.
 *
 * 정의를 읽으러 온 사람에게 글 목록은 곁가지다. 펼치기 전에는 "더 읽을 게 있다"는
 * 사실만 알리고 사전의 훑어보기를 방해하지 않는다. 링크 대신 접힘을 쓰는 이유가
 * 하나 더 있다 — 예전의 '자세히 →'는 어디로 가는지 눌러야 알 수 있었는데,
 * 여기서는 **글 제목이 그대로 보인다.**
 *
 * `<details>` 를 쓴다. 상태를 직접 들고 있으면 열림 여부가 검색·필터로 목록이 바뀔 때
 * 딸려 흔들리고, 자바스크립트가 없으면 아예 열리지 않는다.
 */
function RelatedPosts({ posts }: { posts: DictionaryReference[] }) {
  if (posts.length === 0) return null;

  return (
    <details className="group mt-2">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-xs font-semibold text-ink-dim transition-colors hover:text-ink [&::-webkit-details-marker]:hidden">
        <svg
          aria-hidden
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-3 transition-transform group-open:rotate-90"
        >
          <path d="M4.5 2.5 8 6l-3.5 3.5" />
        </svg>
        관련글 <span className="tabular-nums opacity-70">{posts.length}</span>
      </summary>
      <ul className="mt-2 space-y-1.5 border-l border-line pl-3">
        {posts.map((post) => (
          <li key={post.slug}>
            <Link
              href={`/posts/${post.slug}`}
              className="text-sm font-medium text-ink hover:underline"
            >
              {post.title}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}

/** 분류 칩. 고른 것만 그 분류 색으로 칠한다 — 전부 칠하면 색이 필터가 아니라 장식이 된다 */
function FilterChip({
  active,
  onClick,
  label,
  count,
  palette,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  palette: DictionaryCategory['palette'] | null;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors ${
        active ? 'border-ink' : 'border-line text-ink-dim hover:bg-surface hover:text-ink'
      }`}
      style={
        active && palette
          ? {
              backgroundColor: `var(--pal-${palette}-bg)`,
              color: `var(--pal-${palette}-fg)`,
              borderColor: `var(--pal-${palette}-fg)`,
            }
          : undefined
      }
    >
      {label}
      <span className="ml-1.5 tabular-nums opacity-70">{count}</span>
    </button>
  );
}
