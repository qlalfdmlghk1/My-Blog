import 'server-only';

import type { Timestamp } from 'firebase-admin/firestore';

import { getCategories, getSubcategories } from '@/lib/categories.server';
import { adminDb, hasAdminCredentials } from '@/lib/firebase/admin';
import { safeRead, warnUnconfigured } from '@/lib/safe-read';
import type { Category, Subcategory } from '@/types/category';
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
  const created = toIso(data.createdAt) ?? new Date(0).toISOString();
  return {
    id,
    slug: String(data.slug ?? id),
    title: String(data.title ?? '(제목 없음)'),
    content: String(data.content ?? ''),
    excerpt: String(data.excerpt ?? ''),
    // 카테고리는 런타임에 생기므로 여기서 유효성을 판정하지 않는다. 목록에 없는
    // slug 는 화면이 무채색으로 떨어뜨린다 — 글을 잃는 편이 더 나쁘다.
    category: String(data.category ?? ''),
    subcategory: String(data.subcategory ?? ''),
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

/**
 * `getPublishedPosts()` 와 같은 읽기지만 **폴백을 썼는지(`degraded`)를 함께 돌려준다.**
 *
 * 폴백이 빈 배열이라 조회 실패와 "정말 0개"가 호출부에서 구분되지 않는다. 페이지네이션
 * 처럼 범위 밖이면 404 를 내는 화면이 그 둘을 섞으면, 일시 장애 한 번에 살아 있는
 * `/page/3` 이 404 로 굳고 `revalidate` 주기(1시간) 동안 그대로 남는다.
 * 그런 화면은 이 함수를 쓰고 `degraded` 일 때 404 대신 throw 해서 ISR 이 직전 정적
 * 페이지를 계속 서빙하게 한다. (분류의 `readCategories` 와 같은 이유·같은 형태)
 */
export async function readPublishedPosts(): Promise<{
  posts: PostSummary[];
  degraded: boolean;
}> {
  if (!hasAdminCredentials()) {
    warnUnconfigured('getPublishedPosts');
    return { posts: [], degraded: true };
  }
  // safeRead 를 쓰지 않는다 — fallback 인자가 즉시 평가돼 실패 여부를 표시할 수 없다.
  // 로그 형식은 safeRead 와 맞춘다.
  try {
    const snap = await adminDb()
      .collection(COLLECTION)
      .where('status', '==', 'published')
      .orderBy('publishedAt', 'desc')
      .get();
    return { posts: snap.docs.map((d) => strip(normalize(d.id, d.data()))), degraded: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[firestore] getPublishedPosts() 실패 — 기본값으로 대체합니다.
  ${message}`);
    return { posts: [], degraded: true };
  }
}

export async function getPublishedPosts(): Promise<PostSummary[]> {
  return (await readPublishedPosts()).posts;
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  if (!hasAdminCredentials()) {
    warnUnconfigured('getPostBySlug');
    return null;
  }
  return safeRead(
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

/*
 * getPostsByTag() 는 제거했다 — 태그 목록도 카테고리와 같이 getPublishedPosts() 를
 * 메모리에서 거른다. 조회 두 벌을 유지하면 사이드바 집계(메모리)와 목록(쿼리)의
 * 출처가 갈려, 색인이 없을 때 "사이드바엔 3개, 본문엔 0개" 같은 모순이 생긴다.
 * firestore.indexes.json 의 tags 복합 색인은 지금 쓰이지 않는다 (정리는 후속).
 */

export interface TagCount {
  tag: string;
  count: number;
}

/** 많이 쓰인 태그부터, 같으면 가나다순 — 트리와 목록이 같은 순서를 보게 한다 */
function sortTags(counts: Map<string, number>): TagCount[] {
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'ko'));
}

/**
 * 발행된 글의 태그를 카테고리 구분 없이 집계.
 * sitemap 과 태그 페이지 프리렌더 목록이 쓴다 — 화면 트리는 getCategoryTree 쪽이다.
 * 글 수가 세 자리를 넘으면 별도 집계 문서로 옮길 것.
 */
export async function getAllTags(known?: PostSummary[]): Promise<TagCount[]> {
  // 호출부가 이미 목록을 읽었으면 그걸 넘겨 중복 조회를 피한다
  const posts = known ?? (await getPublishedPosts());
  const counts = new Map<string, number>();
  for (const p of posts) {
    for (const t of p.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return sortTags(counts);
}

export interface SubcategoryNode extends Subcategory {
  count: number;
}

export interface CategoryNode extends Category {
  count: number;
  /** 이 카테고리의 소분류 — 사이드바 트리의 두 번째 단 */
  subs: SubcategoryNode[];
  /**
   * 소분류가 없는 글 수. 소분류는 필수지만, 소분류를 지운 뒤 남은 글이나
   * 예전 데이터가 여기 잡힌다 — 0 이 아니면 관리 화면이 정리를 안내한다.
   */
  looseCount: number;
}

/**
 * 사이드바가 그리는 분류 트리 — 카테고리 6종과 각 카테고리 안의 태그 집계.
 *
 * **저장 구조는 여전히 2단(카테고리 → 글)이다.** 소주제 필드를 만들지 않고
 * "그 카테고리 글에 붙은 태그"를 집계해 3단처럼 보이게만 한다.
 * 필드로 못 박으면 여러 카테고리에 걸치는 기술(#Next.js 가 프론트엔드 글에도
 * 트러블슈팅 글에도 붙는 경우)을 한 곳에만 둘 수 있게 되고, 글이 적은 지금은
 * 빈 소주제가 줄줄이 노출된다. 용어 정의는 `.claude/domain/taxonomy.md`.
 *
 * 글이 0편인 카테고리도 빠뜨리지 않는다 — 6개 고정이라는 사실 자체가 디자인이고,
 * 빈 칸이 보여야 무엇을 쓸 차례인지 드러난다.
 *
 * Firestore 쿼리를 따로 쏘지 않는다. 카테고리 필터는
 * where(status) + where(category) + orderBy(publishedAt) 라 복합 색인이 하나 더 필요한데,
 * 글이 세 자리를 넘기 전까지는 목록 한 번 읽고 메모리에서 거르는 편이 싸다.
 */
export async function getCategoryTree(
  known?: PostSummary[],
  knownCategories?: Category[],
): Promise<CategoryNode[]> {
  const [posts, categories, subcategories] = await Promise.all([
    known ? Promise.resolve(known) : getPublishedPosts(),
    knownCategories ?? getCategories(),
    getSubcategories(),
  ]);

  const catCount = new Map<string, number>();
  const looseCount = new Map<string, number>();
  // 소분류 집계 키는 "카테고리/소분류" — 서로 다른 카테고리가 같은 소분류 slug 을
  // 쓸 수 있으므로(프론트엔드/react, 백엔드/react) slug 만으로는 섞인다.
  const subCount = new Map<string, number>();

  for (const p of posts) {
    catCount.set(p.category, (catCount.get(p.category) ?? 0) + 1);
    if (p.subcategory) {
      const key = `${p.category}/${p.subcategory}`;
      subCount.set(key, (subCount.get(key) ?? 0) + 1);
    } else {
      looseCount.set(p.category, (looseCount.get(p.category) ?? 0) + 1);
    }
  }

  return categories.map((category) => ({
    ...category,
    count: catCount.get(category.slug) ?? 0,
    looseCount: looseCount.get(category.slug) ?? 0,
    subs: subcategories
      .filter((s) => s.category === category.slug)
      .map((s) => ({ ...s, count: subCount.get(`${s.category}/${s.slug}`) ?? 0 })),
  }));
}

/**
 * 카테고리별 글 목록 — 위와 같은 이유로 메모리에서 거른다.
 * getAllTags·getCategoryTree 와 같은 known 파라미터를 받는다 — 호출부가 이미 읽은
 * 목록을 넘길 수 있어야 한 화면에서 같은 컬렉션을 두 번 읽지 않는다.
 */
export async function getPostsByCategory(
  slug: string,
  known?: PostSummary[],
): Promise<PostSummary[]> {
  const posts = known ?? (await getPublishedPosts());
  return posts.filter((p) => p.category === slug);
}

/** 태그별 글 목록의 메모리 판 — 사이드바 집계와 같은 목록을 보게 해 숫자가 어긋나지 않는다 */
export function filterPostsByTag(posts: PostSummary[], tag: string): PostSummary[] {
  return posts.filter((p) => p.tags.includes(tag));
}

/** 소분류별 글 목록 — 카테고리와 같은 이유로 메모리에서 거른다 */
export function filterPostsBySubcategory(
  posts: PostSummary[],
  category: string,
  subcategory: string,
): PostSummary[] {
  return posts.filter((p) => p.category === category && p.subcategory === subcategory);
}
