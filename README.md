# My-Blog

개인 기술 블로그 — 관리자 로그인 후 웹에서 직접 글 작성 · Firestore 저장 · ISR로 정적 페이지 속도 유지.

목표는 "블로그를 갖는 것"이 아니라 **인증 → 작성 → 저장 → 정적 페이지 재생성**으로 이어지는 발행 파이프라인을 직접 만드는 것.

| | |
|---|---|
| Stack | Next.js 15 (App Router) · TypeScript · Tailwind CSS · Firebase(Auth/Firestore/Storage) |
| Deploy | Vercel (ISR) |
| Role | 기획 · 디자인 · 개발 · 배포 (100% 단독) |

기획서는 [docs/PLAN.md](docs/PLAN.md).

## 시작하기

```bash
npm install
cp .env.example .env.local   # 값 채우기 — 아래 "Firebase 준비" 참고
npm run dev
```

`.env.local`이 비어 있어도 `npm run build`와 `npm run dev`는 통과한다. 글 목록이 빈 상태로 나오고 관리자 화면에는 설정 안내가 표시된다 — Firebase를 연결하기 전에도 UI를 작업할 수 있게 의도한 동작이다.

| 스크립트 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm start` | 빌드 결과 서빙 |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |

## 구조

```
src/
├── app/
│   ├── page.tsx                  글 목록 (ISR · 최신순 · 태그 필터)
│   ├── posts/[slug]/page.tsx     글 상세 (ISR)
│   ├── tags/[tag]/page.tsx       태그별 목록 (ISR)
│   ├── login/page.tsx            관리자 로그인
│   ├── admin/
│   │   ├── layout.tsx            AuthGuard — 여기서 관리자 라우트가 갈린다
│   │   ├── page.tsx              글 관리 (목록 · 상태)
│   │   ├── write/page.tsx        글 작성
│   │   └── edit/[id]/page.tsx    글 수정
│   ├── api/revalidate/route.ts   ID 토큰 검증 후 revalidatePath
│   ├── rss.xml/route.ts          RSS
│   ├── sitemap.ts / robots.ts    sitemap.xml / robots.txt
│   ├── opengraph-image.tsx       사이트 기본 OG
│   ├── posts/[slug]/opengraph-image.tsx   글별 OG (제목·카테고리·태그)
│   └── globals.css               무채색 스케일 + 본문 타이포 (카테고리 색은 여기 없음)
├── components/
│   ├── CategoryBadge · TagChip · PostCard
│   ├── ListShell · SiteSidebar · SiteIntro · PostToc
│   ├── SiteHeader · SiteFooter · ThemeToggle
│   └── admin/AuthGuard · PostEditor
├── lib/
│   ├── categories.ts             카테고리 6종 + 색 hex (단일 진실 공급원)
│   ├── category-css.ts           위 값에서 CSS 변수 생성
│   ├── og.tsx                    OG 카드 레이아웃 + 한글 폰트 로딩
│   ├── posts.ts                  서버 조회 (firebase-admin)
│   ├── posts.client.ts           관리자 CRUD · 이미지 업로드 · 재생성 트리거
│   ├── markdown.ts               서버 렌더 (marked + Shiki)
│   ├── markdown-preview.ts       에디터 미리보기 (marked만)
│   └── firebase/client.ts · admin.ts
└── types/post.ts
```

## Firebase 준비

콘솔 작업(1~5)은 브라우저에서 직접 해야 하고, 6~8은 터미널에서 한다.

### 1. 프로젝트 생성

[console.firebase.google.com](https://console.firebase.google.com) → 프로젝트 추가. Google 애널리틱스는 꺼도 된다.

### 2. 웹 앱 등록 → 클라이언트 키

프로젝트 설정(⚙️) → 내 앱 → **웹(`</>`)** 추가 → "Firebase 호스팅 설정"은 **체크하지 않는다**(배포는 Vercel).

나오는 `firebaseConfig` 값을 `.env.local`에 옮긴다.

| firebaseConfig | .env.local |
|---|---|
| `apiKey` | `NEXT_PUBLIC_FIREBASE_API_KEY` |
| `authDomain` | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` |
| `projectId` | `NEXT_PUBLIC_FIREBASE_PROJECT_ID` |
| `storageBucket` | `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` |
| `messagingSenderId` | `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` |
| `appId` | `NEXT_PUBLIC_FIREBASE_APP_ID` |

