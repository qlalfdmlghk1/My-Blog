# post-detail-cover — 진행 상황

## 📌 현재 작업

- 이슈: #25 (Feat)
- 브랜치: feature/25-post-detail-cover
- 단계: PR #26 리뷰 수렴 완료 · 수동 확인 후 머지
- 마지막 업데이트: 2026-09-25 00:52

---

## [Issue #25] post-detail-cover

**Type**: Feat | **Jira**: 미사용 (1인 프로젝트) | **시작**: 2026-09-25

### ✅ 완료

- [x] 작업 환경 셋업 (/start 실행)
- [x] 글 상세 상단에 커버 이미지 표시 — `CoverImage` 재사용, `<header>` 위, `aspect-[16/9] rounded-xl`, `priority`
- [x] 썸네일이 없으면 기존처럼 표시 — `post.coverImage` 가 있을 때만 렌더
- [x] (추가) 데스크톱 목차 접기 → 본문 55rem 으로 확장, localStorage 기억 (`TocCollapseToggle`, `tailwind.config.ts` `toc-collapsed:` 변형, `layout.tsx` `tocInit`)
- [x] (추가) 모바일 접힘 목차 (`PostTocInline`, `<details>`)

### 🚧 진행 중

- [ ] 화면 수동 확인 (360·390·768·1280px, 라이트·다크)
- [ ] 목차 접기 확인 — 접기/펼치기, 새로고침·다른 글 이동 시 유지, 깜빡임 없음, 목차 앵커 이동

### 📝 결정 로그

- [2026-09-25 00:01] /start 실행, 작업 환경 셋업 완료
- [2026-09-25 00:01] 기획 검수 생략. 모호점 1건 직접 확인 — 사진 커버가 없는 글은 상세에서 **이미지 없이** (도형 그림 미사용)
- [2026-09-25 00:05] 구현 — lint · typecheck · build 통과. 빌드 산출물 4개 글 HTML 모두 커버 img(eager, fetchPriority=high) 포함 확인
- [2026-09-25 00:17] 목차 접기를 #25 에 포함하기로 결정. 처음엔 `<details>` 로 목록만 접었으나 사용자 의도는 "목차를 치우고 본문을 넓게" 였음 → 데스크톱은 폭 확장형으로 재구현, 모바일 `<details>` 목차는 유지
- [2026-09-25 00:17] lint · typecheck 통과. dev 서버 CSS 에 `toc-collapsed:` 규칙 3종 생성 확인
- [2026-09-25 00:21] 목차 접기 다듬기 — 칸 폭 300ms 전환(`grid-template-columns`), 글자·목록은 옅어짐(opacity+visibility, 폭 13rem 고정으로 줄바꿈 출렁임 방지), 단추를 칸 왼쪽 끝으로 옮겨 접혀도 제자리. 단추 테두리는 카테고리 색을 시도했다가 **없애기로** — 호버 시 옅은 면만

- [2026-09-25 00:27] (추가) 글 상세 커서를 야구 배트로 — 처음엔 누르는 동안(`:active`)만 대각선 배트였으나, 사용자 의도는 **글 상세에 들어온 순간부터** 배트 + **12시-6시로 똑바로** 세운 모양. `body:has(.reading)` 로 페이지 전체(헤더·여백 포함), hotspot 은 배트 머리 맨 위(16 1). 라이트·다크 두 벌, JS 없음

### 🐛 트러블슈팅

<!-- /note troubleshoot 으로 추가 -->

### ⏭️ 남은 작업

- [ ] 커버 없는 글 화면 확인 — 현재 발행 글 4개 모두 커버가 있어 실데이터로는 미확인

### Commit — 2026-09-25 00:23

- Message: `Feat:#25 글 상세에 커버 이미지를 표시하고 목차 접기를 추가`
- Issue: `#25`
- Jira: 미사용

**변경 요약**

