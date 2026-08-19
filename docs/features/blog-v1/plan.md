# blog-v1

| 항목         | 값                          |
| ------------ | --------------------------- |
| Jira         | 미사용 (1인 프로젝트)       |
| GitHub Issue | [#1](https://github.com/qlalfdmlghk1/My-Blog/issues/1) |
| Branch       | `feature/1-blog-v1`         |
| 작성자       | WonSeo                      |
| 작성일       | 2026-08-20                  |
| Type         | Feat                        |

## 🎯 작업 목적

"블로그를 갖는 것"이 아니라 **인증 → 작성 → 저장 → 정적 페이지 재생성**으로 이어지는 발행 파이프라인을 직접 구현해, 동적 데이터(Firestore)와 정적 성능(ISR)이라는 상충 요구를 프레임워크 선택의 근거로 증명한다.

## 📋 작업 범위

**포함 (In Scope)**

- [x] 글 목록 · 글 상세 — ISR 정적 생성 (`/`, `/posts/[slug]`)
- [x] 관리자 로그인 — Firebase Auth, 계정 1개(본인) (`/login`)
- [x] 글 작성 / 수정 / 삭제 — 마크다운 직접 입력 + 실시간 미리보기 (`/admin`, `/admin/write`, `/admin/edit/[id]`)
- [x] 이미지 업로드 — Firebase Storage, 붙여넣기 시 URL 자동 삽입
- [x] 임시저장(draft) / 발행(published) 상태 분리
- [x] 태그 필터 + 카테고리 6종 2단 구조 (`/tags/[tag]`)
- [x] 다크 모드
- [x] RSS · sitemap.xml · robots.txt · OG 이미지 자동 생성
- [x] 발행/수정 시 `revalidatePath`로 해당 경로만 갱신 (`/api/revalidate`)
- [x] Firestore · Storage 보안 규칙 — published 글만 공개 읽기, 쓰기는 관리자 UID만

**제외 (Out of Scope)**

- WYSIWYG 에디터 — 툴바·드래그·자동저장까지 가면 블로그가 아니라 에디터를 만드는 프로젝트가 됨
- 댓글 — 필요해지면 giscus 지연 로드 (v2)
- 검색 — v2
- 다중 사용자 / 권한 등급
- 조회수 — Firestore 쓰기 비용·봇 카운팅 문제로 v2 유예
- 좌측 카테고리 트리 사이드바 — 글 3편에는 빈 공간이 드러남. 글이 쌓인 뒤 v2

## 🖥️ 화면 단위 분해

| 화면명          | 경로                | 요약                    | 접근   | 핵심 인터랙션                          |
| --------------- | ------------------- | ----------------------- | ------ | -------------------------------------- |
| 글 목록         | `/`                 | 최신순 목록 + 태그 필터 | 공개   | 태그 칩 선택 → 필터링                  |
| 글 상세         | `/posts/[slug]`     | 마크다운 본문 렌더      | 공개   | Shiki 하이라이팅 (서버 변환, JS 0KB)   |
| 태그별 목록     | `/tags/[tag]`       | 태그로 좁힌 목록        | 공개   | 태그 이동                              |
| 관리자 로그인   | `/login`            | Firebase Auth 로그인    | 공개   | 로그인 성공 → `/admin` 이동            |
| 글 관리         | `/admin`            | 글 목록 · draft/published | 관리자 | 상태 전환 · 삭제                       |
| 글 작성         | `/admin/write`      | 마크다운 입력 + 미리보기 | 관리자 | 이미지 붙여넣기 → Storage 업로드 후 URL 삽입 |
| 글 수정         | `/admin/edit/[id]`  | 기존 글 편집            | 관리자 | 저장 → `revalidatePath`                |

## 🎨 디자인 분석

- **한 줄 원칙**: 색은 장식이 아니라 **길찾기**. 무채색이 화면의 90%, 색은 분류(카테고리)에만 등장
- **카테고리/태그 2단 구조**: 카테고리 = 색 있음·6개 고정·글당 정확히 1개 / 태그 = 무채색·자유 증식
  - 근거: 색 태그를 자유 증식시키면 태그 20개 시점에 배정할 색이 없어 시스템이 붕괴
- **색 정의 위치**: slug·이름은 `src/lib/categories.ts`, 색 값은 `src/app/globals.css`의 `--cat-{slug}-{bg,fg}` — 라이트/다크 2벌 필수 (파스텔은 다크 배경에서 그대로 쓰면 붕괴)
- **링크/버튼에 포인트 컬러 미사용** — 파란 링크가 '프론트엔드' 카테고리 색과 충돌해 클릭 가능 여부를 흐림. 진한 무채색 + 밑줄/굵기로 구분
- **재사용 컴포넌트**: `CategoryBadge` · `TagChip` · `PostCard` · `TagFilter` · `ThemeToggle` · `SiteHeader` / `SiteFooter`
- **타이포그래피**: 본문 Pretendard Variable, 코드 고정폭 별도 지정 — 색을 다채롭게 쓰는 만큼 글꼴은 절제
- **레이아웃**: v1은 상단 태그 필터 한 줄

## 🛠️ 접근 방식

- **렌더링**: 공개 페이지는 ISR — 평소 정적 HTML 서빙, 발행/수정 시점에만 `revalidatePath`로 해당 경로 재생성. 관리자 페이지는 클라이언트 렌더 + 인증 가드(`AuthGuard`), 검색엔진 노출 불필요
- **마크다운**: 파싱은 서버에서만(`src/lib/markdown.ts`) → 파서를 클라이언트로 내려보내지 않음. 코드 하이라이팅은 Shiki로 서버에서 HTML 변환(클라이언트 JS 0KB). 에디터 미리보기만 클라이언트 파서(`markdown-preview.ts`) 사용 → 관리자 라우트로 코드 분할되어 공개 번들에 미포함
- **보안**: Firestore 보안 규칙이 최종 방어선 — published 글만 공개 읽기, 쓰기는 관리자 UID만. 클라이언트 검증(`NEXT_PUBLIC_ADMIN_UID`)은 UI 가드일 뿐
- **서버/클라이언트 분리**: `src/lib/posts.ts`(서버, firebase-admin) / `posts.client.ts`(클라이언트, firebase SDK)로 분리해 admin 자격증명이 클라이언트 번들에 도달하지 않게 함

## 🔗 참고 자료

| 유형       | 링크                                                       |
| ---------- | ---------------------------------------------------------- |
| Figma      | - (디자인 없이 코드에서 직접 설계)                         |
| Storybook  | -                                                          |
| API 명세   | - (BE 서버 없음 — Firebase SDK 직접 호출)                  |
| Confluence | - (미사용)                                                 |
| 기획       | [docs/PLAN.md](../../PLAN.md) — Notion 원본의 리포지토리 사본 |
| 레퍼런스   | Inpa Dev (inpa.tistory.com) — 톤 레퍼런스                  |

## ✅ 검증 계획

- 단위/통합 테스트: **없음** — v1에 테스트 미도입. `npm run typecheck` + `npm run lint`가 유일한 자동 검증
- 회귀 포인트:
  - `.env.local`이 비어 있어도 `npm run build` / `npm run dev`가 통과해야 함 (의도된 동작 — Firebase 연결 전에도 UI 작업 가능)
  - 서버 전용 시크릿(`FIREBASE_ADMIN_*`)이 클라이언트 번들에 유입되지 않는지
  - 다크 모드에서 카테고리 파스텔 색 대비 (A11y 95+ 목표와 직결)
- 수동 확인:
  - 로그인 → 작성 → 발행 → 목록/상세에 반영(ISR 재생성) 전체 플로우 1회 주행
  - draft 글이 비로그인 상태에서 노출되지 않는지
  - `/rss.xml` · `/sitemap.xml` · `/robots.txt` · OG 이미지 응답 확인
- 목표 지표: Lighthouse Performance 95+ / Accessibility 95+, LCP < 2.0s(모바일), CLS < 0.05

## 🤔 주요 결정 사항

- **[2026-08-20] 베이스/기능 브랜치 분리** — 빈 원격 레포라 PR의 base가 없었다. 스캐폴딩·기획서·`.claude`를 `dev`·`main`에 베이스 커밋(`1d23d53`)으로 올리고, 실제 구현(`src/`·보안 규칙)은 이 브랜치에서 PR로 분리했다.
- **[2026-08-20] 기획 검수(`/plan-review`) 생략** — 착수 전 게이트인데 구현이 이미 끝난 상태라 실익이 적다. PLAN.md에 남은 🔲 미확정 항목(데이터 구조·렌더링 전략·마크다운·보안)은 구현으로 이미 확정됐으므로, PLAN.md 상태 표기 갱신을 후속 작업으로 둔다.