이 6개는 브라우저에 그대로 노출되는 값이라 공개돼도 무해하다. 접근 통제는 보안 규칙이 한다.

### 3. Authentication — 관리자 계정 1개

Authentication → 시작하기 → **이메일/비밀번호** 사용 설정 → Users 탭 → 사용자 추가(본인 이메일/비밀번호).

생성된 행의 **사용자 UID**를 복사해 `.env.local`의 `ADMIN_UID`에 넣는다. 이 값은 커스텀 클레임을 부여할 대상을 가리키는 용도이고, 실제 권한 판별은 클레임이 한다(7단계).

> 회원가입 화면은 없다. 계정은 콘솔에서만 만든다 — v1은 사용자 1명이다.

### 4. Firestore

Firestore Database → 데이터베이스 만들기 → **프로덕션 모드** → 리전 `asia-northeast3`(서울).

> 테스트 모드로 만들면 30일 후 전부 차단된다. 어차피 6단계에서 규칙을 덮어쓰므로 프로덕션 모드로 시작한다.

### 5. Storage

Storage → 시작하기 → 프로덕션 모드 → Firestore와 **같은 리전**.

### 6. 서버 자격증명 (Admin SDK)

프로젝트 설정 → **서비스 계정** → "새 비공개 키 생성" → JSON 다운로드. 그 JSON에서 세 값을 꺼낸다.

| JSON | .env.local |
|---|---|
| `project_id` | `FIREBASE_ADMIN_PROJECT_ID` |
| `client_email` | `FIREBASE_ADMIN_CLIENT_EMAIL` |
| `private_key` | `FIREBASE_ADMIN_PRIVATE_KEY` |

`private_key`는 JSON에 있는 그대로(`\n`이 리터럴 두 글자인 상태) 큰따옴표로 감싸 한 줄로 넣는다:

```
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
```

> 이 JSON은 **저장소에 넣지 않는다.** 유출되면 보안 규칙을 통째로 우회당한다. `.gitignore`가 `.env.local`을 막고 있지만 JSON 파일 자체를 프로젝트 폴더에 두지 않는 게 안전하다.

### 7. 관리자 클레임 부여

```bash
npm run admin:claim
```

`.env.local`의 `ADMIN_UID` 계정에 커스텀 클레임 `{ admin: true }`를 부여한다. 보안 규칙과 서버 검증은 UID가 아니라 이 클레임을 본다.

클레임은 Firebase가 서명한 ID 토큰에 실려 오므로 클라이언트가 위조할 수 없다. UID를 규칙에 하드코딩하지 않는 덕분에 규칙 파일이 정적이 되고(배포 전 치환 단계 없음), 저장소에 계정 식별자가 남지 않으며, 관리자를 바꿀 때 규칙 재배포가 필요 없다.

회수는 `npm run admin:claim -- --revoke`.

> 이미 로그인한 브라우저는 토큰이 갱신돼야 클레임을 인식한다. `hasAdminClaim()`이 `getIdTokenResult(true)`로 강제 갱신하므로 새로고침이면 충분하다.

### 8. 규칙 · 색인 배포

```bash
npx firebase login
npx firebase use --add          # 위에서 만든 프로젝트 선택
npm run rules:deploy
```

색인 배포를 빠뜨리면 글을 넣는 순간 목록 쿼리가 `FAILED_PRECONDITION`으로 실패한다. `getPublishedPosts()`(status + publishedAt)와 `getPostsByTag()`(status + tags + publishedAt)가 복합 색인을 요구하기 때문이다 — 정의는 `firestore.indexes.json`에 있다. 색인 생성은 몇 분 걸린다.

### 9. 확인

```bash
npm run dev
```

`/login`에서 3단계 계정으로 로그인 → `/admin/write`에서 글 작성 → 발행 → `/`에 뜨는지 확인.

