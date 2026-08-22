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
    subcategory: String(data.subcategory ?? ''),
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

  try {
    const { url } = await upload(`posts/${safeFileName(file.name)}`, file, {
      access: 'public',
      handleUploadUrl: '/api/blob-upload',
      clientPayload: await user.getIdToken(),
    });
    return url;
  } catch (error) {
    throw new Error(uploadErrorMessage(error));
  }
}

/**
 * 파일명은 URL 조각이 되므로 공백·한글·특수문자를 정리한다.
 *
 * 확장자를 먼저 떼고 판정한다. 통째로 치환하면 `사진.png` 가 `.png` 로 남는데,
 * 빈 문자열이 아니라서 기본값이 발동하지 않고 경로가 `posts/.png` 가 된다 —
 * 이름이 사라지는 것을 막으려던 폴백이 가장 흔한 경우에서 무력해진다.
 */
function safeFileName(name: string): string {
  const dot = name.lastIndexOf('.');
  const ext = dot > 0 ? name.slice(dot).replace(/[^\w.]/g, '') : '';
  const stem =
    (dot > 0 ? name.slice(0, dot) : name).replace(/[^\w\-]/g, '_').replace(/^_+|_+$/g, '') ||
    'image';
  return `${stem}${ext}`;
}

/**
 * 업로드 실패를 사람이 읽을 문구로 바꾼다.
 *
 * @vercel/blob 은 실패를 영문으로만 던지고, 토큰 발급 단계에서는 **응답 본문을 읽지 않는다** —
 * /api/blob-upload 가 상황별 한국어 메시지를 내려도 화면에는 고정 문구
 * "Failed to  retrieve the client token" 만 닿는다(라이브러리의 이중 공백 그대로).
 *
 * 그 한 문구 뒤에 라우트의 실패 넷(Admin 자격증명 없음 · Blob 토큰 없음 · 인증 토큰 없음 ·
 * 관리자 아님)이 전부 숨어 있어 **여기서 원인을 갈라낼 수단이 없다.** 그래서 관리자가
 * 스스로 확인할 수 있는 것만 안내하고, 서버 환경변수 이름은 넣지 않는다 — 화면에서 고칠
 * 수 없는 값이고, 권한 없는 로그인 사용자에게 서버 구성을 알려주는 답이 된다.
 *
 * 크기·형식 초과는 토큰이 아니라 업로드 단계에서 오므로 본문이 살아 있다. 다만 영문이라
 * 따로 되짚는다 — 실제로 가장 자주 걸리는 둘이다. 숫자는 적지 않는다: 상한의 정본은
 * 라우트(MAX_BYTES · ALLOWED_TYPES)이고, 여기 옮겨 적으면 두 곳이 갈린다.
 */
function uploadErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : '';

  if (/too large|exceeds the maximum/i.test(raw)) {
    return '이미지가 허용 크기를 넘었습니다. 더 작은 파일로 올려 주세요.';
  }
  if (/content type/i.test(raw)) {
    return '지원하지 않는 이미지 형식입니다. PNG · JPEG · GIF · WebP · AVIF 만 올릴 수 있습니다.';
  }
  if (/failed to fetch|fetch failed|not available/i.test(raw)) {
    return '업로드 서비스에 연결하지 못했습니다. 네트워크 상태를 확인하고 다시 시도하세요.';
  }
  if (/retrieve the client token/i.test(raw)) {
    return '업로드 권한을 받지 못했습니다. 로그인이 만료됐거나 관리자 권한이 없습니다 — 다시 로그인해 보세요.';
  }
  return raw || '이미지를 올리지 못했습니다.';
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
