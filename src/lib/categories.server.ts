import 'server-only';

import { DEFAULT_CATEGORIES, normalizeCategory, sortCategories } from '@/lib/categories';
import { adminDb, hasAdminCredentials } from '@/lib/firebase/admin';
import { safeRead, warnUnconfigured } from '@/lib/safe-read';
import type { Category } from '@/types/category';

export const COLLECTION = 'categories';

/**
 * 카테고리 목록 — 공개 화면과 프리렌더가 쓰는 유일한 읽기 지점.
 *
 * 컬렉션이 비어 있으면 `DEFAULT_CATEGORIES` 로 떨어진다. 배포 직후 아직 아무것도
 * 만들지 않은 상태에서 블로그가 "카테고리 0개"로 나오면, 사이드바도 카테고리
 * 페이지도 통째로 사라져 사이트가 고장 난 것처럼 보인다. 기본 6개가 서 있으면
 * 관리 화면에서 고쳐 나가면 된다.
 *
 * 그래서 관리 화면에서 6개를 **전부** 지우면 기본값이 다시 나타난다.
 * 의도적으로 비우고 싶은 상황은 없다고 보고 이 동작을 택했다.
 *
 * 정렬은 클라이언트에서 한다 — orderBy 를 쓰면 order 필드가 없는 문서가
 * 쿼리 결과에서 통째로 빠진다(Firestore 는 해당 필드가 없는 문서를 제외한다).
 */
export async function getCategories(): Promise<Category[]> {
  if (!hasAdminCredentials()) {
    warnUnconfigured('getCategories');
    return [...DEFAULT_CATEGORIES];
  }
  return safeRead(
    'getCategories',
    async () => {
      const snap = await adminDb().collection(COLLECTION).get();
      if (snap.empty) return [...DEFAULT_CATEGORIES];
      return sortCategories(snap.docs.map((d) => normalizeCategory(d.id, d.data())));
    },
    [...DEFAULT_CATEGORIES],
  );
}

/** 알 수 없는 slug 는 null — 카테고리 페이지가 404 를 내는 근거가 된다 */
export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const categories = await getCategories();
  return categories.find((c) => c.slug === slug) ?? null;
}
