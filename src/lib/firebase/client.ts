'use client';

import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth, type User } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function isClientConfigured(): boolean {
  return Boolean(config.apiKey && config.projectId && config.appId);
}

function app(): FirebaseApp {
  if (!isClientConfigured()) {
    throw new Error(
      'Firebase 클라이언트 설정이 없습니다. .env.local 의 NEXT_PUBLIC_FIREBASE_* 를 채우세요.',
    );
  }
  return getApps().length ? getApp() : initializeApp(config);
}

export function auth(): Auth {
  return getAuth(app());
}
export function db(): Firestore {
  return getFirestore(app());
}
export function storage(): FirebaseStorage {
  return getStorage(app());
}

/**
 * 관리자 여부를 커스텀 클레임으로 판별한다. UI 가드용이며,
 * 최종 방어선은 Firestore 보안 규칙과 서버 토큰 검증이다.
 *
 * 캐시된 토큰을 먼저 보고, 클레임이 없을 때만 강제 갱신한다.
 * 클레임은 ID 토큰에 실려 오는데 토큰이 1시간 캐시되므로, 방금 클레임을
 * 부여받은 계정은 캐시된 토큰만 보면 "권한 없음"으로 튕긴다. 그렇다고 항상
 * 강제 갱신하면 관리자 화면 진입마다 네트워크 왕복이 붙는다.
 * 정상 경로는 캐시로 끝내고, 실패했을 때만 한 번 더 확인하는 편이 낫다.
 */
export async function hasAdminClaim(user: User | null | undefined): Promise<boolean> {
  if (!user) return false;
  try {
    const cached = await user.getIdTokenResult();
    if (cached.claims.admin === true) return true;

    const refreshed = await user.getIdTokenResult(true);
    return refreshed.claims.admin === true;
  } catch {
    return false;
  }
}
