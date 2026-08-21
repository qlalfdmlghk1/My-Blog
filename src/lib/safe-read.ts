import 'server-only';

/** 자격증명이 없을 때 빌드를 깨지 않기 위한 경고 (개발 편의) */
export function warnUnconfigured(fn: string): void {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`[firestore] Firebase Admin 미설정 — ${fn}() 가 기본값을 반환합니다.`);
  }
}

/**
 * 조회 실패를 기본값으로 떨어뜨린다.
 *
 * 이유: 이 함수들은 빌드 시 generateStaticParams / 프리렌더에서 호출된다.
 * Firestore 일시 장애나 색인 미배포로 빌드 전체가 실패하면 배포 파이프라인이
 * 통째로 멈춘다. ISR 이므로 다음 재검증에서 정상 데이터로 채워진다.
 *
 * 대신 조용히 넘어가지 않는다 — 원인을 알 수 있게 반드시 로그를 남긴다.
 * (특히 색인 누락은 FAILED_PRECONDITION 과 함께 생성 링크가 함께 출력된다)
 */
export async function safeRead<T>(fn: string, run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[firestore] ${fn}() 실패 — 기본값으로 대체합니다.\n  ${message}`);
    return fallback;
  }
}
