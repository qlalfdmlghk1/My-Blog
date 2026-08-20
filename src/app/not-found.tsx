import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto max-w-prose px-5 py-24 text-center">
      <p className="font-mono text-sm text-ink-dim">404</p>
      <h1 className="mt-3 text-xl font-bold tracking-tight">
        페이지를 찾을 수 없습니다
      </h1>
      <p className="mt-2 text-sm text-ink-dim">
        주소가 바뀌었거나 글이 비공개(draft)로 바뀌었을 수 있습니다.
      </p>
      <Link href="/" className="mt-6 inline-block text-sm font-semibold underline">
        글 목록으로
      </Link>
    </main>
  );
}
