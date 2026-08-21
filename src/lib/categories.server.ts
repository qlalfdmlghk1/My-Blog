import 'server-only';

import { normalizeCategory, sortCategories } from '@/lib/categories';
import { adminDb, hasAdminCredentials } from '@/lib/firebase/admin';
import { warnUnconfigured } from '@/lib/safe-read';
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
  return (await readCategories()).categories;
}

/**
 * `getCategories()` 와 같은 읽기지만 **폴백을 썼는지(`degraded`)를 함께 돌려준다.**
 *
 * 폴백이 빈 배열이라 조회 실패와 "정말 0개"가 호출부에서 구분되지 않는다.
 * 카테고리 상세처럼 없으면 404 를 내는 화면이 그 둘을 섞으면, 일시 장애 한 번에
 * 살아 있는 URL 이 404 로 굳고 `revalidate` 주기(1시간) 동안 그대로 남는다.
 * 그런 화면은 이 함수를 쓰고 `degraded` 일 때 404 대신 throw 해서
 * ISR 이 직전 정적 페이지를 계속 서빙하게 한다.
 */
export async function readCategories(): Promise<{ categories: Category[]; degraded: boolean }> {
  if (!hasAdminCredentials()) {
    warnUnconfigured('getCategories');
    return { categories: [], degraded: true };
  }
  // safeRead 를 쓰지 않는다 — fallback 인자가 즉시 평가돼 실패 여부를 표시할 수 없다.
  // 로그 형식은 safeRead 와 맞춘다.
  try {
    const snap = await adminDb().collection(COLLECTION).get();
    return {
      categories: sortCategories(snap.docs.map((d) => normalizeCategory(d.id, d.data()))),
      degraded: false,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[firestore] getCategories() 실패 — 기본값으로 대체합니다.
  ${message}`);
    return { categories: [], degraded: true };
  }
}

/** 알 수 없는 slug 는 null — 카테고리 페이지가 404 를 내는 근거가 된다 */
export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const categories = await getCategories();
  return categories.find((c) => c.slug === slug) ?? null;
}
