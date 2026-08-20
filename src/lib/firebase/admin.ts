import 'server-only';

import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

/**
 * PEM 개인키를 어느 저장 형태로 넣어도 동작하게 정규화한다.
 *
 * - `.env` 파일과 Vercel 대시보드는 줄바꿈을 백슬래시+n 두 글자로 보관한다 → 실제 줄바꿈으로 되돌린다
 * - 값 전체를 큰따옴표로 감싼 경우 dotenv 가 이미 벗겨내지만, 감싼 채 들어오는 경로도 있어 한 번 더 벗긴다
 * - 이미 실제 줄바꿈인 값은 그대로 통과한다
 *
 * 여기를 틀리면 증상이 `DECODER routines::unsupported` 로만 나와 원인을 찾기 어렵다.
 */
function normalizePrivateKey(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  let key = raw.trim();
  if (key.length >= 2 && key.startsWith('"') && key.endsWith('"')) {
    key = key.slice(1, -1);
  }
  return key.replace(/\\n/g, '\n');
}

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = normalizePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY);

/**
 * 자격증명이 없으면 throw 하지 않고 false 를 돌려준다.
 * 이유: 아직 Firebase 를 연결하지 않은 상태에서도 `next build` 가 통과해야 한다.
 * 호출부는 이 값을 확인하고 빈 결과로 폴백한다.
 */
export function hasAdminCredentials(): boolean {
  return Boolean(projectId && clientEmail && privateKey);
}

let cached: App | null = null;

function app(): App {
  if (!hasAdminCredentials()) {
    throw new Error('Firebase Admin 자격증명이 없습니다 (FIREBASE_ADMIN_*).');
  }
  if (cached) return cached;
  const existing = getApps().find((a) => a.name === 'admin');
  cached =
    existing ??
    initializeApp(
      { credential: cert({ projectId, clientEmail, privateKey }) },
      'admin',
    );
  return cached;
}

export function adminDb(): Firestore {
  return getFirestore(app());
}
export function adminAuth(): Auth {
  return getAuth(app());
}
