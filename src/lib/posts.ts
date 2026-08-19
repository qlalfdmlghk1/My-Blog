import 'server-only';

import type { Timestamp } from 'firebase-admin/firestore';

import { adminDb, hasAdminCredentials } from '@/lib/firebase/admin';
import { isCategorySlug, type CategorySlug } from '@/lib/categories';
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

export async function getPublishedPosts(): Promise<PostSummary[]> {
  if (!hasAdminCredentials()) {
    warnUnconfigured('getPublishedPosts');
    return [];
  }
  const snap = await adminDb()
    .collection(COLLECTION)
    .where('status', '==', 'published')
    .orderBy('publishedAt', 'desc')
    .get();
  return snap.docs.map((d) => strip(normalize(d.id, d.data())));
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  if (!hasAdminCredentials()) {
    warnUnconfigured('getPostBySlug');
    return null;
  }
  const snap = await adminDb()
    .collection(COLLECTION)
    .where('slug', '==', slug)
    .where('status', '==', 'published')
    .limit(1)
    .get();
  const doc = snap.docs[0];
  return doc ? normalize(doc.id, doc.data()) : null;
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
  const snap = await adminDb()
    .collection(COLLECTION)
    .where('status', '==', 'published')
    .where('tags', 'array-contains', tag)
    .orderBy('publishedAt', 'desc')
    .get();
  return snap.docs.map((d) => strip(normalize(d.id, d.data())));
}

export interface TagCount {
  tag: string;
  count: number;
}

/** 발행된 글의 태그를 집계. 글 수가 세 자리를 넘으면 별도 집계 문서로 옮길 것. */
export async function getAllTags(): Promise<TagCount[]> {
  const posts = await getPublishedPosts();
  const counts = new Map<string, number>();
  for (const p of posts) {
    for (const t of p.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'ko'));
}
