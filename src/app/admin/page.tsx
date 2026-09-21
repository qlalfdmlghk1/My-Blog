'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { CategoryBadge } from '@/components/CategoryBadge';
import { TagChip } from '@/components/TagChip';
import { StatusPill, btnPrimary, btnQuiet, btnSecondary } from '@/components/admin/ui';
import { takeAdminNotice } from '@/lib/admin-notice';
import { listCategories } from '@/lib/categories.client';
import { formatDate } from '@/lib/date';
import { listAllPosts } from '@/lib/posts.client';
import type { Category } from '@/types/category';
import type { PostSummary } from '@/types/post';

export default function AdminPage() {
  const [posts, setPosts] = useState<PostSummary[] | null>(null);
  // 배지 이름·색은 카테고리 문서에 있다 — 카드마다 조회하지 않도록 한 번 읽어 맵으로 넘긴다
  const [categories, setCategories] = useState<Map<string, Category>>(new Map());
  const [error, setError] = useState<string | null>(null);
  /** 카테고리만 실패한 경우 — 글 목록은 살아 있으므로 경고로만 알린다 */
  const [categoryError, setCategoryError] = useState<string | null>(null);
  /** 발행 화면이 넘겨준 한 줄 안내(예: 커버 생성 실패). 한 번 보이고 사라진다 */
  const [notice, setNotice] = useState<string | null>(null);

  /**
   * 둘을 Promise.all 로 묶지 않는다 — 한쪽이 실패하면 다른 쪽 결과까지 버려진다.
   * 실제로 카테고리 읽기 권한만 막혔을 때 글 목록이 통째로 사라지는 일이 있었다.
   * 글이 이 화면의 본체이므로 카테고리는 없으면 없는 대로 그린다(배지가 무채색이 된다).
   */
  useEffect(() => {
    setNotice(takeAdminNotice());

    listAllPosts()
      .then(setPosts)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : '목록을 불러오지 못했습니다.'),
      );

    listCategories()
      .then((cats) => setCategories(new Map(cats.map((c) => [c.slug, c]))))
      .catch((err: unknown) => setCategoryError(describeCategoryFailure(err)));
  }, []);

  const drafts = posts?.filter((p) => p.status === 'draft') ?? [];
  const published = posts?.filter((p) => p.status === 'published') ?? [];

  return (
    <div className="mx-auto max-w-shell px-5 py-8 sm:py-10">
      {/*
        큰 제목 · 한 줄 설명 · 숫자 한 줄 · 구분선 — 예전 공개 홈 상단 소개(SiteIntro, 지금은
        히어로 캐러셀로 바뀌어 없다)의 짜임을 그대로 가져왔다.

        한동안 숫자를 회색 상자 세 개에 넣어 가로로 늘어놓았는데, 상자마다 든 것이
        작은 라벨과 숫자 하나뿐이라 넓고 납작한 빈 판 세 장으로 보였다. 그 소개가
        회색 판을 걷어낸 것과 같은 이유로 여기서도 판을 없애고, 숫자는 설명 아래
        한 줄로 붙인다. 위계는 배경이 아니라 글자 크기가 만든다.

        오른쪽 동작 세 개도 같은 무게의 테두리 버튼이었다. 카테고리 · 용어 사전은
        다른 화면으로 가는 길이고 새 글 쓰기만 이 화면의 주요 동작이므로, 앞의 둘은
        테두리를 벗겨 조용히 두고 주요 버튼 하나만 색을 갖게 한다.
      */}
      <header className="border-b border-line pb-7">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">글 관리</h1>
            <p className="mt-2 text-sm text-ink-dim">
              발행하면 해당 글과 목록 · RSS · sitemap 이 함께 재생성됩니다.
            </p>
          </div>
          <nav aria-label="관리 메뉴" className="flex items-center gap-1">
            <Link href="/admin/categories" className={btnQuiet}>
              카테고리
            </Link>
            <Link href="/admin/dictionary" className={btnQuiet}>
              용어 사전
            </Link>
            <Link href="/admin/comments" className={btnQuiet}>
              댓글
            </Link>
            <Link href="/admin/write" className={`${btnPrimary} ml-2`}>
              새 글 쓰기
            </Link>
          </nav>
        </div>

        {/* 숫자는 목록을 세지 않아도 상태를 알려준다 — 특히 "쓰다 만 글"의 존재.
            공개 홈과 달리 0 이어도 감추지 않는다. 관리자에게는 "임시 0" 이 정보다. */}
        <dl className="mt-6 flex flex-wrap items-baseline gap-x-6 gap-y-2 text-xs text-ink-dim">
          <Stat label="전체" value={posts?.length} />
          <Stat label="발행" value={posts ? published.length : undefined} />
          <Stat label="임시" value={posts ? drafts.length : undefined} />
        </dl>
      </header>

      {error && (
        <p
          role="alert"
          className="mt-6 rounded-lg border border-line px-3.5 py-3 text-sm"
          style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger-fg)' }}
        >
          {error}
        </p>
      )}

      {notice && (
        <p role="status" className="mt-6 rounded-lg border border-ink-dim px-3.5 py-3 text-sm leading-relaxed">
          {notice}
        </p>
      )}

      {categoryError && (
        <p role="status" className="mt-6 rounded-lg border border-ink-dim px-3.5 py-3 text-sm leading-relaxed">
          {categoryError}
        </p>
      )}

      {!posts && !error && <SkeletonList />}

      {posts?.length === 0 && (
        <div className="mt-6 rounded-xl border border-dashed border-line px-5 py-16 text-center">
          <p className="text-sm font-semibold">아직 글이 없습니다</p>
          <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-ink-dim">
            첫 글을 쓰면 홈 · 카테고리 · RSS 에 함께 실립니다. 임시저장해 두면 공개되지 않습니다.
          </p>
          <Link href="/admin/write" className={`${btnSecondary} mt-5 bg-bg`}>
            첫 글 쓰기
          </Link>
        </div>
      )}

      {/* 쓰다 만 글을 위로 올린다 — 관리자가 다시 여는 건 대개 이쪽이다 */}
      {drafts.length > 0 && (
        <PostSection title="임시" posts={drafts} categories={categories} />
      )}
      {published.length > 0 && (
        <PostSection title="발행" posts={published} categories={categories} />
      )}
    </div>
  );
}