- 글 상세 제목 위에 사진 커버 표시 (`CoverImage` 재사용, 16:9·rounded-xl, priority). 사진 없는 글은 이미지 없이
- 데스크톱 목차 접기 단추(`TocCollapseToggle`) — 접으면 본문 44rem → 55rem, 칸 폭·목록 투명도 300ms 전환, localStorage 기억
- `layout.tsx` 인라인 스크립트로 첫 페인트 전 `html.toc-collapsed` 복원 + `tailwind.config.ts` 에 `toc-collapsed:` 변형
- 모바일(xl 미만) 접힘 목차 `PostTocInline` (`<details>`) 신규

**결정 로그**

- 목차 접기를 #25 범위에 포함 (사용자 결정)
- 본문 44rem 고정 원칙은 기본값으로 유지, 접기는 독자 선택 예외. 넓힐 폭은 목차 자리까지(55rem)
- 접기 단추는 테두리 없이, 호버 시 옅은 면만 (카테고리 색 테두리는 시도 후 철회)

**다음 작업**

- 화면 수동 확인 (360·390·768·1280px, 라이트·다크) · 커버 없는 글 확인
- PR 생성 (/pr)

### Commit — 2026-09-25 00:33

- Message: `Feat:#25 글 상세 커서를 야구 배트로 변경`
- Issue: `#25` (Closes)
- Jira: 미사용

**변경 요약**

- 글 상세 페이지 전체(`body:has(.reading)`)에서 커서를 세로 야구 배트로 (`--cursor-bat`, globals.css). 다른 화면은 공 유지

**결정 로그**

- 누르는 동안만(`:active`)이 아니라 글 상세 진입 시점부터 배트
- 12시-6시로 똑바로 세우고 hotspot 은 배트 머리 맨 위(16 1)
- main 이 아닌 body 에 걸어 헤더·여백까지 한 가지 커서로

**다음 작업**

- 화면 수동 확인 (360·390·768·1280px, 라이트·다크) · 커버 없는 글 확인
- PR 생성 (/pr)

### Commit — 2026-09-25 00:48

- Message: `Fix:#25 리뷰 수렴 1라운드 — 목차 접기 포커스 링·스크롤·동작 최소화와 낡은 주석 수정`
- Issue: `#25`
- Jira: 미사용

**변경 요약**

- 접기 단추 포커스 링을 안쪽(-2px)에 그려 목차 칸 overflow 에 잘리지 않게
- 접힌 목차 칸의 세로 스크롤 끔(`xl:toc-collapsed:overflow-y-hidden`) — 긴 목차에서 스크롤바가 펼치기 단추를 덮던 문제
- `motion-reduce:transition-none` → `xl:motion-reduce:transition-none` — xl 전환 규칙보다 앞에 출력돼 효과가 없던 문제
- `.reading` 역할 주석 두 가지 → 세 가지(배트 커서 추가), `TocSummary` 주석을 실제 사용처(모바일 목차)에 맞게

**결정 로그**

- /review-converge 1라운드: Blocker 0. 명백한 오류 5건만 자동 반영, 정책·취향성 항목은 남김

**다음 작업**

- 리뷰 수렴 2라운드

### Commit — 2026-09-25 00:52

- Message: `Docs:#25 리뷰 수렴 산출물 추가`
- Issue: `#25`
- Jira: 미사용

**변경 요약**

- `review-converge.md` — /review-converge 2라운드 수렴 결과(자동 반영 5건 · 남긴 항목 · 수동 시나리오 6종)

**결정 로그**

- [2026-09-25 00:52] /review-converge 2라운드 — 수렴. 자동 반영 5건(`d5943d8`), 남긴 항목 10건. 커버 URL 검증·깨진 커버 처리는 정책/제품 판단으로 사람 확인

**다음 작업**

- 수동 시나리오 확인 후 PR #26 머지
- (후속 이슈 후보) 커버 URL https 검증 — PostEditor 저장 경로 / firestore.rules
