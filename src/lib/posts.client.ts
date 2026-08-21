'use client';

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { auth, db, storage } from '@/lib/firebase/client';
import { isCategorySlug } from '@/lib/categories';
import type { Post, PostDraft, PostSummary } from '@/types/post';

const COLLECTION = 'posts';

function toIso(v: unknown): string | null {
  if (!v) return null;
  if (typeof v === 'string') return v;
  if (v instanceof Timestamp) return v.toDate().toISOString();
  return null;
}

function normalize(id: string, data: Record<string, unknown>): Post {
  const created = toIso(data.createdAt) ?? new Date().toISOString();
  return {
    id,
    slug: String(data.slug ?? id),
    title: String(data.title ?? ''),
    content: String(data.content ?? ''),
    excerpt: String(data.excerpt ?? ''),
    category: isCategorySlug(data.category) ? data.category : 'frontend',
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    coverImage: data.coverImage ? String(data.coverImage) : null,
    status: data.status === 'published' ? 'published' : 'draft',
    createdAt: created,
    updatedAt: toIso(data.updatedAt) ?? created,
    publishedAt: toIso(data.publishedAt),
  };
}

/** 관리자 목록 — draft 포함 전체. 보안 규칙이 관리자 UID 만 허용한다. */
export async function listAllPosts(): Promise<PostSummary[]> {
  const snap = await getDocs(
    query(collection(db(), COLLECTION), orderBy('updatedAt', 'desc')),
  );
  return snap.docs.map((d) => {
    const { content: _c, ...rest } = normalize(d.id, d.data());
    return rest;
  });
}

export async function getPostById(id: string): Promise<Post | null> {
  const snap = await getDoc(doc(db(), COLLECTION, id));
  return snap.exists() ? normalize(snap.id, snap.data()) : null;
}

/** slug 중복 검사 — 발행 URL 이 충돌하면 한쪽 글에 접근할 수 없게 된다 */
export async function isSlugTaken(slug: string, exceptId?: string): Promise<boolean> {
  const snap = await getDocs(
    query(collection(db(), COLLECTION), where('slug', '==', slug)),
  );
  return snap.docs.some((d) => d.id !== exceptId);
}

export async function createPost(draft: PostDraft): Promise<string> {
  const now = serverTimestamp();
  const created = await addDoc(collection(db(), COLLECTION), {
    ...draft,
    createdAt: now,
    updatedAt: now,
    publishedAt: draft.status === 'published' ? now : null,
  });
  return created.id;
}

export async function updatePost(
  id: string,
  draft: PostDraft,
  wasPublished: boolean,
): Promise<void> {
  await updateDoc(doc(db(), COLLECTION, id), {
    ...draft,
    updatedAt: serverTimestamp(),
    // 최초 발행 시점만 기록하고 재수정으로 덮어쓰지 않는다 (RSS·정렬 기준)
    ...(draft.status === 'published' && !wasPublished
      ? { publishedAt: serverTimestamp() }
      : {}),
    ...(draft.status === 'draft' ? { publishedAt: null } : {}),
  });
}

export async function deletePost(id: string): Promise<void> {
  await deleteDoc(doc(db(), COLLECTION, id));
}

/** 이미지 업로드 → 다운로드 URL. 붙여넣기 핸들러가 이 URL 을 마크다운으로 삽입한다. */
export async function uploadImage(file: File): Promise<string> {
  const safeName = file.name.replace(/[^\w.\-]/g, '_');
  const path = `posts/${Date.now()}-${safeName}`;
  const snap = await uploadBytes(ref(storage(), path), file, {
    contentType: file.type || 'application/octet-stream',
  });
  return getDownloadURL(snap.ref);
}

/**
 * 발행/수정 후 해당 경로의 정적 페이지를 재생성한다.
 * 쓰기는 클라이언트에서 일어나므로 서버가 호출자를 신뢰할 수 없다 →
 * Firebase ID 토큰을 보내고 서버가 verifyIdToken + UID 대조로 검증한다.
 */
export async function revalidatePost(
  slug: string,
  tags: string[],
  categories: string[],
): Promise<void> {
  const user = auth().currentUser;
  if (!user) throw new Error('로그인이 필요합니다.');
  const res = await fetch('/api/revalidate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${await user.getIdToken()}`,
    },
    body: JSON.stringify({ slug, tags, categories }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `재생성 실패 (${res.status})`);
  }
}
