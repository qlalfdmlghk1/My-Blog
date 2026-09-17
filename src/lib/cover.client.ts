import { auth } from '@/lib/firebase/client';

/**
 * 글 커버 생성 — 서버 라우트를 부른다.
 *
 * Gemini 를 브라우저에서 직접 부르지 않는다 (키가 번들에 실린다).
 * /api/cover/generate 가 서버에서 생성 · 업로드하고, 여기서는 관리자임을 증명할
 * Firebase ID 토큰만 실어 보낸다 (extractDictionaryTerms 와 같은 방식).
 *
 * 돌아오는 것은 Blob 의 공개 URL 하나다. Firestore 에 쓰는 것은 호출부의 몫이다.
 */
export async function generateCover(input: {
  title: string;
  excerpt: string;
  /** 카테고리 slug — 바탕색을 정할 팔레트 슬롯은 서버가 찾는다 */
  category: string;
  slug: string;
}): Promise<string> {
  const user = auth().currentUser;
  if (!user) throw new Error('로그인이 필요합니다.');

  const res = await fetch('/api/cover/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${await user.getIdToken()}`,
    },
    body: JSON.stringify(input),
  });

  const body = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
  if (!res.ok || !body?.url) {
    throw new Error(body?.error ?? `커버 생성에 실패했습니다 (${res.status})`);
  }
  return body.url;
}
