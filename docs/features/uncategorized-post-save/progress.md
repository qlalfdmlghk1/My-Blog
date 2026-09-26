# uncategorized-post-save — 진행 상황

## 📌 현재 작업

- 이슈: #28 (Fix)
- 브랜치: fix/28-uncategorized-post-save
- 단계: PR 준비
- 마지막 업데이트: 2026-09-27

---

## [Issue #28] uncategorized-post-save

**Type**: Fix | **Jira**: 미사용 | **시작**: 2026-09-27

### ✅ 완료

- [x] 작업 환경 셋업 (/start 실행)
- [x] 기획 검수 (/plan-review) — 단, "카테고리 비우기" 해석 기준이라 이후 폐기
- [x] 운영 `firestore.rules` 재배포 — 소분류 '분류 없음' 저장 가능 확인 (사용자 수동 확인)
- [x] 카테고리 화면 '분류 없음' 칩 필터 (`LOOSE_SUBCATEGORY = '_none'`)
- [x] `TagChip` 높이 `h-6` 고정
- [x] `npm run lint` · `npm run typecheck` 통과

### 🚧 진행 중

- [ ] PR

### 📝 결정 로그

- [2026-09-27] /start 실행, 작업 환경 셋업 완료
- [2026-09-27] 카테고리 선택 사항화를 구현·배포했다가 의도 착오로 전부 되돌림, 원 규칙 재배포
- [2026-09-27] 원인: 레포 규칙은 a464164(09-01)부터 소분류 빈 값을 허용했지만 운영에는 그 이전(소분류 필수) 규칙이 남아 있던 것으로 추정 — 재배포 후 저장 성공
- [2026-09-27] '분류 없음' 주소는 예약 slug `_none` — slugify 가 `_` 를 `-` 로 바꿔 충돌 불가

### 🐛 트러블슈팅

- 규칙 변경 커밋 후 `firebase deploy --only firestore:rules`를 빠뜨리면 로컬·운영 규칙이 어긋나 `Missing or insufficient permissions` 원문 에러만 뜬다

### ⏭️ 남은 작업

- [ ] PR 리뷰 · 머지

### Commit — 2026-09-27

- Message: `Feat:#28 카테고리 화면 소분류 칩에 '분류 없음' 필터 추가` · `Fix:#28 태그 칩 높이를 h-6 으로 고정` · `Docs:#28 소분류 '분류 없음' 작업 문서 추가`
- Issue: `#28`
- Jira: 미사용

**변경 요약**

- 카테고리 화면에 '분류 없음 N' 칩과 `/categories/{slug}/_none` 목록 추가, revalidate 경로 포함
- `TagChip` 높이 `h-6` 고정
- plan/progress/planning-review 문서 추가 (착수 후 해석 정정 기록 포함)

**결정 로그**

- 저장 불가 자체는 코드 변경 없이 운영 규칙 재배포로 해결

**다음 작업**

- 없음
