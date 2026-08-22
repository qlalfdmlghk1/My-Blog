import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';

import { adminAuth, hasAdminCredentials } from '@/lib/firebase/admin';

/** 본문 이미지 한 장의 상한 — 캡쳐·스크린샷 기준으로 넉넉하다 */
const MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/avif',
];

/**
 * 에디터 이미지 업로드용 토큰 발급.
 *
 * 파일 자체는 이 라우트를 지나가지 않는다. 브라우저가 Blob 으로 **직접** 올리고,
 * 여기서는 그 업로드를 허가하는 짧은 토큰만 내준다. 그렇게 하는 이유가 둘 있다.
 *  - 서버리스 함수의 요청 본문 상한(4.5MB)에 이미지가 걸리지 않는다
 *  - 함수는 iad1, 스토어는 icn1 이라 파일이 서버를 거치면 태평양을 두 번 건넌다
 *    (브라우저 → icn1 직행이면 국내에서 올릴 때 한 번도 안 건넌다)
 *
 * 쓰기는 관리자만 해야 하므로 호출자를 신뢰하지 않는다. Firebase ID 토큰을
 * clientPayload 로 받아 검증하고 admin 커스텀 클레임을 확인한다 —
 * /api/revalidate 와 같은 방식이며, 클레임은 Firebase 가 서명한 토큰 안에 있어
 * 클라이언트가 위조할 수 없다.
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (!hasAdminCredentials()) {
    return NextResponse.json(
      { error: 'Firebase Admin 자격증명이 서버에 없습니다.' },
      { status: 503 },
    );
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: 'BLOB_READ_WRITE_TOKEN 이 없습니다. Blob 스토어를 프로젝트에 연결하세요.' },
      { status: 503 },
    );
  }

  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: '본문을 읽을 수 없습니다.' }, { status: 400 });
  }

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const token = typeof clientPayload === 'string' ? clientPayload : '';
        if (!token) throw new Error('인증 토큰이 없습니다.');

        // checkRevoked: 로그아웃·계정 비활성화된 토큰을 거른다
        const decoded = await adminAuth().verifyIdToken(token, true);
        if (decoded.admin !== true) throw new Error('권한이 없습니다.');

        return {
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes: MAX_BYTES,
          // 같은 파일명을 두 번 올려도 앞의 것을 덮어쓰지 않는다
          addRandomSuffix: true,
          // 위에서 검증한 ID 토큰이 발급 토큰에 딸려 나가지 않게 비운다.
          // 라이브러리는 tokenPayload 를 안 주면 clientPayload 를 승계한다
          // (`payload.tokenPayload ?? clientPayload`). null 은 ?? 에 걸려 되살아나므로
          // 빈 문자열이어야 한다. onUploadCompleted 가 없는 지금은 쓰이지 않지만,
          // 나중에 콜백을 되살리는 사람이 이 함정을 다시 밟지 않도록 남겨 둔다.
          tokenPayload: '',
        };
      },
      // onUploadCompleted 를 두지 않는다.
      //
      // 업로드 결과를 따로 기록할 일이 없어 본문이 비어 있었는데, 이 훅이 있으면
      // 라이브러리가 callbackUrl 을 만들고 그 순간 tokenPayload 가 발급 토큰에 실린다.
      // 그러면 admin 클레임이 든 Firebase ID 토큰이 Blob 을 거쳐 업로드 완료 웹훅
      // 본문으로 평문으로 되돌아온다 — 우리가 필요로 하지도 않는 경로에 관리자
      // 자격증명을 흘리는 셈이다. 훅을 지우면 callbackUrl 이 undefined 로 남아
      // 토큰 페이로드도, 공개 콜백 경로도 함께 사라진다.
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : '업로드를 시작하지 못했습니다.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
