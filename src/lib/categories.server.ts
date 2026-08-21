import 'server-only';

import { normalizeCategory, sortCategories } from '@/lib/categories';
import { adminDb, hasAdminCredentials } from '@/lib/firebase/admin';
import { safeRead, warnUnconfigured } from '@/lib/safe-read';
import type { Category } from '@/types/category';

export const COLLECTION = 'categories';

/**
 * 카테고리 목록 — 공개 화면과 프리렌더가 쓰는 유일한 읽기 지점.
 *
 * **기본값으로 떨어지지 않는다.** 코드에 기본 카테고리를 두고 컬렉션이 비었을 때
 * 그걸 내보내면, 관리 화면에서 전부 지워도 되살아나 "처음부터 내가 짠다"가
 * 불가능해진다. 비어 있으면 비어 있는 대로 내보내고 화면이 빈 상태를 안내한다.
 *
 * 정렬은 클라이언트에서 한다 — orderBy 를 쓰면 order 필드가 없는 문서가
 * 쿼리 결과에서 통째로 빠진다(Firestore 는 해당 필드가 없는 문서를 제외한다).
 */
export async function getCategories(): Promise<Category[]> {
  if (!hasAdminCredentials()) {
    warnUnconfigured('getCategories');
    return [];
  }
  return safeRead(
    'getCategories',
    async () => {
      const snap = await adminDb().collection(COLLECTION).get();
      return sortCategories(snap.docs.map((d) => normalizeCategory(d.id, d.data())));
    },
    [],
  );
}

/** 알 수 없는 slug 는 null — 카테고리 페이지가 404 를 내는 근거가 된다 */
export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const categories = await getCategories();
  return categories.find((c) => c.slug === slug) ?? null;
}
