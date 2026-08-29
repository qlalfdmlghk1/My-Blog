'use client';

import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';

import { normalizeGlossaryTerm, sortGlossary } from '@/lib/glossary';
import { db } from '@/lib/firebase/client';
import type { GlossaryDraft, GlossaryTerm } from '@/types/glossary';

const COLLECTION = 'glossary';

/** 관리 화면의 용어 목록. 정렬은 여기서 한다 (쿼리에서 문서가 빠지지 않도록) */
export async function listGlossary(): Promise<GlossaryTerm[]> {
  const snap = await getDocs(collection(db(), COLLECTION));
  return sortGlossary(snap.docs.map((d) => normalizeGlossaryTerm(d.id, d.data())));
}

/** slug 중복 검사 — 문서 ID 가 곧 slug 라 덮어쓰면 기존 용어가 사라진다 */
export async function isGlossarySlugTaken(slug: string): Promise<boolean> {
  return (await getDoc(doc(db(), COLLECTION, slug))).exists();
}

/**
 * 새 용어.
 *
 * 카테고리와 같은 이유로 `addDoc` 이 아니라 `setDoc(doc(id))` 을 쓴다 —
 * 문서 ID 가 곧 앵커 조각이어야 본문 링크 `/glossary#{slug}` 가 성립한다.
 */
export async function createGlossaryTerm(slug: string, draft: GlossaryDraft): Promise<void> {
  await setDoc(doc(db(), COLLECTION, slug), draft);
}

/** slug 은 바꾸지 않는다 — 이미 발행된 글 본문의 앵커 링크가 끊긴다 */
export async function updateGlossaryTerm(slug: string, draft: GlossaryDraft): Promise<void> {
  await updateDoc(doc(db(), COLLECTION, slug), { ...draft });
}

export async function deleteGlossaryTerm(slug: string): Promise<void> {
  await deleteDoc(doc(db(), COLLECTION, slug));
}
