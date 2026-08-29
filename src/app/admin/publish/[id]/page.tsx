'use client';

import { PostLoader } from '@/components/admin/PostLoader';
import { PublishReview } from '@/components/admin/PublishReview';

/**
 * 발행 확인 화면의 라우트.
 *
 * 본문을 쿼리스트링이나 전역 상태로 넘기지 않고 문서 ID 로 다시 읽는다 — 에디터가 저장을
 * 마친 뒤 넘어오므로 Firestore 가 이미 정본을 갖고 있고, 그래야 새로고침·뒤로가기에서도
 * 같은 화면이 나온다. 읽는 일 자체는 편집 화면과 같아 `PostLoader` 가 맡는다.
 */
export default function PublishPage() {
  return <PostLoader>{(post) => <PublishReview post={post} />}</PostLoader>;
}