### Firestore 문서 구조

`posts/{postId}`

| 필드 | 타입 | 비고 |
|---|---|---|
| `slug` | string | URL. 에디터가 저장 전 중복을 검사하지만 **서버 제약은 아니다** (아래 참고) |
| `title` | string | |
| `content` | string | 마크다운 원문 |
| `excerpt` | string | 비우면 본문에서 자동 생성 |
| `category` | string | 6종 중 하나 · 정확히 1개 |
| `tags` | string[] | 색 없음 · 자유 · 최대 20개 |
| `coverImage` | string \| null | Storage 다운로드 URL |
| `status` | `draft` \| `published` | |
| `createdAt` / `updatedAt` | Timestamp | |
| `publishedAt` | Timestamp \| null | 최초 발행 시점만 기록 |

조회수는 v2로 유예 (Firestore 쓰기 비용 · 봇 카운팅 문제).

> **slug 유일성은 클라이언트 검사에 의존한다.** `firestore.rules`의 `validPost()`는 타입·길이만 보고 유일성은 검사하지 않으며, 검사와 쓰기 사이에 TOCTOU도 열려 있다. 작성자가 1명이라 실무 위험은 낮지만 서버 보장은 아니다. 보장이 필요해지면 문서 ID를 slug로 쓰거나 `slugs/{slug}` 유일성 문서를 두는 방식을 검토할 것.

## 설계 노트

### 왜 Next.js인가

글이 Firestore에 있으므로 빌드 시점에 전체 목록을 알 수 없다 → 순수 SSG 불가. ISR은 평소에는 미리 생성된 정적 HTML을 서빙하고 발행 시점에만 해당 경로를 재생성한다. DB 기반이면서 정적 사이트의 응답 속도를 유지하는 이 요구사항은 Vite/CSR 조합으로는 성립하지 않는다.

### 발행 → 재생성 경로

쓰기는 관리자 화면(클라이언트)에서 일어나므로 서버가 호출자를 신뢰할 수 없다.

```
관리자 화면 ──(1) Firestore 쓰기 (보안 규칙이 admin 클레임 검사)
     │
     └────────(2) POST /api/revalidate + Firebase ID 토큰
                    │
                    ├─ verifyIdToken(token, checkRevoked: true)
                    ├─ decoded.admin === true 확인
                    └─ revalidatePath('/', '/posts/[slug]', '/tags/*', '/rss.xml', '/sitemap.xml')
```

`AuthGuard`와 `hasAdminClaim()`은 UI 가드일 뿐이다. 실질 방어선은 **Firestore 보안 규칙**과 **이 라우트의 토큰 검증** 두 곳이고, 둘 다 `admin` 커스텀 클레임을 본다.

### 마크다운을 서버에서만 파싱하는 이유

공개 페이지의 코드 하이라이팅은 Shiki가 서버에서 HTML로 변환해 내려보낸다 → 클라이언트 JS 0KB. 에디터 미리보기만 `marked`를 클라이언트에서 쓰고, 관리자 라우트로 코드 분할되어 공개 페이지 번들에 들어가지 않는다.

빌드 실측:

| 라우트 | First Load JS |
|---|---|
| `/`, `/posts/[slug]`, `/tags/[tag]` | 106 kB |
| `/admin/write`, `/admin/edit/[id]` | 295 kB |

`marked`가 포함된 청크는 `app-build-manifest.json`상 관리자 두 라우트에서만 로드된다.

Shiki는 `defaultColor: false` + 2개 테마로 출력해 `--shiki-light`/`--shiki-dark` CSS 변수를 심는다. 테마 전환 시 재파싱이 없다.

### 색 규칙

색은 장식이 아니라 **길찾기**. 무채색이 화면의 90%를 담당하고 색은 분류에만 등장한다.

