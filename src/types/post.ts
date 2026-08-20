import type { CategorySlug } from '@/lib/categories';

export type PostStatus = 'draft' | 'published';

/**
 * posts/{postId}
 *
 * 기획서 데이터 구조에 `category` 를 추가했다 — 디자인 섹션이 "글 1개당 카테고리
 * 정확히 1개"를 요구하는데 원래 필드 목록에 빠져 있었다(해당 항목은 🔲 미확정).
 * 조회수는 v2 로 유예 (Firestore 쓰기 비용 · 봇 카운팅 문제).
 */
export interface Post {
  id: string;
  slug: string;
  title: string;
  /** 마크다운 원문 */
  content: string;
  excerpt: string;
  category: CategorySlug;
  /** 색 없는 자유 태그 */
  tags: string[];
  coverImage: string | null;
  status: PostStatus;
  /** RSC 경계를 넘기므로 Firestore Timestamp 가 아닌 ISO 문자열 */
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

/** 목록에서는 본문이 필요 없다 — 전송량을 줄인다 */
export type PostSummary = Omit<Post, 'content'>;

/** 작성 / 수정 폼이 다루는 형태 */
export interface PostDraft {
  slug: string;
  title: string;
  content: string;
  excerpt: string;
  category: CategorySlug;
  tags: string[];
  coverImage: string | null;
  status: PostStatus;
}
