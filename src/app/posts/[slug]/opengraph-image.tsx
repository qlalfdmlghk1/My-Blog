import { ImageResponse } from 'next/og';

import { OgCard, OG_CONTENT_TYPE, OG_SIZE, loadOgFont } from '@/lib/og';
import { getPostBySlug } from '@/lib/posts';
import { SITE } from '@/lib/site';
import { decodeSlugParam } from '@/lib/slug';

export const alt = '글 미리보기';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/**
 * 글마다 OG 이미지를 생성한다.
 *
 * generateStaticParams 를 두지 않는 이유: 상위 page.tsx 가 이미 발행 slug 목록을
 * 만들고 있고, Next 가 그 params 로 이 이미지도 함께 프리렌더한다. 여기서
 * 한 번 더 Firestore 를 읽으면 빌드 시 쿼리가 중복된다.
 */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(decodeSlugParam(slug));

  const date = post?.publishedAt
    ? new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'Asia/Seoul',
      }).format(new Date(post.publishedAt))
    : undefined;

  return new ImageResponse(
    (
      <OgCard
        title={post?.title ?? SITE.name}
        category={post?.category}
        tags={post?.tags ?? []}
        date={date}
      />
    ),
    {
      ...size,
      fonts: [
        { name: 'Pretendard', data: await loadOgFont(), style: 'normal', weight: 700 },
      ],
    },
  );
}
