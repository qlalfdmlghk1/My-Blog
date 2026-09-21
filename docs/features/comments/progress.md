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

### Commit — 2026-09-21 11:08

- Message: `Feat: 익명 댓글 저장 파이프라인과 2단 필터 구현`
- Issue: (미생성 — github-issue-draft.md)
- Jira: 미사용

**변경 요약**

- `types/comment.ts` · `lib/comments.ts`(컬렉션명·한계값·본문 판정) 신규
- `lib/profanity.ts`: 정규화 + 자모 분해 대조. 자모 낱자 구간은 초성 패턴만 따로 검사
- `lib/nickname.ts`: 형용사 40 × 동물 40 조합 발급과 **서버 검증**
- `lib/moderation.server.ts`: Gemini `{ abusive, reason }` 판정 래퍼
- `lib/throttle.server.ts`: IP salt 해시 + 30초 쿨다운(확인·기록을 한 트랜잭션)
- `api/comments/route.ts`(쓰기) · `api/comments/identity/route.ts`(닉네임 발급)
- `firestore.rules`: `comments` 읽기 공개·생성/수정 차단·삭제 관리자, `commentThrottle` 전부 차단
- `api/revalidate`에 `scope: 'comment'` — 글 상세 한 경로만 무효화
- `.env.example`에 `COMMENT_IP_SALT` 추가

**결정 로그**

- 쓰기를 보안 규칙에서 **완전히** 막는다(관리자에게도). 규칙은 필드 모양만 볼 수 있어 욕설 판정을 못 하고, create 를 여는 순간 서버 필터를 건너뛰는 두 번째 경로가 생긴다
- Gemini 실패는 통과가 아니다 — 봇으로 하루 한도를 소진시키면 2차 필터가 꺼지는 우회 경로가 된다
- 비속어 목록에서 `보지`·`자지`·`꺼져`·`죽어라`·`멍청이`·`돌아이` 제외. 평범한 문장에 그대로 나타나 정상 댓글이 차단된다. 오탐 비용이 미탐보다 크다
- 모음 변형(`싀발`·`쉬발`)은 자모 분해로 못 잡는다(ㅅㅣ ≠ ㅅㅢ). 자음만 맞추면 `사부`·`소방`이 걸려서, 표기마다 목록에 한 줄씩 적는 쪽을 택함
- 초성 패턴(`ㅅㅂ`)은 **자모 낱자로 직접 입력된 구간에서만** 찾는다. 자모 줄 전체에서 찾으면 `웃보`(ㅇㅜㅅㅂㅗ)가 걸린다
- IP 해시에 서버 전용 salt 필수 — IPv4 43억 개는 salt 없으면 전량 역산 가능. salt 없으면 해시하지 않고 쿨다운만 끈다
- 닉네임 목록을 서버에만 둔다. 브라우저 번들에 있으면 조합만 맞춘 이름을 만들 수 있다

**검증**

- 비속어·링크·길이·닉네임 위조 33건 대조에서 오탐·미탐 0건 (tsx 스크립트, 커밋 안 함)
- `npm run lint` · `npm run typecheck` · `npm run build` 통과

**다음 작업**

- 화면(글 상세 댓글 영역·관리자 삭제) 커밋

### Commit — 2026-09-21 11:12

- Message: `Feat: 글 상세 댓글 영역과 관리자 삭제 화면 추가`
- Issue: (미생성 — github-issue-draft.md)
- Jira: 미사용

**변경 요약**

- `components/CommentSection.tsx`: 닉네임 발급·랜덤 변경·입력·목록. localStorage 에 닉네임 보관
- `components/CommentAvatar.tsx`: 시드 기반 도형 아바타(이미지 아님 — 정적 HTML 에 함께 실린다)
- `lib/comments.client.ts`: 관리자 읽기·삭제·재검증 호출
- `app/posts/[slug]/page.tsx`: `getComments` 를 카테고리·사전과 함께 읽어 넘김
- `app/admin/comments/page.tsx` 신규, `app/admin/page.tsx` 관리 메뉴에 "댓글" 링크 추가

**결정 로그**

- 목록은 서버가 프리렌더한다 — 정적 HTML 에 실려야 검색엔진과 JS 꺼진 환경에서 읽힌다. 클라이언트 컴포넌트인 것은 입력 때문
- 저장 후 `router.refresh()` 와 별개로 방금 쓴 댓글을 상태에 들고 있는다. 재생성 전에 응답이 오면 "등록됐다는데 안 보인다"가 된다
- 거절되면 입력 내용을 지우지 않는다 — 고쳐서 다시 낼 수 있어야 한다
- 무엇에 걸렸는지는 작성자에게 알리지 않고 서버 로그에만 남긴다. 알려주면 그 부분만 바꿔 재시도하게 된다
- 관리자 목록은 `getAllComments`(서버) 대신 클라이언트에서 기존 `listAllPosts` 와 조합. 관리 화면은 `AuthGuard` 가 클라이언트라 서버 컴포넌트로 두면 초안 제목이 권한 전에 나간다
- 본문은 React 텍스트로만 렌더. 마크다운·자동 링크 없음(XSS 지점을 만들지 않는다)

**다음 작업**

- 로고 커밋

### Commit — 2026-09-21 11:15

- Message: `Feat: 마스코트 로고를 헤더와 탭 아이콘에 적용`
- Issue: (미생성 — github-issue-draft.md)
- Jira: 미사용

**변경 요약**

- `public/logo.png` · `src/app/icon.png` 신규 (168×168, 6.5KB 동일 파일)
- `SiteHeader`: 무채색 점 → 24px 마스코트 이미지. 기존 "로고에도 색을 쓰지 않는다" 주석을 새 근거로 교체

**결정 로그**

- 기존 판단(무채색 점)을 뒤집었다. 근거: 사이트에 얼굴이 없었고, 24px 라 카테고리 배지와 부딪히지 않는다. 화면에서 분류 팔레트 밖의 색을 쓰는 유일한 자리
- `next/image` 대신 raw `img` — 24px 고정 자산이라 최적화 파이프라인으로 얻을 게 없다 (CoverImage 와 같은 방식, 사유는 다름)
- favicon 은 `src/app/icon.png` 규약에 맡긴다. 빌드 결과에서 `<link rel="icon" sizes="168x168">` 확인
- `alt=""` — 바로 옆에 사이트 이름이 글자로 있어 읽어주면 같은 말이 두 번 나온다

**트러블슈팅**

- `src/app/icon.png` 추가 후 첫 빌드가 `Cannot find module for page: /api/slug/suggest` 로 실패. 라우트 매니페스트가 갱신되지 않은 캐시 문제로, `rm -rf .next` 후 정상. 한 번만 겪는 현상

**남은 작업 (배포 전)**

- `COMMENT_IP_SALT` 를 `.env.local`·Vercel 에 추가
- `npm run rules:deploy` 로 Firestore 규칙 배포
- Firebase 콘솔에서 `commentThrottle.expireAt` TTL 정책 켜기
- Firebase 요금제 확인 — Blaze 면 예산 알림
- 다크 모드에서 로고의 연한 배경이 밝은 사각형으로 뜸 — 거슬리면 다크용 변형 검토