/**
 * 카테고리 읽기 실패는 원인이 사실상 하나다 — 보안 규칙에 `categories` 컬렉션이
 * 아직 없어서 기본 차단 규칙에 걸리는 것. Firebase 원문만 띄우면
 * "Missing or insufficient permissions." 로 끝나 무엇을 해야 할지 알 수 없다.
 */
function describeCategoryFailure(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (/permission/i.test(message)) {
    return '카테고리를 읽지 못했습니다 — 보안 규칙이 아직 배포되지 않은 것 같습니다. npm run rules:deploy 를 실행하세요. (글 목록은 정상입니다)';
  }
  return `카테고리를 읽지 못했습니다: ${message}`;
}

/**
 * 라벨과 숫자를 한 덩어리로.
 * 숫자만 본문 색·큰 글자로 올려 시선이 수에 먼저 닿게 한다.
 * 아직 안 읽었으면(undefined) 자리를 비우지 않고 '–' 를 둔다 — 읽힌 뒤 줄이 튀지 않는다.
 */
function Stat({ label, value }: { label: string; value?: number }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt>{label}</dt>
      <dd className="text-base font-bold tabular-nums text-ink">
        {value ?? <span className="font-normal text-ink-dim">–</span>}
        {value !== undefined && <span className="ml-0.5 text-xs font-normal text-ink-dim">편</span>}
      </dd>
    </div>
  );
}