- **카테고리** — 색 있음 · 6개 고정 · 글 1개당 1개. 색 hex를 포함한 정의는 [src/lib/categories.ts](src/lib/categories.ts) **한 곳**에만 있다. 카테고리를 추가할 때 고칠 파일은 이것뿐이다.
  - 화면용 CSS 변수(`--cat-{slug}-{bg,fg}`)는 [category-css.ts](src/lib/category-css.ts)가 그 값에서 생성해 `layout.tsx`가 `<style>`로 주입한다
  - OG 이미지는 satori가 CSS 변수를 해석하지 못하므로 같은 객체를 TS에서 직접 읽는다 (`categoryLightColor()`)
  - 처음에는 `globals.css`에도 hex를 적어뒀지만, OG 이미지가 같은 값을 필요로 하면서 정의처가 둘이 됐다. 언젠가 어긋날 중복이라 CSS를 파생시키는 쪽으로 바꿨다
- **태그** — 색 없음(회색) · 자유롭게 여러 개
- 파스텔은 배경에만, 글자는 같은 계열의 진한 값 — 연한 배경 + 회색 글자는 대비 미달이고 A11y 95+ 목표와 직결된다
- 링크·버튼에 포인트 컬러를 쓰지 않는다 — 파란 링크는 '프론트엔드' 카테고리 색과 충돌해 클릭 가능 여부를 흐린다. 진한 무채색 + 밑줄/굵기로만 구분
- 카테고리 색을 Tailwind 팔레트에 넣지 않은 것도 같은 이유다. 유틸로 노출되면 본문·버튼에 쓰이기 시작한다

### v1에서 하지 않는 것

- **WYSIWYG 에디터** — 툴바·드래그·자동저장까지 가면 블로그가 아니라 에디터를 만드는 프로젝트가 된다
- 댓글 — 필요해지면 giscus 지연 로드
- 검색 — v2
- 다중 사용자 / 권한 등급
- 좌측 카테고리 트리 — 레퍼런스는 글 872개라서 성립하는 구조. 글 3편에 적용하면 빈 공간이 드러난다. v1은 상단 태그 필터 한 줄

## 배포

Vercel — GitHub 연동 자동 배포. 프로젝트 설정에 `.env.example`의 모든 키를 등록한다.

- `FIREBASE_ADMIN_PRIVATE_KEY`는 줄바꿈을 `\n` 리터럴로 넣는다 ([admin.ts](src/lib/firebase/admin.ts)에서 되돌린다)
- `NEXT_PUBLIC_SITE_URL`을 실제 도메인으로 — RSS·sitemap·OG의 절대경로에 쓰인다

## 남은 작업

- [x] 블로그 이름 → `CHOI's BLOG` ([src/lib/site.ts](src/lib/site.ts))
- [x] 한 줄 소개 · author 확정 ([src/lib/site.ts](src/lib/site.ts))
- [ ] 도메인 확정 후 `NEXT_PUBLIC_SITE_URL` — 커스텀 도메인 예정이라 보류. 지금은
      `VERCEL_PROJECT_PRODUCTION_URL` 폴백으로 동작한다. 도메인 연결 시점에 함께 등록해야
      canonical·RSS guid가 한 번만 바뀐다
- [x] Firebase 프로젝트 연결 — `.env.local` 작성, 보안 규칙 배포, 관리자 커스텀 클레임 부여 완료
      (규칙은 UID 하드코딩 대신 `request.auth.token.admin` 을 본다)
- [ ] 첫 글 3편 주제
- [ ] OG 이미지 — 실제 글로 렌더 확인. 구조는 완료(제목·카테고리 배지·태그·날짜)이나 Firestore 데이터로 검증한 적은 없다
- [ ] velog canonical 태그 정리 방침 확정 (자체 블로그를 메인, velog는 유입용)
- [ ] 마스코트 캐릭터 채택 여부 (기획서상 보류)
- [ ] 배포 후 실측 Lighthouse 점수 · LCP · CLS 기록

### 알려진 제약

- 본문 마크다운의 HTML을 sanitize하지 않는다. 작성자가 본인 1명이라 신뢰 경계 안이지만, 다중 사용자로 확장하면 반드시 추가해야 한다.
- `getAllTags()`는 발행글 전체를 읽어 집계한다. 글이 세 자리를 넘으면 별도 집계 문서로 옮길 것.
