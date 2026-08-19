'use client';

import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
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

/** UI 가드용. 최종 방어선은 Firestore 보안 규칙과 서버 토큰 검증이다. */
export function isAdminUid(uid: string | null | undefined): boolean {
  const expected = process.env.NEXT_PUBLIC_ADMIN_UID;
  return Boolean(expected && uid && uid === expected);
}
