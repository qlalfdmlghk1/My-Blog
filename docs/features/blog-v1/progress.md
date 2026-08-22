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

- **[2026-08-20] 개인키 파싱 실패 — `DECODER routines::unsupported`**
  `.env.local`을 채운 뒤 `next build`가 `Failed to parse private key`로 죽었다.
  원인은 `admin.ts`의 `replace(/\n/g, '\n')` — **실제 줄바꿈을 실제 줄바꿈으로** 바꾸는 무의미한 치환이라
  `.env`에 저장된 백슬래시+n 두 글자가 그대로 남았다. 주석은 의도를 맞게 적어놨는데 코드가 그걸 안 했다.
  검증 스크립트는 `/\\n/g`를 제대로 써서 통과했기 때문에 "키는 정상인데 빌드만 실패"하는 모습으로 나타나 원인을 찾기 어려웠다.
  `normalizePrivateKey()`로 분리하고 따옴표 포함·이미 실제 줄바꿈인 경우까지 처리하도록 고쳤다.

- **[2026-08-20] 첫 글을 넣자마자 목록 쿼리가 `FAILED_PRECONDITION`**
  `where(status) + orderBy(publishedAt)`와 `where(status) + array-contains(tags) + orderBy(publishedAt)`가
  복합 색인을 요구하는데 색인 정의가 없었다. `firestore.indexes.json`을 추가했다.
  처음 3개로 잡았다가 실제 쿼리로 확인해 2개로 줄였다 — `where(slug) + where(status)`는 등가 필터만 써서
  Firestore가 단일 필드 색인을 병합해 처리한다.

- **[2026-08-20] Firestore 오류 하나가 빌드 전체를 중단시킴**
  색인이 없다는 이유로 `next build`가 실패했다. 일시 장애나 색인 미배포로 배포 파이프라인이 통째로 멈추는 구조라
  `posts.ts`의 조회 3개를 `safeQuery()`로 감싸 빈 결과로 떨어뜨리되 에러는 반드시 로그로 남기게 했다.
  ISR이므로 다음 재검증에서 정상 데이터로 채워진다.

- **[2026-08-20] 서비스 계정으로는 색인을 배포할 수 없음**
  `firebase login`이 불가한 환경에서 서비스 계정 토큰으로 REST API를 직접 호출해 규칙은 배포했지만,
  색인은 `403 The caller does not have permission`. Admin SDK 서비스 계정에 `datastore.indexes.create`가 없다.
  IAM 역할을 넓히는 대신 콘솔에서 생성했다 — 색인 2개 때문에 서비스 계정 권한을 키우는 건 나쁜 거래다.
  (firebase-tools가 먼저 막힌 `serviceusage` 403은 실제 배포가 아니라 API 활성화 여부 사전 점검이었다)

- **[2026-08-20] `Cannot find module for page: /admin/edit/[id]`**
  이전 `next start` 프로세스가 `.next`를 잡고 있어 발생한 일시적 오류. 프로세스 정리 후 정상 빌드.

### ⏭️ 남은 작업

- PLAN.md의 🔲 미확정 표기 갱신 — 데이터 구조·렌더링 전략·마크다운 처리·보안은 구현으로 이미 확정됐다
- 배포 URL · 실측 Lighthouse 점수 기록 (PLAN.md "채울 거리")
- 블로그 이름 / 도메인 확정, 첫 글 3편 주제 (PLAN.md "채울 거리")
- 테스트 미도입 — 도입 시 `project.config.md`의 `TEST_COMMAND` 설정 필요

### Commit — 2026-08-20 02:26

- Message: `Refactor:#1 관리자 판별을 커스텀 클레임으로 전환`
- Issue: `#1`

**변경 요약**

- 보안 규칙의 관리자 판별을 UID 하드코딩에서 커스텀 클레임(`request.auth.token.admin == true`)으로 교체
- `scripts/set-admin-claim.mjs` 추가, `scripts/apply-admin-uid.mjs` 삭제
- 클라이언트 `isAdminUid()` → `hasAdminClaim()` (ID 토큰 강제 갱신), `/api/revalidate`도 클레임 검증으로 통일
- `NEXT_PUBLIC_ADMIN_UID` 제거 — `ADMIN_UID`는 클레임 부여 대상 지정 용도로만 남김

**결정 로그**

