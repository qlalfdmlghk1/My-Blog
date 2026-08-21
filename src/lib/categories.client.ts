'use client';

import { deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc, collection } from 'firebase/firestore';

import { normalizeCategory, sortCategories } from '@/lib/categories';
import { db } from '@/lib/firebase/client';
import type { Category, CategoryDraft } from '@/types/category';

const COLLECTION = 'categories';

/**
 * 관리 화면의 카테고리 목록 — 초안 여부와 무관하게 전부.
 * 정렬은 여기서 한다 (order 필드가 없는 문서가 쿼리에서 빠지지 않도록).
 */
export async function listCategories(): Promise<Category[]> {
  const snap = await getDocs(collection(db(), COLLECTION));
  return sortCategories(snap.docs.map((d) => normalizeCategory(d.id, d.data())));
}

/** slug 중복 검사 — 문서 ID 가 곧 slug 라 덮어쓰면 기존 카테고리가 사라진다 */
export async function isCategorySlugTaken(slug: string): Promise<boolean> {
  const snap = await getDoc(doc(db(), COLLECTION, slug));
  return snap.exists();
}

/**
 * 새 카테고리.
 *
 * `addDoc` 이 아니라 `setDoc(doc(id))` 을 쓴다 — 문서 ID 가 URL 조각이어야
 * 글의 `category` 값으로 카테고리를 바로 찾을 수 있다. 자동 ID 를 쓰면
 * `/categories/aB3x9...` 같은 주소가 된다.
 */
export async function createCategory(slug: string, draft: CategoryDraft): Promise<void> {
  await setDoc(doc(db(), COLLECTION, slug), draft);
}

/** slug 는 바꾸지 않는다 — 바꾸면 이미 발행된 카테고리 URL 이 깨지고 글의 참조도 끊긴다 */
export async function updateCategory(slug: string, draft: CategoryDraft): Promise<void> {
  await updateDoc(doc(db(), COLLECTION, slug), { ...draft });
}

export async function deleteCategory(slug: string): Promise<void> {
  await deleteDoc(doc(db(), COLLECTION, slug));
}
