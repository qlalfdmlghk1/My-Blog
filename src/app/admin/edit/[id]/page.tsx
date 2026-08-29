'use client';

import { PostLoader } from '@/components/admin/PostLoader';
import { PostEditor } from '@/components/admin/PostEditor';

export default function EditPage() {
  return <PostLoader>{(post) => <PostEditor existing={post} />}</PostLoader>;
}
