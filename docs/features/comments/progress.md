# comments — 진행 상황

## 📌 현재 작업

- 이슈: (미생성 — github-issue-draft.md)
- 브랜치: feature/comments
- 단계: Phase 1 시작
- 마지막 업데이트: 2026-09-21 10:10

---

## [Issue 미생성] comments

**Type**: Feat | **Jira**: (미사용) | **시작**: 2026-09-21

### ✅ 완료

- [x] 작업 환경 셋업 (/start 실행 — plan.md · planning-review.md · 이슈 초안 · 브랜치)
- [x] 기획 검수 3라운드 (개발 착수 불가 0건 / 반드시 확인 8건 / 참고 9건)
- [x] `docs/PLAN.md` 의 giscus 항목을 자체 구현 결정으로 갱신

### 🚧 진행 중

- [ ] Firestore 규칙에 `comments` · `commentThrottle` 추가

### 📝 결정 로그

- [2026-09-21 10:10] /start 실행, 작업 환경 셋업 완료
- [2026-09-21 10:10] 쓰기는 서버 라우트 경유로 확정 — 보안 규칙으로 익명 쓰기를 열면 서버 필터를 우회할 수 있다
- [2026-09-21 10:10] Gemini 판정 실패 시 **게시하지 않고 거절**한다. "단어 사전만으로 게시"는 봇으로 한도를 소진시켜 AI 필터를 끄는 우회 경로가 된다. 승인 대기함은 만들지 않고, 실패가 매일 반복되면 그때 한도 상향·대기함을 검토한다
- [2026-09-21 10:10] IP 는 서버 전용 salt 를 섞어 해시한다 — IPv4 공간이 작아 salt 없는 해시는 전량 역산이 가능하다. 댓글 문서에는 해시를 넣지 않고 `commentThrottle` 에만 둔다
- [2026-09-21 10:10] 기획 검수 ⚠️ 8건 중 7건은 권장안대로 확정(본문 1~500자 · published 한정 · 최신순 100개 · 차단 기준 5종 · 최근 1건 대조 · 닉네임 중복 허용 · PLAN.md 갱신). 나머지 1건(Firebase 요금제)은 미확인으로 남김
- [2026-09-21 10:10] 댓글 재검증은 기존 `/api/revalidate` 에 `scope: 'comment'` 를 더해 글 상세 한 경로만 무효화한다 — 기존 scope 는 목록·RSS·sitemap·전 카테고리를 훑어 댓글 한 건에는 과하다

### 🐛 트러블슈팅

<!-- /note troubleshoot 으로 추가 -->

### ⏭️ 남은 작업

- [ ] `src/types/comment.ts` · `src/lib/comments.ts` · `comments.client.ts`
- [ ] `src/lib/nickname.ts`(형용사·동물 목록과 검증) · `src/lib/profanity.ts`(사전·정규화·자모 분해)
- [ ] `src/lib/moderation.server.ts` (Gemini `{ abusive, reason }` 판정)
- [ ] `src/app/api/comments/route.ts` · `src/app/api/comments/identity/route.ts`
- [ ] `src/components/CommentSection.tsx` · `CommentAvatar.tsx`
- [ ] `src/app/posts/[slug]/page.tsx` 에 댓글 영역 연결
- [ ] `src/app/admin/comments/page.tsx` (관리자 삭제)
- [ ] `firestore.rules` 갱신 후 `npm run rules:deploy`
- [ ] `COMMENT_IP_SALT` 를 `.env.example` 과 Vercel 환경변수에 추가
- [ ] **배포 전**: Firebase 요금제 확인(Blaze 면 예산 알림) · Firestore TTL 정책(`commentThrottle.expireAt`) 켜기

### Commit — 2026-09-21 11:05

- Message: `Docs: 익명 댓글 기획 문서와 검수 결과 작성`
- Issue: (미생성 — github-issue-draft.md)
- Jira: 미사용

**변경 요약**

- `/start` 산출물 4종: plan.md · planning-review.md · progress.md · github-issue-draft.md
- `docs/PLAN.md` "v1에서 하지 않는 것"의 giscus 항목을 자체 구현 결정으로 갱신

**결정 로그**

- giscus 를 쓰지 않는 근거를 PLAN.md 에 남김 — GitHub 계정 로그인을 요구해 "로그인 없는 댓글"이 성립하지 않고, 비속어 필터를 붙일 자리도 없다
- 기획 검수 ⚠️ 8건 중 7건 확정(본문 1~500자 · published 한정 · 최신순 100개 · 차단 기준 5종 · 최근 1건 대조 · 닉네임 중복 허용 · PLAN.md 갱신), Firebase 요금제 1건은 미확인으로 남김

**다음 작업**

- 서버 파이프라인 커밋
