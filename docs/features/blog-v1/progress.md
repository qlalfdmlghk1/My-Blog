# blog-v1 — 진행 상황

## 📌 현재 작업

- 이슈: #1 (Feat)
- 브랜치: feature/1-blog-v1
- 단계: 구현 완료 → PR 준비
- 마지막 업데이트: 2026-08-20

---

## [Issue #1] blog-v1

**Type**: Feat | **Jira**: 미사용 (1인 프로젝트) | **시작**: 2026-08-20

### ✅ 완료

- [x] 작업 환경 셋업 (/start 실행)
- [x] 팀 표준 `.claude` 적용 (/team-init) — rules·hooks·project.config 배치
- [x] 빈 원격 레포 부트스트랩 — 베이스 커밋 `1d23d53`을 `dev`·`main`에 push
- [x] 글 목록 · 글 상세 ISR 구현
- [x] 관리자 로그인 (Firebase Auth) + AuthGuard
- [x] 글 작성/수정/삭제 + 마크다운 실시간 미리보기
- [x] 이미지 업로드 (Firebase Storage) — 붙여넣기 시 URL 자동 삽입
- [x] draft / published 상태 분리
- [x] 태그 필터 + 카테고리 6종 2단 구조
- [x] 다크 모드
- [x] RSS · sitemap · robots · OG 이미지
- [x] `revalidatePath` 기반 ISR 재생성 API
- [x] Firestore · Storage 보안 규칙

### 🚧 진행 중

- [ ] dev 대상 PR 생성 및 리뷰

### 📝 결정 로그

- [2026-08-20] `/team-init` 실행. 스택은 Next.js App Router로 감지 → `rules/fe/react-nextjs.md` 적용.
  단, 해당 rule은 FSD + 루트 `app/` 라우팅을 전제하는데 이 프로젝트는 `src/app` + 평면 구조다.
  1인 블로그 규모에 FSD는 과하다고 판단해 **FSD 레이어 분리는 강제하지 않고**, 구조와 무관한 항목
  (Server Component 기본, 서버 시크릿 클라이언트 미노출, `any` 금지, lint/typecheck)만 적용하기로 CLAUDE.md에 명시.
- [2026-08-20] 파일럿 측정 훅(`pilot-session-metrics.mjs`)은 제외. 1인 프로젝트에 사용량 로그가 불필요해
  `settings.json`의 `Stop`/`SessionEnd` 항목도 함께 제거했다.
- [2026-08-20] `TYPECHECK_COMMAND`를 `npm run typecheck`로 설정. 팀 표준 예시는 `type-check`(하이픈)인데
  이 레포 스크립트명이 달라 그대로 뒀으면 커밋 게이트가 매번 실패했을 자리.
- [2026-08-20] 원격 레포가 비어 있어 PR의 base가 없었다. 스캐폴딩·기획서·`.claude`만 베이스 커밋으로 분리해
  `dev`·`main`에 올리고, 실제 구현은 이 브랜치에서 PR로 분리했다. 기본 브랜치는 `main`(프로덕션),
  PR 대상은 `dev`.
- [2026-08-20] 기획 검수(`/plan-review`)는 생략. 착수 전 게이트인데 구현이 이미 끝나 실익이 적다.

### 🐛 트러블슈팅

<!-- /note troubleshoot 으로 추가 -->

### ⏭️ 남은 작업

- PLAN.md의 🔲 미확정 표기 갱신 — 데이터 구조·렌더링 전략·마크다운 처리·보안은 구현으로 이미 확정됐다
- 배포 URL · 실측 Lighthouse 점수 기록 (PLAN.md "채울 거리")
- 블로그 이름 / 도메인 확정, 첫 글 3편 주제 (PLAN.md "채울 거리")
- 테스트 미도입 — 도입 시 `project.config.md`의 `TEST_COMMAND` 설정 필요
