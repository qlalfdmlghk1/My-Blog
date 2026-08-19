# CLAUDE.md

이 파일은 프로젝트에서 Claude Code가 항상 먼저 읽는 팀 표준 진입점입니다.

## 사용 전 설정

새 프로젝트에 `.claude`를 적용한 뒤, 먼저 아래 파일을 프로젝트 상황에 맞게 채웁니다.

1. `.claude/project.config.md`
2. `.claude/CLAUDE.md`의 프로젝트 개요
3. 필요한 기술 스택 rule

`project.config.md`가 없다면 `.claude/project.config.example.md`를 복사해서 만듭니다.

## 프로젝트 개요

- 프로젝트명: `My-Blog`
- 설명: 개인 기술 블로그 — 관리자 로그인 후 웹에서 직접 글 작성 · Firestore 저장 · ISR로 정적 페이지 재생성. 목표는 "인증 → 작성 → 저장 → 정적 페이지 재생성" 발행 파이프라인을 직접 만드는 것
- 주요 스택: `Next.js 15 (App Router) · React 19 · TypeScript 5.9 · Tailwind CSS 3 · Firebase(Auth/Firestore/Storage) · Vercel(ISR)`
- 기본 브랜치: `dev` (프로덕션 배포 브랜치는 `main`)
- Jira 프로젝트 키: **미사용** — 1인 프로젝트. `/start`는 Jira 단계를 건너뜁니다
- GitHub 기본 reviewer: **미지정** — 1인 프로젝트라 self-review. 협업자가 생기면 `project.config.md`의 `DEFAULT_REVIEWER`에 추가
- Confluence 기술 문서 위치: **미사용** — 기획 정본은 [docs/PLAN.md](../docs/PLAN.md)
- 역할: 기획 · 디자인 · 개발 · 배포 100% 단독

## 기본 작업 원칙

- 의미 있는 변경은 Plan → Code → Review 순서로 진행합니다.
- `/start`를 사용하면 plan.md 합의 후 Jira, GitHub Issue, branch, progress.md를 생성합니다.
- 개발 중 결정은 `progress.md` 또는 `/note`로 남깁니다.
- **커밋·PR·리뷰·기록 요청은 반드시 해당 스킬로 처리합니다.** 사용자가 "커밋해줘"·"PR 올려줘"·"리뷰해줘"·"기록해줘"처럼 자연어로 말해도 — 슬래시 커맨드가 아니어도 — `git commit`·`gh pr create` 등을 **직접 실행하지 말고** `/commit`·`/pr`·`/review`(또는 `/review-converge`)·`/note` 스킬을 호출합니다. 스킬이 커밋 컨벤션·이슈 연결·리뷰 등록 등 팀 표준 절차를 보장하므로, 직접 처리하면 그 절차가 누락됩니다.
- 프로젝트별 예외는 `.claude/project.config.md`에 명시하고, skill 본문을 직접 고치기 전에 팀 표준 반영 여부를 검토합니다.

## 필수 사전 준비

- Atlassian MCP: Jira/Confluence 자동화에 필요
- Figma MCP: 디자인 분석이 필요한 UI 작업에 필요
- `gh` CLI: GitHub Issue, PR 생성, PR 코멘트 등록에 필요
- Playwright MCP: `/e2e` 테스트 저작에 필요 (선택)
- Node.js/npm: hooks와 type-check 실행에 필요

## 기술 스택별 rule

이 프로젝트에 적용된 스택 rule은 하나입니다.

- **React / Next.js (App Router): `.claude/rules/fe/react-nextjs.md`**

> 다른 스택 rule(Vue·Vite·네이티브·NestJS)은 팀 표준 플러그인에만 있고 이 프로젝트에는 배치하지 않았습니다.

### 현재 구조와 rule의 차이 (신규 코드 기준 점진 적용)

`react-nextjs.md`는 **FSD(Feature-Sliced Design) + 루트 `app/` 라우팅**을 전제로 쓰였지만,
이 프로젝트는 아직 그 구조가 아닙니다.

| | rule 전제 | My-Blog 현재 |
| --- | --- | --- |
| 라우팅 진입점 | 루트 `app/` | `src/app/` |
| 화면 조립 | `src/pages/{route}` | `src/app/**/page.tsx`에서 직접 |
| 레이어 | `entities` · `features` · `widgets` · `shared` | `src/components` · `src/lib` · `src/types` (평면) |

**판단 기준**: 규모가 작은 1인 블로그라 평면 구조가 적절합니다. FSD 레이어 분리는 **강제하지 않습니다.**
대신 `react-nextjs.md`의 다음 항목은 **구조와 무관하게 지금도 지킵니다.**

- Server Component 기본 · `'use client'`는 필요한 최말단에만
- 서버 전용 시크릿(`FIREBASE_*` admin 키 등)을 Client Component 경로에 도달시키지 않음 — 이 프로젝트에서 가장 중요한 규칙
- 명시적 `any` 금지 (현재 `src/` 37개 파일에 `any` 0건 — 이 상태를 유지)
- 객체 형태는 `interface`, union/intersection은 `type`
- 컴포넌트는 표현·렌더링만. 데이터 접근은 `src/lib/`로 분리
- 작성·수정 후 `npm run lint` · `npm run typecheck` 실행

구조가 커져 FSD 도입이 필요해지면 그때 `project.config.md`에 실제 배치를 명시하고 전환합니다.

## 도메인 언어

프로젝트 유비쿼터스 언어는 `.claude/DOMAIN.md`(인덱스)와 `.claude/domain/{domain}.md`(정의 본문)에 둡니다.

해당 도메인 작업(코드·주석·테스트 제목·커밋·UI 문구) 시 관련 도메인 파일을 먼저 읽고 용어를 따릅니다. 새 도메인은 `.claude/domain/_TEMPLATE.md`를 복사해 작성합니다.

## 진행 문서

진행 중 기능의 컨텍스트는 `docs/features/{feature}/plan.md`와 `docs/features/{feature}/progress.md`에 누적합니다.

세션을 이어갈 때는 먼저 해당 feature의 `progress.md`를 확인합니다.
