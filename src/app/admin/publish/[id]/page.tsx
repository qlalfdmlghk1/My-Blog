'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { PublishReview } from '@/components/admin/PublishReview';
import { btnSecondary } from '@/components/admin/ui';
import { getPostById } from '@/lib/posts.client';
import type { Post } from '@/types/post';

/**
 * 발행 확인 화면의 라우트.
 *
 * 편집 화면과 같은 방식으로 문서 ID 만 받아 글을 다시 읽는다 — 본문을 쿼리스트링이나
 * 전역 상태로 넘기지 않는다. 에디터가 저장을 마친 뒤 넘어오므로 Firestore 가 이미
 * 정본을 갖고 있고, 그래야 새로고침·뒤로가기에서도 같은 화면이 나온다.
 */
export default function PublishPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [post, setPost] = useState<Post | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getPostById(id)
      .then((found) => {
        if (!found) setError('글을 찾을 수 없습니다.');
        else setPost(found);
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : '글을 불러오지 못했습니다.'),
      );
  }, [id]);

  if (error) {
    return (
      <Centered>
        <p className="text-sm font-bold">{error}</p>
        <p className="mt-2 text-xs leading-relaxed text-ink-dim">
          주소가 오래됐거나 다른 곳에서 삭제된 글일 수 있습니다.
        </p>
        <Link href="/admin" className={`${btnSecondary} mt-5 bg-bg`}>
          목록으로
        </Link>
      </Centered>
    );
  }

  if (!post) {
    return (
      <Centered>
        <p className="text-sm font-semibold" role="status">
          불러오는 중…
        </p>
      </Centered>
    );
  }

  return <PublishReview post={post} />;
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-shell justify-center px-5 py-20">
      <div className="w-full max-w-sm rounded-xl border border-line bg-surface p-6 text-center">
        {children}
      </div>
    </div>
  );
}
