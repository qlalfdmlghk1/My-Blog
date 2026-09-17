# ui-refactor — 진행 상황

## 📌 현재 작업

- 이슈: 없음 (이슈 번호 없이 진행)
- 브랜치: refactor/ui-refactor
- 단계: UI 리팩토링 + AI 커버 생성 구현 완료 · 리뷰 수렴 완료 · 후속 항목 정리 대기
- 마지막 업데이트: 2026-09-17 16:33

---

## ui-refactor

**Type**: Refactor / Feat | **Jira**: 미사용 | **시작**: 2026-09 (이전 커밋 `a464164`·`1e57955` 에서 시작)

### ✅ 완료

- [x] 사이드바(`SiteSidebar`)·홈 소개(`SiteIntro`) 제거 → `CategoryNav` 탭 + `SubcategoryChips` 로 전환, `ListShell` 한 칸 구조
- [x] 홈 상단 `HeroCarousel`, 커버 없는 글의 팔레트 도형 커버(`CoverImage` + `cover-art`)
- [x] Tmoney 폰트 `@font-face` 직접 선언 + `ascent/descent-override` (모바일 세로 정렬)
- [x] 개발용 목 데이터(`mock-data.ts`, 자격 증명 없을 때만)
- [x] 발행 확인 화면 Gemini 커버 이미지 생성 (`/api/cover/generate` · `gemini.server.generateImage` · Vercel Blob 저장)

### 🚧 진행 중

- [ ] /review-converge 에서 "지금 처리" 로 정한 Non-blocker 6건 반영 (아래 결정 로그 참조)

### 📝 결정 로그

- [2026-09-17 16:01] **/review-converge 1라운드 — 수렴.** Blocker 0 · Non-blocker 12 · 자동 반영 0건 · lint·typecheck·build 통과.
  지금 처리 예정(미반영) 6건: `title` 길이 상한 · 인증 가드를 구성 검사 앞으로 · `toDraft()` 추출 ·
  `generateImage()` catch 로깅 · `[&::-webkit-scrollbar]:hidden` · 루트 폰트 자산 3종 정리.
  후속 6건: mock-data 동적 import · 발행 경로 커버 즉시 저장(판단 필요) · `CategoryNode` 를 `types/` 로 ·
  `ListHeader` 추출 · `TagChip` tag/label union · 카테고리 0건 안내(판단 필요).
  사람 확인: 유료 이미지 생성 rate limit 정책 · Blob 누적 정리 · 커버 호스트 허용 목록 · Tmoney 폰트 라이선스 ·
  **`npm audit` `next` Critical 2건(`<15.5.24`) 업그레이드 시점 결정**.
- [2026-09-17 16:33] 커밋을 Refactor(UI) → Feat(AI 커버) 2개로 분리. `PublishReview` 가 `CoverImage` 를 쓰므로 Refactor 가 먼저.
- [2026-09-17 16:33] 루트의 `tmoney.css`·`extrabold.woff2`·`regular.woff2` 는 리뷰에서 미참조 자산으로 지적됐으나 사용자 결정으로 이번 커밋에 포함. 정리 여부는 후속.

---

### Commit — 2026-09-17 16:33

- Message: `Refactor: 사이드바를 분류 탭으로 바꾸고 히어로 캐러셀·도형 커버 추가`
- Issue: 없음
- Jira: 미사용

**변경 요약**

- `SiteSidebar`·`SiteIntro` 삭제, `CategoryNav`(대분류 탭)·`SubcategoryChips`(소분류 칩) 신규, `ListShell` 시그니처 변경과 호출처 4곳(`HomeList`·`CategoryList`·`SubcategoryList`·`TagList`) 갱신
- `HeroCarousel`(최신 글 캐러셀, `aria-live`)·`CoverImage`·`cover-art`(팔레트 도형 SVG) 신규, `PostCard` 가 `CoverImage` 사용
- `globals.css`·`layout.tsx` — Tmoney `@font-face` 직접 선언 + `ascent/descent-override`, jsdelivr CSS 링크 제거
- `mock-data.ts` 신규 — `posts.ts`·`categories.server.ts` 가 자격 증명 없는 개발 환경에서 사용
- `admin/page.tsx` 머리말 정리, `types/category.ts`·`tailwind.config.ts` 소폭 수정

**결정 로그**

- 목 데이터는 `server-only` + `!hasAdminCredentials() && NODE_ENV !== 'production'` 이중 게이트로만 활성
- 폰트 메트릭 override 값 근거는 `globals.css` 주석에 기록

**다음 작업**

- Feat 커밋(AI 커버 생성) 이어서 진행 (완료)

### Commit — 2026-09-17 16:45

- Message: `Feat: 발행 확인 화면에 Gemini 커버 이미지 생성 추가`
- Issue: 없음
- Jira: 미사용

**변경 요약**

- `/api/cover/generate` 라우트 신규 — Bearer ID 토큰 `verifyIdToken(token, true)` + admin 클레임 검증 → `generateImage` → Vercel Blob `put` (public, `addRandomSuffix`)
- `gemini.server.ts` 에 `generateImage()` 추가 (API 키는 헤더, `AbortSignal.timeout`)
- `cover-prompt.ts`(팔레트별 프롬프트, `Record<PaletteId, string>`)·`cover.client.ts`(브라우저 호출, 토큰 미저장) 신규
- `PublishReview.tsx` — 커버 생성·제거 버튼, 생성 즉시 `saveCover` 로 Firestore 저장, 발행 시 커버 없으면 자동 생성하되 실패는 `coverWarning` 으로 분리
- `.env.example` 에 `GEMINI_IMAGE_MODEL` 추가

**결정 로그**

- 커버 생성 실패는 발행 실패로 만들지 않는다 — 도형 커버로 발행하고 경고만 남김
- 서버 시크릿(Gemini 키·Blob 토큰·Admin 키)은 `route.ts`·`gemini.server.ts` 에만 두고 `cover.client.ts` 는 ID 토큰만 실어 보냄

**다음 작업**

- 리뷰 "지금 처리" 6건 반영 (`title` 상한 · 인증 가드 순서 · `toDraft()` · catch 로깅 · webkit 스크롤바 · 루트 폰트 자산)
- `next` `<15.5.24` Critical 취약점 업그레이드 시점 결정
- `globals.css` `scrollbar-gutter: stable` (커밋 도중 추가된 변경) 별도 커밋

### Commit — 2026-09-17 17:10

- Message: `Fix: 스크롤바 유무에 따라 본문 폭이 흔들리는 문제 수정`
- Issue: 없음
- Jira: 미사용

**변경 요약**

- `globals.css` `html` 에 `scrollbar-gutter: stable` 추가 — 스크롤바가 없을 때도 자리를 확보해 뷰포트 폭이 바뀌지 않게 함
- 증상 · 원인 · 대가는 `troubleshoot.md` 에 기록

**결정 로그**

- `overflow-y: scroll` 대신 `scrollbar-gutter: stable` — 스크롤할 것이 없을 때 비활성 스크롤바가 그려지는 쪽이 더 어색함

**다음 작업**

- 리뷰 "지금 처리" 6건 반영 (`title` 상한 · 인증 가드 순서 · `toDraft()` · catch 로깅 · webkit 스크롤바 · 루트 폰트 자산)
- `next` `<15.5.24` Critical 취약점 업그레이드 시점 결정
