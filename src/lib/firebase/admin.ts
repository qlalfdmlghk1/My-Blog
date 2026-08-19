import 'server-only';

import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
/** Vercel 환경변수는 줄바꿈을 \n 리터럴로 저장하므로 되돌린다 */
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\n/g, '\n');

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