- UID는 비밀이 아니므로 하드코딩이 보안 구멍은 아니지만, 치환 스크립트가 규칙 파일을 제자리 수정해
  다음 커밋에 실제 UID가 들어가는 구조였다. 템플릿 파일을 분리하는 대신 클레임으로 전환해
  규칙 파일을 정적으로 만들고 배포 전 준비 단계를 없앴다.
- 관리자 교체·추가 시 규칙 재배포가 필요 없어진 것이 부수 효과.

**다음 작업**

- 없음

### Commit — 2026-08-20 02:26

- Message: `Fix:#1 개인키 파싱 정규식과 Firestore 조회 실패 처리 수정`
- Issue: `#1`

**변경 요약**

- `admin.ts`의 `replace(/\n/g, '\n')` → `normalizePrivateKey()` (백슬래시+n 치환, 따옴표 제거, 실제 줄바꿈 통과)
- `posts.ts` 조회 3개를 `safeQuery()`로 감싸 실패 시 빈 결과 + 에러 로그
- `firestore.indexes.json` 추가 (복합 색인 2개)

**결정 로그**

- 조회 실패를 삼키되 반드시 로그를 남긴다. 빌드 중단보다 낫지만 조용한 실패는 더 나쁘다는 판단.
- 색인은 3개로 잡았다가 실제 쿼리 검증 후 2개로 축소.

**다음 작업**

- 없음

### Commit — 2026-08-20 02:26

- Message: `Chore:#1 블로그 이름을 CHOI's BLOG로 설정`
- Issue: `#1`

**변경 요약**

- `site.ts`의 `name`을 `CHOI's BLOG`로 확정. 제목·OG·RSS·sitemap·푸터에 전파 확인
- 이번 세션의 트러블슈팅 5건과 커밋 로그를 progress.md에 기록

**결정 로그**

- `description`·`author`는 임시값. 기획서상 한 줄 소개는 "직접 입력 필요" 항목이라 확정하지 않고
  검색 결과·OG 카드에 노출된다는 점만 코드 주석과 README에 명시했다.

**다음 작업**

- 한 줄 소개·author 확정
- Vercel 배포 후 `NEXT_PUBLIC_SITE_URL` 설정, 실측 Lighthouse 기록

### Commit — 2026-08-21 01:26

- Message: `Chore:#1 배포 점검 반영 — firebase 프로젝트 설정 추가와 문서 갱신`
- Issue: `#1`

**변경 요약**

- `.firebaserc` 추가 — 없어서 `npm run rules:deploy` 가 프로젝트를 못 찾고 실패하던 상태였다
- `rules:deploy` 를 `npx -y firebase-tools` 로 변경, firebase CLI 전역 설치 없이 실행되게 함
- `site.ts` 주석에서 `description`·`author` 임시값 표기 제거 (현재 문구로 확정)
- README 남은 작업 갱신 — Firebase 연결 완료 처리, 존재하지 않는 `TODO_ADMIN_UID` 참조 제거,
  `NEXT_PUBLIC_SITE_URL` 보류 사유 명시
- `tech.md` 신규 — 프로덕션 발행 파이프라인 검증 결과와 이번 결정 사항 기록

**결정 로그**

- `NEXT_PUBLIC_SITE_URL` 은 등록하지 않는다. 커스텀 도메인 예정이라 지금 vercel.app 주소로 고정하면
  도메인 연결 시 canonical·RSS guid 가 두 번 바뀐다. 글이 0건인 지금이 주소를 바꿔도 구독자에게
  재발송이 발생하지 않는 마지막 타이밍이라는 점도 함께 고려했다.
- `SITE.description`·`author` 를 현재 문구로 확정.
- 보안 규칙은 이미 배포돼 있음을 실측으로 확인했다 — 관리자 커스텀 토큰으로 잘못된 `category` 쓰기를
  시도해 403 이 나오는 것으로 `validPost` 가 살아있음을 입증. Admin SDK 직접 쓰기는 규칙을 우회하므로
  검증에 쓸 수 없다.

**다음 작업**

- `/admin/write` 에디터를 브라우저에서 실제 사용해보기 (마크다운 프리뷰·이미지 업로드·OG 이미지 렌더 확인)
- 커스텀 도메인 확정 후 `NEXT_PUBLIC_SITE_URL` 등록
- 첫 글 3편 주제 확정, 실측 Lighthouse 기록
