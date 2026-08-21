import 'server-only';

import type { Timestamp } from 'firebase-admin/firestore';

import { adminDb, hasAdminCredentials } from '@/lib/firebase/admin';
import { CATEGORY_SLUGS, isCategorySlug, type CategorySlug } from '@/lib/categories';
import type { Post, PostSummary } from '@/types/post';

const COLLECTION = 'posts';

/** Firestore Timestamp | ISO 문자열 | null 을 ISO 문자열로 정규화 */
function toIso(v: unknown): string | null {
  if (!v) return null;
  if (typeof v === 'string') return v;
  const ts = v as Partial<Timestamp>;
  if (typeof ts.toDate === 'function') return ts.toDate().toISOString();
  return null;
}

function normalize(id: string, data: Record<string, unknown>): Post {
  const category = data.category;
  const created = toIso(data.createdAt) ?? new Date(0).toISOString();
  return {
    id,
    slug: String(data.slug ?? id),
    title: String(data.title ?? '(제목 없음)'),
    content: String(data.content ?? ''),
    excerpt: String(data.excerpt ?? ''),
    // 알 수 없는 카테고리는 버리지 않고 대표 카테고리로 폴백 — 글이 사라지는 편이 더 나쁘다
    category: (isCategorySlug(category) ? category : 'frontend') as CategorySlug,
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    coverImage: data.coverImage ? String(data.coverImage) : null,
    status: data.status === 'published' ? 'published' : 'draft',
    createdAt: created,
    updatedAt: toIso(data.updatedAt) ?? created,
    publishedAt: toIso(data.publishedAt),
  };
}

function strip(post: Post): PostSummary {
  const { content: _content, ...rest } = post;
  return rest;
}

/** 자격증명이 없을 때 빌드를 깨지 않기 위한 경고 (개발 편의) */
function warnUnconfigured(fn: string): void {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`[posts] Firebase Admin 미설정 — ${fn}() 가 빈 결과를 반환합니다.`);
  }
}

/**
 * 조회 실패를 빈 결과로 떨어뜨린다.
 *
 * 이유: 이 함수들은 빌드 시 generateStaticParams / 프리렌더에서 호출된다.
 * Firestore 일시 장애나 색인 미배포로 빌드 전체가 실패하면 배포 파이프라인이
 * 통째로 멈춘다. ISR 이므로 다음 재검증에서 정상 데이터로 채워진다.
 *
 * 대신 조용히 넘어가지 않는다 — 원인을 알 수 있게 반드시 로그를 남긴다.
 * (특히 색인 누락은 FAILED_PRECONDITION 과 함께 생성 링크가 함께 출력된다)
 */
async function safeQuery<T>(fn: string, run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[posts] ${fn}() 실패 — 빈 결과로 대체합니다.\n  ${message}`);
    return fallback;
  }
}

export async function getPublishedPosts(): Promise<PostSummary[]> {
  if (!hasAdminCredentials()) {
    warnUnconfigured('getPublishedPosts');
    return [];
  }
  return safeQuery(
    'getPublishedPosts',
    async () => {
      const snap = await adminDb()
        .collection(COLLECTION)
        .where('status', '==', 'published')
        .orderBy('publishedAt', 'desc')
        .get();
      return snap.docs.map((d) => strip(normalize(d.id, d.data())));
    },
    [],
  );
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  if (!hasAdminCredentials()) {
    warnUnconfigured('getPostBySlug');
    return null;
  }
  return safeQuery(
    'getPostBySlug',
    async () => {
      const snap = await adminDb()
        .collection(COLLECTION)
        .where('slug', '==', slug)
        .where('status', '==', 'published')
        .limit(1)
        .get();
      const doc = snap.docs[0];
      return doc ? normalize(doc.id, doc.data()) : null;
    },
    null,
  );
}

export async function getPublishedSlugs(): Promise<string[]> {
  const posts = await getPublishedPosts();
  return posts.map((p) => p.slug);
}

export async function getPostsByTag(tag: string): Promise<PostSummary[]> {
  if (!hasAdminCredentials()) {
    warnUnconfigured('getPostsByTag');
    return [];
  }
  return safeQuery(
    'getPostsByTag',
    async () => {
      const snap = await adminDb()
        .collection(COLLECTION)
        .where('status', '==', 'published')
        .where('tags', 'array-contains', tag)
        .orderBy('publishedAt', 'desc')
        .get();
      return snap.docs.map((d) => strip(normalize(d.id, d.data())));
    },
    [],
  );
}

export interface TagCount {
  tag: string;
  count: number;
}

/** 발행된 글의 태그를 집계. 글 수가 세 자리를 넘으면 별도 집계 문서로 옮길 것. */
export async function getAllTags(known?: PostSummary[]): Promise<TagCount[]> {
  // 호출부가 이미 목록을 읽었으면 그걸 넘겨 중복 조회를 피한다
  const posts = known ?? (await getPublishedPosts());
  const counts = new Map<string, number>();
  for (const p of posts) {
    for (const t of p.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'ko'));
}

export interface CategoryCount {
  slug: CategorySlug;
  count: number;
}

/**
 * 카테고리 6종의 글 수를 집계한다. 글이 0편인 카테고리도 빠뜨리지 않는다 —
 * 6개 고정이라는 사실 자체가 디자인이고, 빈 칸이 보여야 무엇을 쓸 차례인지 드러난다.
 *
 * 태그와 달리 Firestore 쿼리를 따로 쏘지 않는다. 카테고리 필터는
 * where(status) + where(category) + orderBy(publishedAt) 라 복합 색인이 하나 더 필요한데,
 * 글이 세 자리를 넘기 전까지는 목록 한 번 읽고 메모리에서 거르는 편이 싸다.
 * (getAllTags 도 같은 이유로 메모리 집계다)
 */
export async function getCategoryCounts(known?: PostSummary[]): Promise<CategoryCount[]> {
  const posts = known ?? (await getPublishedPosts());
  const counts = new Map<string, number>();
  for (const p of posts) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
  return CATEGORY_SLUGS.map((slug) => ({ slug, count: counts.get(slug) ?? 0 }));
}

/** 카테고리별 글 목록 — 위와 같은 이유로 메모리에서 거른다 */
export async function getPostsByCategory(slug: CategorySlug): Promise<PostSummary[]> {
  const posts = await getPublishedPosts();
  return posts.filter((p) => p.category === slug);
}
