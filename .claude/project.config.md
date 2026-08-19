# Project Config — My-Blog

`/start`·`/commit`·`/pr`·`/review`·`/tech-doc`·`/e2e` 등 팀 표준 스킬이 이 파일의 값을 읽습니다.
공란인 항목은 해당 기능을 쓸 때 채웁니다.

## Project

- PROJECT_NAME: My-Blog
- PROJECT_DESCRIPTION: 개인 기술 블로그 — 관리자 로그인 후 웹에서 직접 글 작성 · Firestore 저장 · ISR로 정적 페이지 재생성. 목표는 "인증 → 작성 → 저장 → 정적 페이지 재생성" 발행 파이프라인을 직접 만드는 것 (기획·디자인·개발·배포 100% 단독)
- PROJECT_STACK: Next.js 15 (App Router) · React 19 · TypeScript 5.9 · Tailwind CSS 3 · Firebase(Auth/Firestore/Storage) · Vercel(ISR)
- BASE_BRANCH: dev # 작업 분기 기준 브랜치 (/start Stage 4) — 보통 GitHub의 DEFAULT_TARGET_BRANCH와 동일 값으로 유지

## Jira

> 1인 프로젝트 — Jira 미사용. `/start`가 Jira 단계를 건너뛰도록 공란으로 둡니다. 도입 시 채우세요.

- JIRA_PROJECT_KEY:
- JIRA_DEFAULT_ISSUE_TYPE:
- JIRA_DEFAULT_ASSIGNEE_EMAIL:
- JIRA_SITE_URL:
- JIRA_LABELS:
- JIRA_REVIEW_TRANSITION:

## GitHub

- GITHUB_REPO_URL: https://github.com/qlalfdmlghk1/My-Blog
- GITHUB_HOST: # 일반 github.com이므로 비움 (Enterprise만 입력)
- GITHUB_USERNAME: qlalfdmlghk1
- DEFAULT_REVIEWER: # 1인 프로젝트 — 본인은 자기 PR의 reviewer로 지정할 수 없음. 협업자가 생기면 채우세요
- DEFAULT_TARGET_BRANCH: dev # PR 대상·리뷰 비교 브랜치 (/pr·/review)
- STAGING_BRANCH: # 미사용 (dev → main 2단계)
- PRODUCTION_BRANCH: main # Vercel 프로덕션 배포 브랜치

## Confluence

> 1인 프로젝트 — Confluence 미사용. `/tech-doc` 발행은 이 값이 있어야 동작합니다.

- CONFLUENCE_SPACE:
- TECH_DOC_PARENT_PAGE_ID:
- TEAM_GUIDE_PAGE_URL:

## API / Design References

- API_GUIDE_PATH: docs/PLAN.md # 별도 BE API 가이드 없음 — Firebase 직접 호출 구조. 기획·데이터 모델 정본은 PLAN.md
- SWAGGER_URL: # 없음 (BE 서버 없이 Firebase SDK 직접 사용)
- FIGMA_LIBRARY_URL:

## Project-specific Hooks

- READONLY_EXTERNAL_PATHS:
- SENSITIVE_PATH_PATTERNS: .env.local,.env,firestore.rules,storage.rules # Firebase 서비스 계정 키·보안 규칙 편집 시 경고
- TYPECHECK_COMMAND: npm run typecheck # ⚠️ 이 레포 스크립트명은 `typecheck` (하이픈 없음)
- COMMIT_GATE_COMMAND: # 미설정 → TYPECHECK_COMMAND 폴백 사용 (npm run typecheck)
- FORMAT_COMMAND: # 미설정 → web 확장자는 prettier 자동 (미설치면 조용히 skip)

## Planning Review (`/plan-review` skill 사용 시)

- PLANNING_SOURCE_URLS: # Notion 원본은 비공개 — fetch 불가. 리포지토리 사본 docs/PLAN.md 를 입력으로 사용
- PROTOTYPE_WORKSPACE_URL:
- PLANNING_REVIEW_MAX_ROUNDS: # 미설정 시 기본 3

## Validation / Review Converge (`/review-converge` skill 사용 시)

- LINT_COMMAND: npm run lint
- TEST_COMMAND: # 테스트 스크립트 없음 — 도입 시 채우세요
- BUILD_COMMAND: npm run build
- REVIEW_CONVERGE_MAX_ROUNDS: # 미설정 시 기본 3
- # TYPECHECK_COMMAND 는 위 "Project-specific Hooks" 항목을 공용으로 사용

## E2E (`/e2e` skill 사용 시)

> 아직 E2E 미도입. `/e2e` 첫 실행 전 아래 값을 채우세요.

- E2E_DIR: tests/e2e
- E2E_SELECTORS_SSOT: tests/e2e/support/selectors.md
- E2E_VIEWPORTS: tests/e2e/support/viewports.ts
- E2E_MOCK_MODE: # 미정 — Firebase 에뮬레이터 또는 목 데이터
- E2E_LEDGER_DIR: docs/e2e
- VISUAL_REGRESSION_TOOL: # 미도입
- BREAKPOINTS: # Tailwind 기본값 사용 (sm 640 / md 768 / lg 1024 / xl 1280)
