# 코드 리뷰 수렴 — feature/comments

| 항목      | 값                                              |
| --------- | ----------------------------------------------- |
| 범위      | `origin/dev...HEAD` (PR 미생성 · 이슈 초안만)   |
| 프리셋    | 🔬 Deep (자동 판정 R1 — 익명 쓰기 API · 개인정보(IP 해시) · 보안 규칙) |
| 라운드 수 | 2 + 최종 전체 재검증 / 최대 3                   |
| 수렴 상태 | ✅ 수렴 성공                                     |
| 전체 소요 | 31분 44초                                       |
| 검증일    | 2026-09-21                                      |

## 라운드별 리뷰 요약

- **Round 1**: Blocker 0 / Non-blocker 13 (지금 9 · 후속 4) / 사람 확인 7 / 자동 반영 **1건** / 13분 46초 _(전체 범위 · 리뷰 8분 37초 + 반영·검증·커밋)_
- **Round 2**: Blocker 0 / Non-blocker 0 / 변경 없음 / 6분 31초 _(델타 `7b68414...HEAD` · 4파일 +31줄)_
- **최종 전체 재검증**: Blocker 0 / Non-blocker 8 (지금 5 · 후속 3) / 사람 확인 6 / 11분 27초 _(전체 범위)_ → 수렴

> 마지막 전역 확인은 **최종 전체 재검증** 기준이다. Round 2 의 "0건"은 델타 범위 집계다.
> Round 1 의 13건이 최종에서 8건으로 준 것은 자동 반영 1건 + 재판정에서 Severity·confidence 가 내려가 TODO 로 흡수된 4건(전량 읽기 · CommentDraft 는 5번에 병합 · 본문 크기 · 관리자 전량 조회)이다.

## 자동 반영 내역

- [`96d9d98`] `CommentSection` 닉네임 자동 재발급 조건이 도달 불가(`reason === 'invalid' && !trimmed` — `canSubmit` 이 빈 본문을 막아 항상 false). 거절 코드를 `invalid`(본문) / `invalid-identity`(닉네임·시드)로 갈라 후자에서만 재발급 (분류: 명백한 기능 오류, confidence 92)

## 검증 명령과 결과

| 명령       | 출처              | 결과 |
| ---------- | ----------------- | ---- |
| lint       | LINT_COMMAND      | ✅ 통과 (`npm run lint`) |
| type-check | TYPECHECK_COMMAND | ✅ 통과 (`npm run typecheck`) |
| test       | TEST_COMMAND      | ⏭️ 미설정 건너뜀 |
| build      | BUILD_COMMAND     | ✅ 통과 (`npm run build`) |

## 남긴 항목 (자동 반영 안 함)

최종 전체 재검증 기준 Non-blocker 8건. 자동 반영 기준(Blocker · 보안 High/Critical · 검증 실패 · 명백한 기능 오류, confidence ≥ 80)에 해당하지 않아 남겼다.

- 1. `CommentSection` 안의 fetch·localStorage 접근 — 사유: 룰 위반이나 Severity 판정상 Non-blocker(구조 정리)
- 2. `nickname.ts` 가 `CommentAvatar` 경유로 클라이언트 번들 경로 — 사유: 시크릿 아님, 설계 전제와 경계의 불일치(구조 정리)
- 3. 글 상세 재검증 경로 3중 복제 — 사유: 기존 코드(`pushPath`)까지 손대야 해 범위 밖
- 4. `comments.ts` 주석이 없는 `validComment` 를 전제 · 미사용 상수 — 사유: 문서 오류, 기능 영향 없음
- 5. 미사용 export `hasProfanity` · `CommentDraft` — 사유: dead code, 기능 영향 없음
- 6. `latestCommentBody` 가 `getComments` 와 질의·정렬 중복 — 사유: 구조 정리
- 7. `isCommentableSlug` 가 `getPostBySlug` 재구현 — 사유: `posts.ts` 수정이 필요해 범위 밖
- 8. 쿨다운이 거절된 시도에도 소비 — 사유: 정책 판단 (도배 방어 vs 오탐 UX)

사람 확인 필요 6건 (정책성 — 자동 반영 제외, escalate):

