'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import {
  filterDictionaryByCategory,
  findDictionaryCategory,
  dictionaryFacets,
  groupDictionary,
  searchDictionary,
} from '@/lib/dictionary';
import type { DictionaryFacet, DictionaryReference } from '@/lib/dictionary';
import type { DictionaryCategory, DictionaryTerm } from '@/types/dictionary';

/**
 * 분류 드롭다운에서 '전체'를 가리키는 값.
 *
 * 빈 문자열을 쓰지 못한다 — `UNCATEGORIZED` 가 이미 `''` 라서, 둘을 같은 값으로 두면
 * '전체'와 '분류 없음'이 한 항목으로 뭉개진다. `option` 의 value 는 문자열만 받으므로
 * `null` 도 쓸 수 없어, 분류 slug 과 겹칠 일이 없는 표식을 따로 둔다.
 */
const ALL_CATEGORIES = '__all__';

/**
 * 사전 본문 — 검색 · 분류 필터 · 자모 묶음.
 *
 * 이 화면만 클라이언트 컴포넌트다. 검색은 입력마다 결과가 바뀌어야 하는데 정적
 * 페이지(ISR)에서 서버 왕복으로 처리하면 글자마다 요청이 나간다. 용어 수가 수백 개
 * 규모인 개인 블로그라 전체를 한 번 내려보내고 브라우저에서 거르는 편이 싸다.
 *
 * **필터는 서버 렌더 결과를 지우지 않는다.** 초기 상태가 '전체 · 검색어 없음'이라
 * SSR 이 사전 전체를 HTML 로 내보내고, 그 위에서 상태만 얹힌다 — 검색엔진과
 * 자바스크립트가 꺼진 환경에서도 사전은 그대로 읽힌다.
 * 같은 이유로 항목의 `id`(본문 링크가 걸어오는 `/dictionary#{slug}`)도 첫 렌더에 다 있다.
 *
 * ## 조작부는 한 줄이다
 *
 * 예전에는 제목 아래에 검색창 · 분류 칩 · 자모 바로가기가 세 줄로 쌓였다. 사전을 열면
 * 첫 화면의 절반이 조작부였고 정작 읽으러 온 용어는 그 아래로 밀렸다. 두 가지를 바꿨다.
 *
 * 1. **분류를 드롭다운으로 접었다.** 칩은 분류가 늘어날수록 줄바꿈으로 번지는데,
 *    분류는 한 번에 하나만 고르는 축이라 늘 펼쳐 둘 이유가 약하다.
 * 2. **자모 바로가기 줄을 없애고 묶음 제목을 sticky 로 바꿨다.** 목록 위에 자모를
 *    나열해도 한 번 뛴 다음에는 화면 밖으로 사라져 쓸모가 없었다. 지금은 스크롤하는
 *    내내 지금 보는 묶음이 화면 위에 남아, 같은 일을 자리를 차지하지 않고 한다.
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

  // 드롭다운에 붙는 개수는 **거르기 전 전체**로 센다 — 고를 때마다 숫자가 바뀌면
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
      {/* 좁은 화면에서는 드롭다운이 검색창 아래로 내려간다 — 한 줄에 억지로 붙이면
          검색창이 낱말 몇 개도 담지 못할 만큼 짧아진다 */}
      <div className="mt-8 flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1 basis-48">
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
          <CategorySelect
            facets={facets}
            total={terms.length}
            value={category}
            onChange={setCategory}
          />
        )}
      </div>

      {groups.length === 0 ? (
        <p className="mt-10 rounded-lg border border-line bg-surface px-4 py-8 text-center text-sm text-ink-dim">
          {filtered ? '찾는 용어가 없습니다.' : '아직 등록된 용어가 없습니다.'}
        </p>
      ) : (
        <div className="mt-8 space-y-10">
          {groups.map((group) => (
            <section key={group.label}>
              {/* 묶음 제목이 사이트 헤더(3.5rem) 바로 아래에 붙어 따라온다.
                  뒤로 목록이 지나가므로 배경을 깔지 않으면 글자가 겹쳐 읽힌다 —
                  헤더와 같은 규약으로 반투명 + blur 를 쓰되, backdrop-filter 를
                  지원하지 않는 브라우저에서는 불투명 배경으로 떨어진다.
                  좌우 -mx-5/px-5 는 본문 여백까지 배경을 넓히는 자리다. */}
              <h2
                id={`group-${encodeURIComponent(group.label)}`}
                className="sticky top-14 z-10 -mx-5 border-b border-line bg-bg px-5 pb-2 pt-3 text-sm font-bold tracking-tight text-ink-dim supports-[backdrop-filter]:bg-bg/85 supports-[backdrop-filter]:backdrop-blur-xl"
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
                      // 사이트 헤더(3.5rem) 위에 sticky 묶음 제목(약 2.6rem)이 더 얹혀 있다.
                      // 본문에서 `/dictionary#{slug}` 로 건너온 용어가 그 둘 뒤로 숨지
                      // 않으려면 둘을 합한 높이보다 여유가 있어야 한다.
                      className="scroll-mt-28"
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
                          <span className="text-xs text-ink-dim">{term.aliases.join(' · ')}</span>
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

/**
 * 분류 드롭다운.
 *
 * 고른 분류만 그 분류 색으로 칠한다 — 전부 칠하면 색이 필터가 아니라 장식이 된다.
 * '전체'일 때는 색을 얹지 않아 옆의 검색창과 같은 무채색으로 남는다.
 *
 * `appearance-none` 으로 브라우저 기본 모양을 걷어내고 화살표를 직접 그린다. 그러지
 * 않으면 테두리와 모서리를 브라우저가 자기 방식으로 그려서 옆의 검색창과 높이도
 * 테두리도 어긋난다 (`components/admin/ui.tsx` 의 `Select` 와 같은 이유다. 그쪽은
 * 관리 화면 배경인 `bg-bg` 를 쓰고 여기는 분류 색을 얹어야 해서 따로 둔다).
 * 펼쳤을 때의 목록은 OS 가 그리므로 손대지 않는다 — `option` 에 색을 억지로 먹이면
 * 브라우저마다 다르게 깨지고 테마 전환을 따라오지도 않는다.
 */
function CategorySelect({
  facets,
  total,
  value,
  onChange,
}: {
  facets: DictionaryFacet[];
  /** '전체' 옆에 붙는 수 — 거르기 전 용어 전체다 */
  total: number;
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const active = value === null ? null : (facets.find((f) => f.slug === value) ?? null);
  const palette = active?.palette ?? null;

  return (
    <div className="relative shrink-0">
      <label htmlFor="dictionary-category" className="sr-only">
        분류 필터
      </label>
      <select
        id="dictionary-category"
        value={value ?? ALL_CATEGORIES}
        onChange={(e) => onChange(e.target.value === ALL_CATEGORIES ? null : e.target.value)}
        // pr-9 는 화살표 자리 — 없으면 긴 분류 이름이 화살표 밑으로 들어간다
        className="cursor-pointer appearance-none rounded-lg border border-line bg-surface py-2.5 pl-3.5 pr-9 text-sm font-semibold transition-colors hover:border-ink-dim"
        style={
          palette
            ? {
                backgroundColor: `var(--pal-${palette}-bg)`,
                color: `var(--pal-${palette}-fg)`,
                borderColor: `var(--pal-${palette}-fg)`,
              }
            : undefined
        }
      >
        <option value={ALL_CATEGORIES}>전체 {total}</option>
        {facets.map((facet) => (
          <option key={facet.slug || 'uncategorized'} value={facet.slug}>
            {facet.name} {facet.count}
          </option>
        ))}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        // 클릭이 화살표에 막히지 않게 — 화살표를 눌러도 드롭다운이 열려야 한다
        className="pointer-events-none absolute right-3 top-1/2 size-3 -translate-y-1/2 opacity-70"
      >
        <path d="M2.5 4.5 6 8l3.5-3.5" />
      </svg>
    </div>
  );
}