function PostSection({
  title,
  posts,
  categories,
}: {
  title: string;
  posts: PostSummary[];
  categories: Map<string, Category>;
}) {
  return (
    <section className="mt-8">
      <h2 className="mb-2.5 flex items-baseline gap-2 text-[11px] font-bold uppercase tracking-wider text-ink-dim">
        {title}
        <span className="tabular-nums">{posts.length}</span>
      </h2>
      <ul className="space-y-2">
        {posts.map((post) => (
          <PostRow key={post.id} post={post} category={categories.get(post.category)} />
        ))}
      </ul>
    </section>
  );
}

/** 태그가 많은 글이 한 줄을 다 먹지 않게 앞의 몇 개만 보여준다 */
const TAG_PREVIEW = 4;

function PostRow({ post, category }: { post: PostSummary; category?: Category }) {
  const shown = post.tags.slice(0, TAG_PREVIEW);
  const hidden = post.tags.length - shown.length;

  return (
    /**
     * 행 어디를 눌러도 편집기로 들어간다 — 제목 글자만 링크였을 때 과녁이 너무 좁았다.
     * <li onClick> 대신 제목 <Link> 의 ::after 를 행 전체로 늘린다(stretched link).
     * 링크는 그대로 하나라 새 탭 열기·키보드 포커스·스크린리더 링크 목록이 살아 있다.
     * 눌리는 범위는 원래 있던 행 배경(hover:bg-surface)이 그대로 보여준다.
     */
    <li className="relative rounded-xl border border-line p-4 transition-[background-color,box-shadow] duration-200 hover:bg-surface hover:shadow-card focus-within:bg-surface focus-within:shadow-card motion-reduce:transition-none">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill status={post.status} />
        <CategoryBadge slug={post.category} category={category} size="sm" />
        <time dateTime={post.updatedAt} className="ml-auto text-[11px] tabular-nums text-ink-dim">
          {formatDate(post.updatedAt)} 수정
        </time>
      </div>

      <h3 className="mt-2 text-[15px] font-bold leading-snug tracking-tight sm:text-base">
        <Link
          href={`/admin/edit/${post.id}`}
          className="after:absolute after:inset-0 after:content-['']"
        >
          {post.title || '(제목 없음)'}
        </Link>
      </h3>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="font-mono text-[11px] text-ink-dim">/{post.slug}</span>
        {shown.map((tag) => (
          <TagChip key={tag} tag={tag} />
        ))}
        {hidden > 0 && <span className="text-[11px] text-ink-dim">+{hidden}</span>}

        {/* 늘어난 제목 링크 위로 올린다 — 특히 "보기 ↗" 는 목적지가 다르다 */}
        <div className="relative z-10 ml-auto flex items-center gap-3 text-xs font-medium">
          {/* 발행된 글만 공개 경로가 존재한다 — 임시글 링크는 404 로 간다 */}
          {post.status === 'published' && (
            <a
              href={`/posts/${post.slug}`}
              target="_blank"
              rel="noreferrer"
              className="text-ink-dim hover:text-ink"
            >
              보기 ↗
            </a>
          )}
          <Link href={`/admin/edit/${post.id}`} className="hover:underline">
            수정
          </Link>
        </div>
      </div>
    </li>
  );
}

/** 목록이 몇 줄짜리인지 미리 보여줘 로딩 중 화면이 튀지 않게 한다 */
function SkeletonList() {
  return (
    <ul className="mt-8 space-y-2" aria-hidden>
      {[0, 1, 2].map((i) => (
        <li key={i} className="animate-pulse rounded-xl border border-line p-4">
          <div className="h-4 w-24 rounded bg-surface" />
          <div className="mt-3 h-4 w-2/3 rounded bg-surface" />
          <div className="mt-3 h-3 w-1/3 rounded bg-surface" />
        </li>
      ))}
    </ul>
  );
}
