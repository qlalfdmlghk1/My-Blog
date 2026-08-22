'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { PostEditor } from '@/components/admin/PostEditor';
import { btnSecondary } from '@/components/admin/ui';
import { getPostById } from '@/lib/posts.client';
import type { Post } from '@/types/post';

export default function EditPage() {
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

  return <PostEditor existing={post} />;
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
