'use client';

import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';

import {
  normalizeDictionaryCategory,
  normalizeDictionaryTerm,
  sortDictionary,
  sortDictionaryCategories,
} from '@/lib/dictionary';
import { auth, db } from '@/lib/firebase/client';
import type {
  DictionaryCategory,
  DictionaryCategoryDraft,
  DictionaryDraft,
  DictionaryTerm,
} from '@/types/dictionary';

const COLLECTION = 'dictionary';
const CATEGORY_COLLECTION = 'dictionaryCategories';

/** 관리 화면의 용어 목록. 정렬은 여기서 한다 (쿼리에서 문서가 빠지지 않도록) */
export async function listDictionary(): Promise<DictionaryTerm[]> {
  const snap = await getDocs(collection(db(), COLLECTION));
  return sortDictionary(snap.docs.map((d) => normalizeDictionaryTerm(d.id, d.data())));
}

/** slug 중복 검사 — 문서 ID 가 곧 slug 라 덮어쓰면 기존 용어가 사라진다 */
export async function isDictionarySlugTaken(slug: string): Promise<boolean> {
  return (await getDoc(doc(db(), COLLECTION, slug))).exists();
}

/**
 * 새 용어.
 *
 * 카테고리와 같은 이유로 `addDoc` 이 아니라 `setDoc(doc(id))` 을 쓴다 —
 * 문서 ID 가 곧 앵커 조각이어야 본문 링크 `/dictionary#{slug}` 가 성립한다.
 */
export async function createDictionaryTerm(slug: string, draft: DictionaryDraft): Promise<void> {
  await setDoc(doc(db(), COLLECTION, slug), draft);
}

/** slug 은 바꾸지 않는다 — 이미 발행된 글 본문의 앵커 링크가 끊긴다 */
export async function updateDictionaryTerm(slug: string, draft: DictionaryDraft): Promise<void> {
  await updateDoc(doc(db(), COLLECTION, slug), { ...draft });
}

export async function deleteDictionaryTerm(slug: string): Promise<void> {
  await deleteDoc(doc(db(), COLLECTION, slug));
}

/* ═══════════════════════════════════════════════
   용어 분류
   ═══════════════════════════════════════════════ */

/** 관리 화면의 분류 목록. 정렬은 여기서 한다 (order 없는 문서가 빠지지 않도록) */
export async function listDictionaryCategories(): Promise<DictionaryCategory[]> {
  const snap = await getDocs(collection(db(), CATEGORY_COLLECTION));
  return sortDictionaryCategories(
    snap.docs.map((d) => normalizeDictionaryCategory(d.id, d.data())),
  );
}

export async function isDictionaryCategorySlugTaken(slug: string): Promise<boolean> {
  return (await getDoc(doc(db(), CATEGORY_COLLECTION, slug))).exists();
}

/** 문서 ID 가 곧 필터 값이다 — 용어의 `category` 가 이 ID 를 가리킨다 */
export async function createDictionaryCategory(
  slug: string,
  draft: DictionaryCategoryDraft,
): Promise<void> {
  await setDoc(doc(db(), CATEGORY_COLLECTION, slug), draft);
}

/** slug 은 바꾸지 않는다 — 용어가 그 값을 가리키고 있어 끊으면 전부 미분류가 된다 */
export async function updateDictionaryCategory(
  slug: string,
  draft: DictionaryCategoryDraft,
): Promise<void> {
  await updateDoc(doc(db(), CATEGORY_COLLECTION, slug), { ...draft });
}

/**
 * 분류 삭제.
 *
 * 소속 용어가 남아 있는지는 **화면이 막는다** — 보안 규칙은 집계 질의를 할 수 없어
 * 규칙에서 확인할 수단이 없다(카테고리 삭제와 같은 판단). 실수로 지워도 용어가
 * 사라지지는 않고 미분류로 떨어진다.
 */
export async function deleteDictionaryCategory(slug: string): Promise<void> {
  await deleteDoc(doc(db(), CATEGORY_COLLECTION, slug));
}

/* ═══════════════════════════════════════════════
   AI 용어 추출 (발행 확인 화면)
   ═══════════════════════════════════════════════ */

export interface ExtractedTerm {
  term: string;
  aliases: string[];
  definition: string;
  /** 영어 원어에서 만든 slug 제안 — 빈 문자열이면 화면이 로마자로 만든다 */
  slug: string;
}

/** 이미 사전에 있어 후보에서 빠진 것 — 화면이 "이미 있음"으로 보여준다 */
export interface SkippedTerm {
  term: string;
  existing: string;
}

export interface ExtractResult {
  candidates: ExtractedTerm[];
  skipped: SkippedTerm[];
  /** 본문이 길어 뒤쪽을 보내지 못했는가 */
  truncated: boolean;
}

/**
 * 본문 → 용어 후보.
 *
 * Gemini 를 브라우저에서 직접 부르지 않는다 — 키가 번들에 실린다.
 * /api/dictionary/extract 가 서버에서 부르고, 여기서는 관리자임을 증명할
 * Firebase ID 토큰만 실어 보낸다 (revalidatePost 와 같은 방식).
 */
export async function extractDictionaryTerms(
  title: string,
  content: string,
): Promise<ExtractResult> {
  const user = auth().currentUser;
  if (!user) throw new Error('로그인이 필요합니다.');

  const res = await fetch('/api/dictionary/extract', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${await user.getIdToken()}`,
    },
    body: JSON.stringify({ title, content }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `추출에 실패했습니다 (${res.status})`);
  }
  return (await res.json()) as ExtractResult;
}
