import 'server-only';

import {
  CATEGORY_COLLECTION,
  COLLECTION,
  normalizeDictionaryCategory,
  normalizeDictionaryTerm,
  referencesByTerm,
  sortDictionary,
  sortDictionaryCategories,
} from '@/lib/dictionary';
import { adminDb, hasAdminCredentials } from '@/lib/firebase/admin';
import { safeRead, warnUnconfigured } from '@/lib/safe-read';
import type { DictionaryReference } from '@/lib/dictionary';
import type { DictionaryCategory, DictionaryTerm } from '@/types/dictionary';

export { CATEGORY_COLLECTION, COLLECTION };

/**
 * 용어 목록 — 사전 페이지와 본문 자동 링크가 함께 쓰는 유일한 읽기 지점.
 *
 * 카테고리와 마찬가지로 코드에 기본 목록을 두지 않는다. 비어 있으면 비어 있는
 * 대로 내보내고 화면이 빈 상태를 안내한다.
 *
 * 정렬은 클라이언트에서 한다 — orderBy 를 쓰면 해당 필드가 없는 문서가
 * 쿼리 결과에서 통째로 빠진다.
 *
 * 실패하면 빈 배열이고, 그 글은 **용어 링크 없이 그대로 그려진다.**
 * 사전 조회 한 번이 글 본문을 못 띄우는 이유가 되어선 안 된다 —
 * 링크는 읽기를 돕는 장치이지 본문의 일부가 아니다.
 */
export async function getDictionary(): Promise<DictionaryTerm[]> {
  if (!hasAdminCredentials()) {
    warnUnconfigured('getDictionary');
    return [];
  }
  return safeRead(
    'getDictionary',
    async () => {
      const snap = await adminDb().collection(COLLECTION).get();
      return sortDictionary(snap.docs.map((d) => normalizeDictionaryTerm(d.id, d.data())));
    },
    [],
  );
}

/**
 * 용어 분류 목록 — 사전 페이지의 필터 축.
 *
 * 용어와 마찬가지로 코드에 기본 목록을 두지 않는다. 실패하면 빈 배열이고,
 * 그때 사전은 **필터 없이 전체 목록으로** 뜬다 — 분류 조회 한 번이 사전을
 * 못 띄우는 이유가 되어선 안 된다.
 */
export async function getDictionaryCategories(): Promise<DictionaryCategory[]> {
  if (!hasAdminCredentials()) {
    warnUnconfigured('getDictionaryCategories');
    return [];
  }
  return safeRead(
    'getDictionaryCategories',
    async () => {
      const snap = await adminDb().collection(CATEGORY_COLLECTION).get();
      return sortDictionaryCategories(
        snap.docs.map((d) => normalizeDictionaryCategory(d.id, d.data())),
      );
    },
    [],
  );
}

/**
 * 용어마다 "그 용어가 나오는 발행 글" 목록 — 사전의 '관련글'이 쓴다.
 *
 * 발행 글을 **본문까지** 읽는다. `getPublishedPosts()` 는 전송량을 줄이려고 본문을
 * 떼어내므로 여기서는 쓸 수 없다 — 어느 글에 그 낱말이 있는지는 본문을 봐야만 안다.
 * 읽기는 이 한 번이고, 사전 페이지는 ISR(1시간)이라 요청마다 도는 계산이 아니다.
 *
 * 실패하면 빈 목록이다. 그때 사전은 정의만 보여준다 — 관련글은 읽기를 돕는 장치이지
 * 사전 항목의 본체가 아니다.
 */
export async function getDictionaryReferences(
  terms: readonly DictionaryTerm[],
): Promise<Record<string, DictionaryReference[]>> {
  if (terms.length === 0) return {};
  if (!hasAdminCredentials()) {
    warnUnconfigured('getDictionaryReferences');
    return {};
  }
  return safeRead(
    'getDictionaryReferences',
    async () => {
      const snap = await adminDb()
        .collection('posts')
        .where('status', '==', 'published')
        .get();
      const posts = snap.docs.map((d) => ({
        slug: String(d.get('slug') ?? d.id),
        title: String(d.get('title') ?? ''),
        content: String(d.get('content') ?? ''),
      }));
      return referencesByTerm(terms, posts);
    },
    {},
  );
}
