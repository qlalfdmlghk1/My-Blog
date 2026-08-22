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
import { upload } from '@vercel/blob/client';

import { auth, db } from '@/lib/firebase/client';
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
    category: String(data.category ?? ''),
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

/**
 * 이미지 업로드 → 공개 URL. 붙여넣기 핸들러가 이 URL 을 마크다운으로 삽입한다.
 *
 * 파일은 서버를 거치지 않고 브라우저에서 Vercel Blob 으로 직행한다.
 * /api/blob-upload 는 허가 토큰만 내주며, 그 토큰을 받으려면 관리자여야 한다
 * (Firebase ID 토큰을 clientPayload 로 보내 서버가 검증한다).
 * 파일 크기·형식 제한도 그 라우트가 정한다 — 여기서 거르면 우회할 수 있다.
 */
export async function uploadImage(file: File): Promise<string> {
  const user = auth().currentUser;
  if (!user) throw new Error('로그인이 필요합니다.');

  // 파일명은 URL 조각이 되므로 공백·한글·특수문자를 정리한다.
  // 이름이 통째로 사라지는 경우(전부 특수문자)를 대비해 기본값을 둔다.
  const safeName = file.name.replace(/[^\w.\-]/g, '_').replace(/^_+/, '') || 'image';

  const { url } = await upload(`posts/${safeName}`, file, {
    access: 'public',
    handleUploadUrl: '/api/blob-upload',
    clientPayload: await user.getIdToken(),
  });
  return url;
}

/**
 * 발행/수정 후 해당 경로의 정적 페이지를 재생성한다.
 * 쓰기는 클라이언트에서 일어나므로 서버가 호출자를 신뢰할 수 없다 →
 * Firebase ID 토큰을 보내고 서버가 verifyIdToken + UID 대조로 검증한다.
 */
export async function revalidatePost(slug: string, tags: string[]): Promise<void> {
  const user = auth().currentUser;
  if (!user) throw new Error('로그인이 필요합니다.');
  const res = await fetch('/api/revalidate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${await user.getIdToken()}`,
    },
    body: JSON.stringify({ slug, tags }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `재생성 실패 (${res.status})`);
  }
}

/**
 * 글과 무관한 갱신 — 카테고리를 만들거나 고쳤을 때 쓴다.
 * 목록 · RSS · sitemap · 카테고리 페이지 전체가 다시 만들어진다
 * (서버가 slug 빈 값이면 글 경로만 건너뛴다).
 */
export async function revalidateTaxonomy(): Promise<void> {
  return revalidatePost('', []);
}
