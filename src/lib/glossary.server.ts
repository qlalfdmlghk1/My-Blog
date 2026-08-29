import 'server-only';

import { normalizeGlossaryTerm, sortGlossary, toGlossaryAnchors } from '@/lib/glossary';
import { adminDb, hasAdminCredentials } from '@/lib/firebase/admin';
import { safeRead, warnUnconfigured } from '@/lib/safe-read';
import type { GlossaryAnchor, GlossaryTerm } from '@/types/glossary';

export const COLLECTION = 'glossary';

/**
 * 용어 목록 — 사전 페이지와 본문 자동 링크가 함께 쓰는 유일한 읽기 지점.
 *
 * 카테고리와 마찬가지로 코드에 기본 목록을 두지 않는다. 비어 있으면 비어 있는
 * 대로 내보내고 화면이 빈 상태를 안내한다.
 *
 * 정렬은 클라이언트에서 한다 — orderBy 를 쓰면 해당 필드가 없는 문서가
 * 쿼리 결과에서 통째로 빠진다.
 */
export async function getGlossary(): Promise<GlossaryTerm[]> {
  if (!hasAdminCredentials()) {
    warnUnconfigured('getGlossary');
    return [];
  }
  return safeRead(
    'getGlossary',
    async () => {
      const snap = await adminDb().collection(COLLECTION).get();
      return sortGlossary(snap.docs.map((d) => normalizeGlossaryTerm(d.id, d.data())));
    },
    [],
  );
}

/**
 * 본문 자동 링크용 표기 목록.
 *
 * 실패하면 빈 배열이고, 그 글은 **용어 링크 없이 그대로 그려진다.**
 * 사전 조회 한 번이 글 본문을 못 띄우는 이유가 되어선 안 된다 —
 * 링크는 읽기를 돕는 장치이지 본문의 일부가 아니다.
 */
export async function getGlossaryAnchors(): Promise<GlossaryAnchor[]> {
  return toGlossaryAnchors(await getGlossary());
}
