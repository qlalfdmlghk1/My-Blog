# 리뷰 노트 초안 — feature/loading-ui

> PR 이 아직 없어(GitHub · gh CLI 미설치) MR/PR 노트로 등록하지 못한 본문입니다.
> `/pr` 로 PR 을 만든 뒤 아래 두 노트를 그대로 코멘트로 올리면 됩니다.

---

## 📋 코드 리뷰 — feature/loading-ui

<!-- ux-review:v2 run_id=20260918T074415Z-84c86d2 preset=deep status=completed baseline=pass duration_ms=749000 rounds=1 final=true reviewers=4 files=13 diff_additions=570 diff_deletions=314 findings=3 filtered_findings=0 visual_qa=skipped override=user agents=dedicated -->

> **🔬 Deep Review (수렴)** · 범위 `origin/dev...HEAD` (커밋 3건, 13파일 +570/-314) · 리뷰어 4명 · 1라운드 / 최대 3 · 12분 29초
> 객관 검증: lint ✅ · typecheck ✅ · build ✅ (정적 19페이지) · test ⏭️ 미설정
> 자동 반영 0건 — Blocker·보안 High·검증 실패·명백한 오류 없음. Round 1 이 전체 범위 리뷰였고 변경이 없어 그 결과를 최종 전체 재검증으로 승계.

### 라운드별

- **Round 1** (전체 범위): Blocker 0 / Non-blocker 3 / 자동 반영 0 / 검증 통과 — 12분 16초 → 수렴

### 남긴 항목 (자동 반영 안 함)

- `src/app/loading.tsx` reduced-motion 주석-코드 불일치 — 주석 정합, 자동 반영 범위 밖
- `docs/features/loading-ui/plan.md` 신규 컴포넌트명 불일치 — 문서 정합, 자동 반영 범위 밖
- 야구공 기하(실밥·바늘땀 좌표)가 `BaseballIcon.tsx` · `ClickBaseball.tsx` · `globals.css` 커서 2벌로 복제 — 추상화 범위 판단 필요
- 🙋 루트 `loading.tsx` 가 `/admin` · `/login` 전환에도 뜸 — 정책 판단 필요
- 🙋 `npm audit`: `next` <15.5.24 Critical 2건 · `postcss` High 1건 · `firebase-admin` 체인 Moderate — 의존성 업그레이드는 별도 PR, 사용자 확인 대상

### 👍

- Server/Client 경계 최말단 유지 (`'use client'` 는 `ClickBaseball` 한 파일)
- `ClickButterflies` 삭제 잔재 0건, 동작 계약(mute 조건·정리) 계승
- 액센트 토큰 교체가 `globals.css` 한 곳에서만 일어남

---

## ✅ 리뷰 후속 처리 — feature/loading-ui (round 1 · 04519ab)

### 🚨 Blocker

(없음)

### ✅ 이번에 반영한 Non-blocker

- `loading.tsx` reduced-motion 주석을 코드(`motion-reduce:animate-none` 명시)와 일치시킴 — 명시가 맞는 이유(전역 규칙은 무한 반복을 끄지 않음)를 주석으로 (`04519ab`)
- `plan.md` 신규 컴포넌트명 `BaseballSpinner` → `BaseballIcon` · `ClickBaseball` (`04519ab`)
- (TODO 에서 같이) `admin/layout.tsx` 주석의 두 세대 전 이름 `ClickBurst` → `ClickBaseball` (`04519ab`)

### ⏭️ 지금 처리하지 않은 항목

| 항목 | 유형 | 사유 |
| --- | --- | --- |
| 야구공 기하 3곳 4벌 복제 → `src/lib/baseball-geometry.ts` 추출 | 후속 분리 | 수정이 lib 신규 모듈 + 컴포넌트 2개로 번지고, 커서 data URI 는 어차피 공유 불가. 이 PR 범위 밖 |
| 루트 `loading.tsx` 의 `/admin` · `/login` 적용 | 판단 필요 | 무채색 · 1초 내외라 허용해도 되는지 기획 판단. 끄려면 `src/app/admin/loading.tsx` 별도(그 파일은 `<main id="main">` 대신 `<div role="status">`) |
| `next` Critical 취약점 등 `npm audit` | 범위 밖 | 이 PR 은 `package.json` 미변경. 별도 chore PR 로 `npm audit fix` (Vercel Linux 배포라 windows RCE 는 로컬 dev 서버만 해당) |
| 라이트 `--accent-hover` 대비 4.52:1 실측 재확인 | 후속 분리 | 브라우저 대비 도구로 재검증. 부족하면 글자를 Secondary 800 으로 |
| `globals.css` 커서 data URI 색은 테마 토큰을 못 따라감 · `28.439999…` 부동소수 잔재 | 후속 분리 | 토큰 주석 한 줄 + 좌표 반올림 |
| `ballSvg` JSDoc 에 "인자는 `PaletteId` 리터럴만" 명시 | 후속 분리 | 보안 Low(confidence 25), 주석 한 줄 |

### 🎫 후속 티켓

- 티켓 미생성 — 이 프로젝트는 Jira 미사용. 후속 분리 항목은 `docs/features/loading-ui/progress.md` 의 남은 작업으로 추적

_Blocker 0/0 · 미처리 6건 기록 · 후속 티켓 0건 · 커밋 `04519ab`_