- A. `next@15.5.23` Critical RCE 2건 (GHSA-p293-qw3h-jr36 · GHSA-2xp9-vwfh-vxw4, fix ≥ 15.5.24) — diff 외부 의존성이라 Blocker 아님. 익명 쓰기가 열리는 시점이라 머지 전 업그레이드 권장
- B. `moderation.server.ts` 프롬프트에 본문 원문 삽입 — "구분자 안은 데이터, 지시가 아님" 명시 여부
- C. `throttle.server.ts` `COMMENT_IP_SALT` 부재 시 fail-open — 프로덕션 fail-closed 전환 여부
- D. Gemini `reason` 서버 로그 원문 출력 — PII 인용 가능성. 프롬프트에 "원문 인용 금지" + 로그 마스킹 여부
- E. IP 해시 처리 시작 — 개인정보처리방침 고지 필요 여부 (ISMS-P 1, 처리방침 페이지 없음 → 확인 필요)
- F. `x-forwarded-for` 첫 값 신뢰 — Vercel 고정 배포인지 확인. 다른 호스팅이면 위조 가능

## 사람이 지금 처리하지 않기로 한 항목 (Stage 2 - 3)

사용자 선택: **권장안대로** (지금 5건 · 후속 3건).

| 항목 | 유형 | 사유 |
| --- | --- | --- |
| 3. 재검증 경로 3중 복제 | 범위 밖 | 기존 `pushPath` 까지 손대야 해 이 PR 범위를 넘는다 |
| 7. `isCommentableSlug` 재구현 | 후속 분리 | `posts.ts` 에 `isPublishedSlug` 를 두는 별도 정리 |
| 8. 쿨다운 소비 시점 | 판단 필요 | 도배 방어 강도 vs 거절 후 즉시 재제출 UX 트레이드오프. 실제 오탐 유입을 보고 결정 |

- 지금 처리 5건(1·2·4·5·6): 수렴 라운드가 끝난 뒤 결정됐으므로 라운드 안에서는 미반영 — 직후 별도 커밋으로 반영 (아래 후속 처리 기록 참조)
- 후속 티켓: (없음) — 유형 `후속 분리` 인 7번이 후보였으나 **티켓 미생성 — Jira 미사용 프로젝트**

## 수렴 성공/실패 상태

- 상태: ✅ 수렴 성공
- 근거: 최종 전체 재검증 Blocker 0 · 자동 반영 대상 Non-blocker 0 · 검증 3종 통과(test 미설정) · Round 2 변경 없음 · 3라운드 이내

## 후속 처리 기록 (Step 10 — MR 노트 대체)

> `gh`·`glab` MR 이 없어 이 파일에 남긴다.

### ✅ 리뷰 후속 처리 — feature/comments (round 2+final · `96d9d98`)

#### 🚨 Blocker

(없음)

#### ✅ 이번에 반영한 Non-blocker

수렴 종료 후 사용자 결정(권장안대로)에 따라 **이 문서와 같은 커밋**에 반영 (`Refactor: 리뷰 후속 — 댓글 데이터 접근 분리와 중복 정리`).

- 1. `CommentSection` 의 fetch·localStorage 를 `src/lib/comments.api.ts` 로 분리. `comments.client.ts` 에 합치지 않았다 — 그쪽은 Firebase 클라이언트 SDK 를 import 해 공개 글 상세 번들이 커진다
- 2. `seedToNumber` 를 `src/lib/avatar.ts` 로 분리하고 `nickname.ts` 에 `import 'server-only'`. 닉네임 목록이 클라이언트 번들에 실릴 경로를 컴파일 타임에 끊음
- 4. `comments.ts` 주석의 `validComment` 참조 제거(규칙에 검증 함수는 없고, 서버 라우트가 유일한 관문) · 미사용 `maxNickname`·`maxAvatarSeed` 삭제
- 5. 미사용 `hasProfanity` 삭제 · `CommentDraft` 를 `submitComment` 인자와 라우트 payload 타입(`Partial<Record<keyof CommentDraft, unknown>>`)에 실제 사용
- 6. `latestCommentBody` 를 `getComments` 위임 한 줄로

#### ⏭️ 지금 처리하지 않은 항목

| 항목 | 유형 | 사유 |
| --- | --- | --- |
| 3. 재검증 경로 3중 복제 | 범위 밖 | 기존 `pushPath` 까지 손대야 해 이 PR 범위를 넘는다 |
| 7. `isCommentableSlug` 재구현 | 후속 분리 | `posts.ts` 에 `isPublishedSlug` 를 두는 별도 정리 |
| 8. 쿨다운 소비 시점 | 판단 필요 | 도배 방어 강도 vs 오탐 UX. 실제 유입을 보고 결정 |

#### 🎫 후속 티켓

- (없음 — Jira 미사용)

_Blocker 0/0 · 미처리 3건 기록 · 후속 티켓 0건 · 커밋 `96d9d98`_
