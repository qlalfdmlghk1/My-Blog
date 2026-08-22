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
        };
      },
      onUploadCompleted: async () => {
        // Blob 이 업로드 완료를 알려주는 훅. 업로드 결과를 따로 기록하지 않으므로 비워 둔다.
        // (로컬 개발에서는 Vercel 이 localhost 에 도달할 수 없어 호출되지 않는다)
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : '업로드를 시작하지 못했습니다.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
