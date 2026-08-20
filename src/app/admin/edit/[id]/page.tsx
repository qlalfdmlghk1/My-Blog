'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { PostEditor } from '@/components/admin/PostEditor';
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

  if (error) return <p className="px-5 py-20 text-center text-sm text-ink-dim">{error}</p>;
  if (!post) return <p className="px-5 py-20 text-center text-sm text-ink-dim">불러오는 중…</p>;

  return <PostEditor existing={post} />;
}
