'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { btnSecondary } from '@/components/admin/ui';
import { getPostById } from '@/lib/posts.client';
import type { Post } from '@/types/post';

/**
 * 라우트 params 의 문서 ID 로 글을 읽어 화면에 넘긴다.
 *
 * 편집(`/admin/edit/[id]`)과 발행 확인(`/admin/publish/[id]`)이 같은 일을 한다 —
 * ID 로 읽고, 없으면 "찾을 수 없음", 읽는 동안 "불러오는 중". 두 라우트에 각각 적어두면
 * 로딩 처리나 에러 문구를 고칠 때 한쪽만 고쳐 같은 관리 화면 안에서 동작이 갈린다.
 *
 * 본문을 props 로 넘기지 않고 **ID 로 다시 읽는** 규약도 여기 담긴다. 그래야 새로고침·
 * 뒤로가기에서도 같은 화면이 나오고, Firestore 가 언제나 정본이다.
 */
export function PostLoader({ children }: { children: (post: Post) => React.ReactNode }) {
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

  return <>{children(post)}</>;
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
