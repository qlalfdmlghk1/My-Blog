# blog-ui-redesign — 진행 상황

## 📌 현재 작업

- 이슈: #4 (Feat)
- 브랜치: feature/4-blog-ui-redesign
- 단계: 구현 대부분 완료 · 프로덕션 빌드 검증과 실측 남음
- 마지막 업데이트: 2026-08-21 02:40

---

## [Issue #4] blog-ui-redesign

**Type**: Feat | **Jira**: 미사용 (1인 프로젝트) | **시작**: 2026-08-21

### ✅ 완료

- [x] 작업 환경 셋업 (/start 실행)
- [x] 홈 상단 사이트 소개 영역 추가 (`SiteIntro`)
- [x] 좌측 분류 사이드바 신설 (`SiteSidebar` · `ListShell`) — 홈·카테고리·태그 공유
- [x] `/categories/{slug}` 라우트 신설 — 6개 고정 프리렌더, 목록 밖 slug 404
- [x] sitemap · `/api/revalidate` 에 카테고리 경로 반영
- [x] 글 상세 목차(TOC) 추가 — `renderMarkdown()` 이 heading 앵커와 목차를 함께 반환
- [x] 타이포그래피 교체 — 본문·제목 티머니 둥근바람, 코드 D2Coding
- [x] 인용구 박스형 조정, 카드 위계 조정
- [x] 태그 입력의 `#` 중복 표시 버그 수정
- [x] `typecheck` · `lint` · `build` 통과 — 공개 페이지 First Load JS 106kB 유지(목차가 서버 컴포넌트라 증가 없음)

### 🚧 진행 중

- [ ] 배포 후 Lighthouse 실측 → 폰트 전략 확정 (본문 유지 vs 제목만)

### 📝 결정 로그

- [2026-08-21 02:40] /start 실행, 이슈 #4 · 브랜치 생성. 구현은 dev 에서 선행돼 있었고 이 브랜치로 옮겨 담음
- [2026-08-21] 좌측 분류 내비 도입 — 기획서의 "v1은 좌측 트리 없음" 결정을 번복했다.
  기존 근거는 태그(자유 증식) 기준이었고, 카테고리는 6개 고정이라 글 수와 무관하게 항목이
  6줄로 유지되므로 빈 공간 문제가 생기지 않는다. 글 0편 카테고리는 링크 없이 흐리게 처리.
- [2026-08-21] 카테고리 조회를 Firestore 쿼리가 아닌 메모리 필터로 구현. `where(status)+where(category)+orderBy(publishedAt)`
  는 복합 색인이 하나 더 필요한데, 글이 세 자리를 넘기 전까지는 목록 한 번 읽고 거르는 편이 싸다.
  기존 `getAllTags` 와 같은 방식으로 맞췄다.
- [2026-08-21] 목차를 서버 컴포넌트로 고정. 스크롤 추적 하이라이트는 클라이언트 JS 가 필요한데
  공개 페이지 JS 0KB 원칙을 깨는 값어치가 없다고 판단. 앵커 이동 + CSS `scroll-behavior` 로 충분.
- [2026-08-21] 폰트를 티머니 둥근바람으로 교체. woff2 838KB(본문 388 + 볼드 450)로 Pretendard 동적
  서브셋보다 무겁다. `preload` + `font-display: swap` 으로 렌더 차단은 막았고, 실측 후 부담되면
  제목에만 남기고 본문은 Pretendard 로 되돌린다. Pretendard 는 폴백으로 유지.

### 🐛 트러블슈팅

- **`next build` 가 반복 실패 (`Cannot find module for page`, `Could not find a production build`)**
  - 원인: `npm run dev` 가 같은 디렉터리에서 `.next` 를 계속 다시 쓰고 있었다. 코드 문제가 아니었다.
  - 해결: 개발 서버를 멈춘 뒤 `.next` 를 지우고 빌드. 두 명령을 동시에 돌리지 않는다.

### ⏭️ 남은 작업

- [ ] 배포 후 Lighthouse 실측 · 폰트 전략 확정
- [ ] 기존 테스트 글의 `#프론트엔드` 태그 정리 (에디터에서 재저장하면 `#` 이 벗겨짐)
- [ ] 사이드바 폭·폰트 크기감 사용자 확인 후 조정

---

### Commit — 2026-08-21 23:55

- Message: `Feat:#4 분류 사이드바·글 목차·타이포그래피 개편 적용`
- Issue: `#4`
- Jira: 미사용 (1인 프로젝트)

**변경 요약**

- `SiteIntro` · `SiteSidebar` · `ListShell` · `PostToc` 신규. 홈·카테고리·태그 세 화면이
  `ListShell` 한 곳에서 사이드바를 조립한다
- `/categories/{slug}` 라우트 신설 — 6개 고정 프리렌더(`dynamicParams = false`), 목록 밖 slug 404
- `renderMarkdown()` 반환이 `string` → `{ html, toc }`. heading 에 앵커 id 를 부여하며 목차를 함께 수집
- `revalidatePost()` 에 `categories` 인자 추가 — 카테고리를 옮겨 저장해도 양쪽 목록이 갱신된다
- 본문·제목 티머니 둥근바람, 코드 D2Coding 으로 교체. `--font-mono` 를 globals.css 로 옮김
- `max-w-shell` 60rem → 76rem (사이드바 공간), 인용구 박스형, 카드 제목 위계 상향
- 태그 입력에서 앞의 `#` 을 벗겨 저장 — `##프론트엔드` 중복 표시와 태그 분기 문제 해결
- `TagFilter` 삭제 (사이드바가 대체)

**결정 로그**

- 변경 21개 파일·660줄로 분리 기준을 넘지만 쪼개지 않았다. 사이드바·라우트·폰트가 맞물려 있어
  중간 커밋이 깨진 화면이 된다. 이슈 하나에 대응하는 한 덩어리로 둔다.
- `Refs #4` 사용. Lighthouse 실측과 폰트 전략 확정이 남아 이슈를 닫지 않는다.

**다음 작업**

- 배포 후 Lighthouse 실측 → 폰트 전략 확정 (본문 유지 vs 제목만)
- 기존 테스트 글의 `#프론트엔드` 태그 정리
- 사이드바 폭·폰트 크기감 사용자 확인 후 조정

---

### Commit — 2026-08-22 00:15

- Message: `Fix:#4 리뷰 지적 반영 — 랜드마크·목차 레이아웃·재생성 경로·앵커 id 수정`
- Issue: `#4`
- Jira: 미사용 (1인 프로젝트)

**변경 요약**

- `ListShell` 본문 칼럼을 `<main>` 으로 승격. 홈·카테고리·태그 세 화면에서 랜드마크가 통째로
  사라져 있었다. DOM 순서를 본문 먼저로 두고 사이드바는 `lg:order-1` 로 좌측 배치 —
  사이드바 h2 가 본문 h1 보다 앞서던 제목 순서 역전도 함께 해소
- 사이드바 카테고리 6개를 항상 링크로. `opacity-45` 는 대비가 2.9:1 이라 `text-ink-dim` 으로 교체
- `PostToc` 에 `hasToc()` 추가 — 목차 없는 글에서 빈 컬럼이 남아 본문이 왼쪽으로 치우치던 문제.
  xl 미만에서는 목차를 숨긴다 (그 폭에서는 본문 맨 아래에 나와 길잡이 구실을 못 했다)
- `/api/revalidate` 가 카테고리 6개를 전량 재생성. `revalidatePost` 의 `categories` 인자 제거
- `uniqueId` 를 Set 기반으로 교체 — 등장 횟수만 세면 "정리"×2 로 만든 `정리-2` 가
  별개 제목 "정리 2" 와 다시 충돌했다
- 카테고리 2회·태그 3회씩 하던 Firestore 중복 조회를 각 1회로. 죽은 `getPostsByTag` 제거
- `prefers-reduced-motion` 에서 `scroll-behavior: auto`
- 폰트 주석 정정, README 컴포넌트 트리 갱신

**결정 로그**

- **재생성은 카테고리 전량으로 간다.** 사이드바가 여섯 개의 글 수를 모든 목록 화면에 렌더하므로
  글이 속한 카테고리만 갱신하면 나머지 다섯 화면의 숫자가 최대 1시간 낡는다. 6개 고정이라
  전량 재생성이 상수 비용이다. 그 결과 `revalidatePost` 의 `categories` 인자가 쓸모없어져 제거했다.
- **빈 카테고리도 링크한다.** 페이지는 존재하고 빈 상태 문구도 있는데 링크를 끊으면
  sitemap 에는 실리면서 사이트 안에서 도달할 수 없고, 발행 직후 집계가 낡은 동안
  "글이 있는데 못 누르는" 상태가 된다.
- **태그 조회도 메모리 필터로 통일.** 목록만 Firestore 쿼리로 남기면 사이드바 집계(메모리)와
  출처가 갈려, 색인이 없을 때 "사이드바 3개 / 본문 0개" 모순이 생긴다.
  `firestore.indexes.json` 의 tags 복합 색인은 이제 쓰이지 않는다 (정리는 후속).
- 폰트 838KiB 수치는 리뷰 지적과 달리 정확했다 (리뷰어는 십진 KB 기준). 다만 웨이트가
  400·800 두 벌뿐이라 `font-bold`(700)가 800 으로 매칭되는 점은 사실이라 주석에 남겼다.

**다음 작업**

- 배포 후 Lighthouse 실측 → 폰트 전략 확정
- CDN 스타일시트 버전 고정·SRI (리뷰 escalate 항목 — 사용자 판단 필요)

---

### Commit — 2026-08-22 00:28

- Message: `Fix:#4 리뷰 수렴 2라운드 — 모바일 사이드바 위치·본문 폭 회귀 수정과 건너뛰기 링크 추가`
- Issue: `#4`
- Jira: 미사용 (1인 프로젝트)

**변경 요약**

- `ListShell` 주석을 실제 동작으로 정정 — 좁은 화면에서 사이드바는 글 목록 **아래**로 간다.
  1라운드에서 DOM 순서를 본문 먼저로 바꾸면서 배치가 뒤집혔는데 주석만 옛 설명이 남아 있었다
- 글 상세의 목차 있는 글이 xl 미만에서 본문 폭 76rem 까지 늘어나던 회귀 수정.
  `max-w-prose` 를 기본으로 두고 xl 에서만 그리드로 넓힌다
- 헤더에 "본문으로 건너뛰기" 링크 추가, `<main id="main">` 부여

**결정 로그**

- **모바일은 본문 먼저로 간다.** 사이드바를 위로 올리면 분류 6줄과 태그 무더기를 지나야
  첫 글이 나온다. 대신 DOM 순서(본문 먼저)가 시각 순서(사이드바 왼쪽)와 어긋나는
  넓은 화면의 포커스 순서 문제는 건너뛰기 링크로 덜었다.
- 본문 한 줄 길이는 목차 유무와 무관하게 44rem 으로 통일. 목차가 붙는 xl 에서만
  컨테이너를 넓혀 옆자리를 만든다.

**다음 작업**

- 배포 후 Lighthouse 실측 → 폰트 전략 확정
- CDN 스타일시트 버전 고정·SRI (사용자 판단 필요)
- **[별건·심각] 한글 slug 글 상세가 404** — `posts/[slug]/page.tsx` 가 `decodeURIComponent`
  없이 params 를 쓴다. dev·main 에도 있는 기존 결함이며 이 PR 의 회귀가 아니다.
  배포본 `/posts/첫-번째-글` 이 실제로 404 를 반환한다. 별도 이슈로 처리.

---

### Commit — 2026-08-22 00:45

- Message: `Fix:#4 리뷰 수렴 3라운드 — 건너뛰기 링크 앵커 대상 보강과 주석 정정`
- Issue: `#4`
- Jira: 미사용 (1인 프로젝트)

**변경 요약**

- `#main` 앵커 대상이 홈·카테고리·태그·글 상세에만 있어 `admin`·`login`·`not-found` 에서
  깨진 링크였다. 세 화면에 `id="main"` 부여
- `/admin/write`·`/admin/edit` 는 `<main>` 자체가 없었다. `admin/layout.tsx` 에 랜드마크를 두되
  `AuthGuard` **바깥**에 둔다 — 안쪽이면 인증 전(loading·denied)에 랜드마크가 사라진다.
  `admin/page.tsx` 의 자체 `<main>` 은 중첩을 피해 `<div>` 로 내렸다
- `SiteHeader` 주석 근거 정정 — 본문 건너뛰기 링크는 "사이드바에 닿기까지 글 목록을
  전부 지나야 하는" 문제를 풀지 못한다. 링크 자체는 독립적으로 유효하므로 남기고 근거만 고쳤다
- `PostToc` 주석에서 낡은 근거 제거 (xl 미만은 이제 그리드가 아니라 block)

**결정 로그**

- 3라운드 반영은 id 부여와 주석 정정뿐이라 4라운드 재리뷰 없이 종료했다.
  프리렌더 HTML 로 홈·로그인·관리자·404 에 `id="main"` 이 각 1개씩임을 실측 확인했다.

**다음 작업**

- 배포 후 Lighthouse 실측 → 폰트 전략 확정
- CDN 스타일시트 버전 고정·SRI (사용자 판단 필요)
- 넓은 화면의 시각/포커스 순서 불일치 — "분류로 건너뛰기" 링크 검토 (후속)

---

### Commit — 2026-08-22 01:56

- Message: `Fix:#4 한글 slug 글 상세·태그 페이지 404 수정`
- Issue: `#4`
- Jira: 미사용 (1인 프로젝트)

**변경 요약**

- 직전 항목의 "다음 작업"에 **[별건·심각]** 으로 남겨둔 한글 slug 404 를 해소했다.
  slug 에 한글을 허용하는데 라우트 params 는 퍼센트 인코딩된 채로 들어와
  (`/posts/첫-번째-글` → `%EC%B2%AB-...`) Firestore 저장값과 언제나 어긋났다
- `src/lib/slug.ts` 에 `decodeSlugParam()` 추가. 글 상세·OG 이미지·태그 페이지가 공통으로 쓴다
- 잘못된 이스케이프(`%`, `%zz`)는 `decodeURIComponent` 가 던지므로 원문을 그대로 반환한다 —
  어차피 매칭에 실패해 404 로 떨어질 값이고, 예외가 새어나가면 500 이 된다
- 태그 페이지의 기존 `decodeURIComponent` 직접 호출도 같은 함수로 교체 (같은 예외 위험)

**결정 로그**

- UI 개편 커밋에 묻히지 않도록 버그 수정만 독립 커밋으로 분리했다.
  dev·main 에도 있던 기존 결함이라 이력에서 바로 찾을 수 있어야 한다.

**다음 작업**

- 배포 후 Lighthouse 실측 → 폰트 전략 확정
- CDN 스타일시트 버전 고정·SRI (사용자 판단 필요)

---

### Commit — 2026-08-22 01:56

- Message: `Feat:#4 헤더 고정과 테마 토글 스위치 전환`
- Issue: `#4`
- Jira: 미사용 (1인 프로젝트)

**변경 요약**

- `SiteHeader` 를 sticky + 반투명 blur 로 전환하고 높이를 3.5rem 으로 고정
- 헤더가 콘텐츠 위에 겹치므로 딸려오는 세 자리를 함께 보정했다 —
  `SiteSidebar`·`PostToc` 의 sticky top(`top-8` → `top-20`, max-height `4rem` → `7rem`),
  `globals.css` 의 제목 `scroll-margin-top`(1.5rem → 5rem), `#main` scroll-margin 신설
- `ThemeToggle` 을 텍스트 버튼에서 `role="switch"` 스위치로 교체. 손잡이 아이콘(해/달) 추가
- 로고에 무채색 점 표식 추가 (색은 분류에만 쓰는 규칙 유지)

**결정 로그**

- 토글 손잡이 위치를 React state 가 아니라 `dark:` 변형으로만 그린다. layout 의 인라인
  스크립트가 첫 페인트 전에 `.dark` 를 붙이므로 CSS 로 그리면 하이드레이션 전에도 위치가 맞다.
  state 로 그리면 다크 모드에서 손잡이가 왼쪽에 한 번 찍혔다 튄다. state 는 `aria-checked` 전용
- 헤더 높이(3.5rem)가 사이드바 top·제목 scroll-margin 과 물려 있어 `SiteHeader` 주석에
  "높이를 바꾸면 그 세 곳도 함께 바꿔야 한다"를 명시했다
- `#main` 에 scroll-margin 을 준 이유: sticky 헤더 뒤로 도착지가 숨으면 "본문으로 건너뛰기"
  링크가 무의미해진다

**다음 작업**

- 배포 후 Lighthouse 실측 → 폰트 전략 확정

---

### Commit — 2026-08-22 01:57

- Message: `Feat:#4 관리자 화면 개편`
- Issue: `#4`
- Jira: 미사용 (1인 프로젝트)

**변경 요약**

- `AdminBar` 신설 — 관리자 컨텍스트 띠. 로그인 계정과 로그아웃만 담는다
- `admin/ui.tsx` 신설 — 관리자 화면 공통 표현 조각(label·hint·field·button 클래스)
- `AuthGuard` 를 거절 사유(`unconfigured`·`unauthenticated`·`forbidden`)별로 나눠
  사유마다 다른 출구를 제시한다. 기존엔 문자열 하나였다
- `PostEditor`·`admin/page`·`admin/edit`·`login` 재구성
- `formatDate` 를 `src/lib/date.ts` 로 공통화하고 `PostCard` 의 지역 구현을 제거

**결정 로그**

- `AdminBar` 와 랜드마크를 `AuthGuard` **바깥**에 둔다 — 안쪽이면 권한 없는 계정으로
  들어왔을 때 로그아웃 버튼이 함께 사라져 다른 계정으로 갈아탈 방법이 화면에서 없어진다
- `AdminBar` 에 브랜드·테마 토글을 다시 넣지 않는다. 위 헤더에 이미 있어 두 줄이 같은 걸
  두 번 말하게 된다. 여기서만 할 수 있는 말(누구로 로그인했는지, 어떻게 빠져나가는지)만 남긴다
- 관리자 화면도 공개 화면과 같은 토큰만 쓴다 — 관리자라고 색을 더 얹으면 "색은 분류에만"
  규칙이 관리자에서부터 무너진다
- 토큰 색에 Tailwind 투명도 수식(`bg-bg/80`)을 쓰지 않는다. 값이 `var(--bg)` 라
  `<alpha-value>` 자리가 없어 조용히 무시된다. 흐림이 필요하면 `opacity-*` 를 쓴다
- 커버 썸네일 주소를 `background-image: url("…")` 에 꽂기 전 http(s) 여부를 확인한다.
  업로드가 아니라 직접 붙여넣은 주소도 들어올 수 있어 따옴표·역슬래시가 선언을 빠져나갈 수 있다
- 이미 발행된 글의 "임시저장" 버튼은 라벨을 결과대로 쓴다 — 동작은 같아도 블로그에서 내려간다
- `formatDate` 의 timeZone 고정 이유: 공개 목록은 서버 프리렌더, 관리자 목록은 브라우저 렌더라
  런타임에 맡기면 같은 글의 날짜가 두 화면에서 하루 어긋나 보인다

**다음 작업**

- 배포 후 Lighthouse 실측 → 폰트 전략 확정
- CDN 스타일시트 버전 고정·SRI (사용자 판단 필요)

---

### Commit — 2026-08-22 02:46

- Message: `Feat:#4 태그를 카테고리 안 소주제로 접고 분류 도메인 언어 정리`
- Issue: `#4`
- Jira: 미사용 (1인 프로젝트)

**변경 요약**

- `.claude/domain/taxonomy.md` 신설 + `DOMAIN.md` 인덱스 등록 — 카테고리 · 태그 · 소주제 ·
  발행/임시의 정의와 금지 표현을 확정
- 사이드바에서 태그를 따로 나열하던 블록을 없애고 **각 카테고리 아래로 접어 넣었다**.
  카테고리당 6개까지 보이고 활성 카테고리는 전부 펼친다
- `getCategoryCounts` → `getCategoryTree` 로 교체. `CategoryCount` → `CategoryNode`(태그 포함).
  홈 · 카테고리 · 태그 세 화면에서 `getAllTags` 호출 제거 (`ListShell` 의 `tags` prop 삭제)
- `isCategoryWord()` 추가 — 카테고리 이름을 태그로 되붙인 값을 판정. `PostEditor` 가 경고 +
  일괄 제거 버튼 제공
- `TagChip` 활성 링을 `ring-inset` + 반투명으로 (바깥 링이라 활성 칩만 사방 1px 커지던 문제)

**결정 로그**

- **소주제를 필드로 만들지 않는다.** 저장 구조는 2단(카테고리 → 글) 그대로 두고
  "그 카테고리 글에 붙은 태그"를 집계해 3단처럼 보이게만 한다. 필드로 못 박으면 여러
  카테고리에 걸치는 기술(`Next.js` 가 프론트엔드에도 트러블슈팅에도)을 한 곳에만 둘 수 있고,
  글이 적은 지금은 빈 소주제가 줄줄이 노출된다
- **카테고리 이름 태그는 막지 않고 알리기만 한다.** 저장을 막으면 규칙을 모르는 상태에서
  글이 잠기고 정작 고쳐야 할 이유는 화면에 안 남는다
- `normalizeWord` 가 `#` 도 떼어낸다 — 에디터는 저장 전에 벗겨내지만, 그걸 거치지 않은
  기존 데이터(`#프론트엔드`)를 판정하려면 여기서 걸러야 한다
- 활성 태그는 상위 6개 밖에 있어도 끌어올린다. 안 그러면 태그 페이지에서 사이드바에
  현재 위치가 표시되지 않는다

**다음 작업**

- **기존 글의 `#프론트엔드` 태그 정리** — 에디터 경고는 신규 입력에만 걸리고 저장된 문서는
  그대로다. 이번 빌드도 `/tags/%23프론트엔드` 를 프리렌더한다
- 배포 후 Lighthouse 실측 → 폰트 전략 확정

---

### Commit — 2026-08-22 02:54

- Message: `Feat:#4 무채색 스케일을 중립 회색으로 재조정`
- Issue: `#4`
- Jira: 미사용 (1인 프로젝트)

**변경 요약**

- `globals.css` 의 무채색 토큰(bg · surface · text · text-dim · border)을 라이트 · 다크 모두
  따뜻한 회색(H≈40~50)에서 중립~약간 찬 회색(H≈220)으로 교체
- `--surface` 를 `#faf9f7` → `#f1f3f7` 로. 흰 배경과의 지각 명도차를 벌렸다

**결정 로그**

- 카테고리 6색 중 4색(블루 · 퍼플 · 틸 · 핑크)이 차가운 계열인데 배경이 누런기를 띠어
  화면 전체가 탁해 보였다. 뉴트럴에서 노란기를 빼면 그 색들이 제 색으로 산다.
  "색은 분류에만"이 성립하려면 바탕이 색을 방해하지 않아야 한다
- 일반 태그(TAG_COLOR)도 무채색이라 같은 방향으로 함께 맞춘다

**검증 (실측)**

- surface vs bg 지각 명도차 ΔL\* **4.20** (이전 2.05 — 사실상 구분되지 않던 값)
- 다크 surface vs bg ΔL\* 4.97
- 대비: 라이트 text/bg 17.76:1 · text-dim/bg 5.78:1 · text-dim/surface 5.21:1,
  다크 text/bg 15.16:1 · text-dim/surface 6.28:1 — **모든 조합 WCAG AA 4.5:1 통과**

**다음 작업**

- 기존 글의 `#프론트엔드` 태그 정리 (에디터 경고는 신규 입력에만 적용)
- 배포 후 Lighthouse 실측 → 폰트 전략 확정

---

### Commit — 2026-08-22 03:52

- Message: `Feat:#4 카테고리를 관리 화면에서 만들도록 Firestore 로 이전`
- Issue: `#4`
- Jira: 미사용 (1인 프로젝트)

**변경 요약**

- 카테고리 정본을 `src/lib/categories.ts` 상수 배열 → **Firestore `categories` 컬렉션**으로 이전.
  문서 ID 가 곧 slug
- `src/lib/palette.ts` 신설 — 색 슬롯 12종. 카테고리 문서에는 hex 가 아니라 슬롯 ID 만 저장
- `categories.server.ts`(Admin SDK 읽기) · `categories.client.ts`(관리 화면 CRUD) 분리
- `/admin/categories` 관리 화면 신설 (389줄)
- `firestore.rules` — `validCategory()` 추가, 글의 category 검증을 하드코딩 목록에서
  `exists(/categories/{slug})` 로 교체
- `scripts/seed-categories.mjs` + `npm run categories:seed`
- `safe-read.ts` 신설 — 프리렌더 중 Firestore 실패를 기본값으로 떨어뜨리되 로그는 남긴다
- CSS 변수를 `--cat-{slug}-*` → `--pal-{slot}-*` 로. `TAG_COLOR` 도 무채색 스케일과 같은
  색상각(H≈220)으로 맞춤
- README · `.claude/domain/taxonomy.md` 갱신

**결정 로그**

- **색을 자유 컬러피커가 아니라 슬롯 12개로 고정한다.** 자유 색상이면 한 색마다 라이트 배경 ·
  글자 · 다크 배경 · 글자 네 값을 사람이 맞춰야 하고 하나만 어긋나도 다크 모드에서 글자가 안 읽힌다.
  슬롯은 네 값이 이미 짝지어져 있어 무엇을 골라도 대비가 깨지지 않는다
- **CSS 변수를 카테고리별이 아니라 슬롯별로 깐다.** 슬롯 목록이 정적이라 빌드 시점에 확정되고,
  카테고리별이었다면 루트 레이아웃이 Firestore 조회에 엮여 모든 페이지가 그 조회를 기다렸다
- **보안 규칙에서 카테고리 목록을 빼고 `exists()` 로 확인한다.** 목록을 규칙에 박아두면
  카테고리를 하나 만들 때마다 규칙 재배포가 필요하고, 잊으면 저장이 조용히 막힌다
- **글이 남은 카테고리의 삭제는 규칙이 아니라 화면이 막는다.** 보안 규칙은 집계 쿼리를 할 수 없다.
  쓰기 권한이 이미 관리자로 한정돼 있어 이 경계는 "권한"이 아니라 "실수 방지"의 문제다
- **컬렉션이 비면 기본 6개로 떨어진다.** 배포 직후 빈 상태에서 사이드바와 카테고리 페이지가
  통째로 사라지면 사이트가 고장 난 것처럼 보인다
- 정렬을 `orderBy` 가 아니라 클라이언트에서 한다 — Firestore 는 해당 필드가 없는 문서를
  쿼리 결과에서 제외하므로, `order` 가 빠진 문서가 통째로 사라진다
- slug 는 만들 때 한 번 정하고 바꾸지 않는다 — 바꾸면 발행된 URL 과 글의 참조가 함께 끊긴다

**검증**

- `npm run typecheck` ✅ / `npm run lint` ✅ 0건 / `npm run build` ✅
- 공개 페이지 First Load JS **106 kB 유지** — `/admin/categories`(289 kB)는 관리자 라우트에만

**다음 작업**

- **배포 시 `npm run rules:deploy` 필수** — 규칙이 `exists(/categories/{slug})` 를 요구하므로
  구 규칙 상태에서는 새 카테고리로 글을 저장할 수 없다. `npm run categories:seed` 도 함께
- 기존 글의 `#프론트엔드` 태그 정리 (여전히 미처리 — `/tags/%23프론트엔드` 프리렌더됨)
- 배포 후 Lighthouse 실측 → 폰트 전략 확정

---

### Commit — 2026-08-22 04:35

- Message: `Feat:#4 카테고리 기본값 폴백 제거 — 빈 상태에서 시작하게`
- Issue: `#4`
- Jira: 미사용 (1인 프로젝트)

**변경 요약**

- `DEFAULT_CATEGORIES` 상수 삭제. `getCategories()` 가 컬렉션이 비면 **빈 배열**을 반환한다
  (직전 커밋 `92ebfab` 의 "비면 기본 6개로 떨어진다" 결정을 뒤집음)
- 시작용 예시 6개는 `scripts/seed-categories.mjs` 에만 남기고 스크립트를 **선택 사항**으로 격하
- 빈 상태 안내 신설 — 사이드바 "아직 카테고리가 없습니다", `/admin/categories` 첫 진입 안내 + 생성 버튼
- **고아 카테고리 감지** — 존재하지 않는 slug 를 참조하는 글을 `/admin/categories` 가 slug·글 수로 알린다
- 사이드바 "전체" 수를 카테고리 합계가 아니라 `total` prop(발행 글 전체 수)으로 받는다
- `/admin` 이 글 목록과 카테고리를 `Promise.all` 로 묶지 않는다 — 한쪽 실패가 다른 쪽을 버리지 않게

**결정 로그**

- **폴백을 두지 않는다.** 코드 어딘가에 기본 6개가 있으면 그게 폴백이 되어, 관리 화면에서
  전부 지워도 되살아난다. "처음부터 내가 짠다"가 불가능해지므로 비어 있으면 비운 대로 둔다
- 고아 카테고리를 화면에서 알리는 이유: 그 글은 사이드바 어디에도 안 잡히는데 목록 화면에는
  보여서 놓치기 쉽다
- "전체" 수를 합계로 구하지 않는 이유: 삭제된 카테고리를 참조하는 글은 어느 카테고리에도
  안 잡혀, 합계로 구하면 목록엔 글이 보이는데 "전체 0" 이 뜬다

**검증**

- `npm run typecheck` ✅ / `npm run lint` ✅ 0건 / `npm run build` ✅
- ⚠️ 빌드 산출물 변화 — `/categories/[slug]` **프리렌더 경로 0개**(이전 6개).
  폴백이 없어졌는데 `categories` 컬렉션이 비어 있어 생기는 의도된 결과다.
  카테고리를 만들고 재검증하면 다시 생성된다. 글·태그 경로는 그대로 프리렌더된다

**다음 작업**

- 배포 시 `npm run categories:seed`(선택) → `npm run rules:deploy` (이 순서 고정)
- 기존 글의 `#프론트엔드` 태그 정리
- 배포 후 Lighthouse 실측 → 폰트 전략 확정

---

### Commit — 2026-08-22 04:41

- Message: `Chore:#4 Storage 규칙 배포를 rules:deploy 에서 분리`
- Issue: `#4`
- Jira: 미사용 (1인 프로젝트)

**변경 요약**

- `rules:deploy` 에서 `storage` 를 빼고 `storage:deploy` 를 새로 둔다
- README 에 "규칙 배포는 코드 배포와 별개" 절 추가 — Vercel 이 아니라 Firebase 로 나가며,
  배포 즉시 로컬·프리뷰·프로덕션이 전부 새 규칙을 적용받는다

**결정 로그**

- 한 명령에 묶지 않는 이유: Storage 를 아직 켜지 않은 프로젝트에서 그 단계가 실패하면
  **Firestore 규칙까지 함께 못 올라간다.** 실패 하나가 무관한 배포를 막는 구조를 없앴다
- 순서 주의를 README 에 명시 — 새 규칙을 요구하는 코드를 올리기 전에 규칙을 먼저 배포해야
  하고, 뒤바뀌면 배포본이 `Missing or insufficient permissions.` 를 낸다

**다음 작업**

- PR #5 리뷰 수렴
- 카테고리 생성(시드 또는 관리 화면) → `npm run rules:deploy` → 필요 시 `npm run storage:deploy`

---

### Commit — 2026-08-22 05:24

- Message: `Fix:#4 리뷰 수렴 1라운드 — 사라진 Tailwind 유틸·팔레트 검증·재생성 경로·404 굳음`
- Issue: `#4`
- Jira: 미사용 (1인 프로젝트)

**변경 요약** (/review-converge 1라운드 자동 반영 6건)

- `SiteHeader` `bg-bg/80` → `bg-bg` — 색 토큰이 raw `var(--bg)` 라 `<alpha-value>` 자리가 없어
  유틸이 **생성되지 않았다**(빌드 CSS 에 `.bg-bg\/80` 없음). backdrop-blur 만 남아 sticky 헤더에
  배경이 통째로 없던 상태
- `TagChip` `ring-current/40` → `ring-current` — 같은 함정. `.ring-current` 규칙이 0건이라 활성 링이 사라졌다
- `normalizeCategory` 가 `isPaletteId()` 로 실제 검증 — 캐스트로 넘겨 죽은 가드가 됐고,
  CSS 변수 소비자(배지·사이드바)와 OG 소비자(`getPaletteSlot`)가 서로 다른 폴백을 내고 있었다
- `/api/revalidate` 가 경로를 원문·인코딩 두 표기로 무효화하고 중복 제거 — 태그만 인코딩하고
  글·카테고리는 원문이라 표기가 갈려 있었다
- `readCategories()` 신설 — 조회 실패와 "정말 0개"를 구분. 카테고리 상세는 `degraded` 면 404 대신
  throw 해서 ISR 이 직전 정적 페이지를 유지한다
- `PostEditor.validate()` 가 목록에 없는 카테고리를 막는다 — 통과시키면 규칙의 `categoryExists()` 에
  걸려 permissions 원문 에러만 뜬다

**결정 로그**

- CSS 두 건은 **빌드 산출물로 검증**했다. 수정 전 `.bg-bg{` 있음 / `.bg-bg\/80` 없음 / `ring-current` 0건,
  수정 후 `.bg-bg{` 1건 · `ring-current` 1건
- 재생성 경로는 어느 표기가 캐시 키인지 실측하지 않았다. 존재하지 않는 경로의 `revalidatePath` 는
  무동작이므로 두 표기를 모두 넣는 편이 안전하다
- `readCategories` 에서 `safeRead` 를 쓰지 않는다 — fallback 인자가 즉시 평가돼 실패 여부를 표시할 수 없다

**다음 작업**

- 리뷰 수렴 중단 — 진행 중인 Vercel Blob 마이그레이션과 작업 트리가 겹쳐 2라운드 미실행
- 남긴 항목(보안 Medium 3건·정책 판단 2건 등)은 PR 코멘트 참조

---

### Commit — 2026-08-22 14:10

- Message: `Chore:#4 이미지 업로드를 Firebase Storage 에서 Vercel Blob 으로 이전`
- Issue: `#4`
- Jira: 미사용 (1인 프로젝트)

**변경 요약**

- Firebase Storage 제거 — `storage.rules` 삭제, `firebase.json` 의 `storage` 항목,
  `storageBucket` 설정, `firebase/storage` import, `storage()` 헬퍼, `storage:deploy` 스크립트
- `@vercel/blob` 도입. `uploadImage()` 가 `upload()` 로 **브라우저 → 스토어 직행** 업로드를 한다
- `/api/blob-upload` 신설 — 파일이 아니라 **허가 토큰만** 내주는 라우트.
  Firebase ID 토큰을 `clientPayload` 로 받아 `verifyIdToken(_, true)` + `admin` 클레임 검증
- `rules:deploy` 에서 색인을 떼어 `indexes:deploy` 로 분리 — 색인 실패가 보안 규칙 릴리스를
  막지 않게. `uploading rules` 만 찍히고 `released rules` 가 없으면 아직 적용 전이다
- `dev:ipv4` 스크립트 + README 진단 문단 (`listen EFAULT: bad address ... :::3000`)
- README: 스택 표기, Storage 설치 단계 삭제와 번호 재조정(5~8), Vercel Blob 설정 절차,
  스크립트 표 보강, `coverImage` 설명

**결정 로그**

- 옮긴 이유는 **요금제**다 — Firebase Storage 는 2024년부터 Blaze(카드 등록)를 요구하고,
  Vercel Blob 은 Hobby 에서 카드 없이 무료 한도를 쓴다
- 파일을 서버로 받지 않는다. 서버리스 본문 상한(4.5MB)을 피하고, 함수(`iad1`)와
  스토어(`icn1`)의 리전 차이로 파일이 태평양을 두 번 건너는 것을 막는다
- 크기·형식 제한은 **서버(라우트)가 정한다.** 클라이언트에서 거르면 `upload()` 직접 호출로 우회된다
- `vercel env pull` 은 쓰지 않기로 했다 — `.env.local` 을 덮어써서 로컬에만 있는
  `FIREBASE_ADMIN_*`·`ADMIN_UID` 가 날아간다. 대시보드에서 토큰만 복사해 붙인다
- `dev` 기본값은 IPv4 로 고정하지 않았다 — 머신마다 다른 증상이고, 고정하면 같은
  네트워크의 다른 기기에서 접속할 수 없다

**남은 것**

- 글을 지워도 Blob 파일은 남는다 (고아 파일 정리 없음)
- 배포 전 Vercel 대시보드에서 Blob 스토어 생성 · Public · `icn1` · Connect to Project 필요

**다음 작업**

- 소분류 · 페이지네이션 커밋

---

### Commit — 2026-08-22 14:25

- Message: `Feat:#4 소분류 2단 분류와 목록 페이지네이션 추가`
- Issue: `#4`
- Jira: 미사용 (1인 프로젝트)

**변경 요약**

- 소분류 도입 — `categories/{cat}/subcategories/{sub}` 하위 컬렉션.
  `Subcategory`·`SubcategoryDraft` 타입, `normalizeSubcategory`/`sortSubcategories`,
  서버·클라이언트 CRUD, 관리 화면(`/admin/categories`)에 소분류 편집
- 글에 `subcategory` 필수 — `firestore.rules` 의 `validPost` 가 `subcategoryExists()` 로
  실재를 확인하고, `PostEditor` 가 같은 검사를 미리 한다
- 사이드바를 2단 트리로 — 카테고리(색) → 소분류(무채색). 태그는 트리에서 빼내
  아래 별도 구역으로. `looseCount`(분류 없음) 노출
- `CategoryNode.tags` → `subs`/`looseCount` 로 교체. `categoryWordSet` → `taxonomyWordSet`
- 페이지네이션 — `lib/pagination`, `Pagination` 컴포넌트,
  `/page/[page]`·`/categories/[slug]/page/[page]`·`/categories/[slug]/[sub]/page/[page]`·
  `/tags/[tag]/page/[page]` 라우트
- 목록 본문을 `components/lists/{Home,Category,Subcategory,Tag}List` 로 공용화 —
  기준 URL 라우트와 `/page/[page]` 가 같은 본문을 쓴다
- `readPublishedPosts()` 신설 — 조회 실패와 "정말 0개"를 구분해 404 굳음 방지
- `/api/revalidate` 가 `/page/N` 까지 무효화. sitemap 에 소분류 경로 추가
- 곁다리: 글 카드·관리 목록 행에 stretched link — 카드 전체가 과녁

**결정 로그**

- 소분류를 **하위 컬렉션**에 둔다. slug 유일성이 카테고리 안에서만 필요하고
  (`프론트엔드/react` ↔ `백엔드/react`), 규칙에서 `exists()` 한 번이
  "존재 + 소속"을 동시에 검사하며, 부모를 필드로 중복 저장하지 않아도 된다
- `collectionGroup` 질의는 중첩 `match` 로 안 통과한다 →
  `match /{path=**}/subcategories/{subSlug}` 를 **읽기 전용으로만** 따로 열었다
- 페이지 이동은 `?page=2` 가 아니라 `/page/2`. Server Component 가 `searchParams` 를
  읽으면 라우트가 동적 렌더링으로 바뀌어 목록의 ISR 정적 생성이 사라진다
- `generateStaticParams` 는 2페이지부터만 낸다. `parsePageParam` 은 `01`·`2.0`·`+2` 를
  거른다 — 같은 페이지가 여러 주소로 열리면 검색엔진에 중복 문서로 잡힌다
- 소분류 목록은 재생성 때 **전량** 갱신한다. 글의 소분류가 바뀌면 떠난 쪽·도착한 쪽이
  동시에 낡는데 어느 쪽인지 요청만으로는 알 수 없다
- 태그는 계층 밖의 가로축으로 확정 — 소분류가 트리의 두 번째 단을 가져갔다

**남은 것 / 확인 필요**

- **`npm run rules:deploy` 를 코드 배포보다 먼저** 해야 한다. 소분류 필수화가 규칙에
  들어 있어 순서가 뒤바뀌면 배포본이 `Missing or insufficient permissions.` 를 낸다
- 기존 글에는 `subcategory` 가 없다 → 편집기에서 소분류를 골라 다시 저장해야 한다
  (사이드바에는 "분류 없음"으로 잡힌다)
- README 의 글 문서 스키마 표에 `subcategory` 행이 없고, 새 라우트 목록도 반영 전이다
- 프로덕션 빌드 · Lighthouse 실측 미실행

**다음 작업**

- PR #5 업데이트 → `/review-converge` 2라운드

---

### Commit — 2026-08-22 15:40

- Message: `Fix:#4 리뷰 수렴 2라운드 — 재생성 누락·고아 소분류·업로드 오류 문구·접근성 회귀`
- Issue: `#4`
- Jira: 미사용 (1인 프로젝트)

**변경 요약** (/review-converge 라운드 1 자동 반영 8건 · Blocker 0건)

- `/api/revalidate` `pushList` 가 한 칸 더 돈다 — 변경 **이후** 글 수로 페이지를 세던 탓에
  글을 지워 페이지가 줄면 사라진 마지막 페이지가 루프 밖으로 빠졌다. 그 경로가 정적 캐시에
  남아 삭제된 글을 재검증 주기(1시간) 동안 계속 200 으로 서빙했다
- 카테고리 삭제에 소분류 가드 — Firestore 는 문서를 지워도 하위 컬렉션을 지우지 않는다.
  소분류를 남긴 채 지우면 고아가 `collectionGroup` 조회에 계속 잡혀 **sitemap 과 프리렌더가
  404 로만 열리는 주소를 광고**하고, 관리 화면은 부모 카드 안에서만 그리므로 지울 수도 없었다
- 사이드바 "분류 없음"이 `subs.length > 0` 안에 중첩돼 있어, **소분류가 0개인 카테고리에서는
  숨었다** — 마이그레이션 대상 글이 가장 많은 상태에서 정확히 안 보였다
- `uploadImage()` 가 실패를 한국어로 되짚는다. `@vercel/blob` 이 non-2xx 응답 **본문을 읽지
  않고** 고정 문구 `Failed to  retrieve the client token` 만 던져, 라우트가 준비한
  자격증명 누락·권한 부족·로그인 만료 구분이 화면에 하나도 도달하지 못했다
- `safeFileName()` 이 확장자를 먼저 뗀다 — `사진.png` → `.png` 가 빈 문자열이 아니라서
  기본값 폴백이 발동하지 않고 경로가 `posts/.png` 가 됐다(한글 파일명 = 가장 흔한 경우)
- `TagChip` 에 `aria-current` 복원 — 삭제된 `TagRow` 에 있던 것이 이번 개편에서 빠져,
  스크린리더가 사이드바에서 현재 태그를 알 수 없었다(같은 커밋의 `Pagination` 은 정상)
- `SubcategoryList` 상위 분류 링크를 `next/link` 로 + `encodeURIComponent` — 혼자 `<a>` 라
  전체 리로드가 일어났고 같은 파일 안에서 인코딩 표기가 갈려 있었다
- 페이지 라우트 canonical 을 `encodeURIComponent` 로 통일 — `Pagination` 이 만드는 주소와
  갈려 한글 slug 에서 두 문자열이 달랐다. `ListShell` 주석의 "세 화면"도 넷으로 정정

**결정 로그**

- 4 페르소나 모두 **Blocker 0건**. 자동 반영은 여러 페르소나가 독립적으로 같은 결함을 짚었고
  수정이 국소적인 것만으로 한정했다
- **자동 반영하지 않은 것**은 아래 "남긴 항목" 참조 — 보안 Medium 2건, 인증 경로 변경,
  읽기 계층 시그니처 변경, 정책 판단 5건. 전부 사람 확인 대상

**남긴 항목 (사람 확인 필요)**

- 🔴 **`clientPayload` 로 보낸 Firebase ID 토큰이 Blob 웹훅 본문으로 되돌아온다** —
  `@vercel/blob` 이 `tokenPayload` 미지정 시 `clientPayload` 를 승계한다. 빈 `onUploadCompleted`
  를 지우면 `callbackUrl` 이 undefined 가 되어 함께 사라진다. 인증 경로 변경이라 미반영
- 🔴 **소분류 조회 실패가 `degraded` 로 전달되지 않는다** — `getSubcategories()` 가 `[]` 로
  삼켜, `/categories/{cat}/{sub}` 가 일시 장애에 404 로 굳는다(`readCategories`/`readPublishedPosts`
  가 막으려던 바로 그 상황). `readSubcategories` 신설 + `getCategoryTree` 시그니처 변경 필요
- **`degraded` 인데 1페이지는 항상 통과한다** — `countPages(0) === 1` 이라 홈이 조회 실패에도
  "아직 발행된 글이 없습니다"를 캐시한다. 다만 `degraded` 조기 throw 는 자격증명 없는 환경의
  **빌드를 통째로 깨뜨려** `safe-read.ts` 정책과 충돌한다 — 배포 파이프라인 정책 판단 필요
- **목록 화면 하나가 Firestore 를 2~5회 읽는다** — `React.cache()` 미사용. 아키텍트는
  `known` 인자를 늘리는 대신 읽기 함수를 `cache()` 로 감싸라고 제안(호출부 무수정)
- **`revalidateTaxonomy()` 가 `/posts/*` 를 빠뜨린다** — 카테고리 이름·색을 고쳐도 글 상세
  배지가 1시간 낡는다. 전량 재생성 비용과 얽혀 정책 판단
- **글 slug 을 바꾸면 옛 `/posts/{old}` 가 1시간 남는다** — 태그는 합집합을 보내면서 slug 은
  새 값만 보낸다. 요청 형태를 `slugs[]` 로 넓힐지 판단 필요
- **재귀 match `/{path=**}/subcategories/{subSlug}` 가 공개 읽기로 열려 있다** — 현재 추가
  노출은 없으나, 다른 경로에 동명 컬렉션이 생기면 규칙 수정 없이 공개된다. 클라이언트
  collectionGroup 호출처가 관리 화면 둘뿐이라 `isAdmin()` 으로 좁힐 수 있다(규칙 재배포 필요)
- **`dynamicParams = true` 목록 경로가 무인증 Firestore 읽기 증폭에 열려 있다** —
  레이트 리밋 없음. 라우팅·캐시 정책 판단
- **삭제된 `storage.rules` 의 배포본이 Firebase 에 그대로 살아 있다** — 정본이 저장소에서
  사라져 감사 불가. 콘솔에서 닫을지 결정 필요
- **소분류 slug `page` 예약어 가드 없음** — 주석은 막아야 한다고 적었으나 구현 없음.
  QA 는 세그먼트 수가 달라 실제로는 가려지지 않는다고 분석. 실측 후 주석/가드 결정
- 마크다운 링크 스킴 검사(`javascript:`)·CSP 부재 — self-XSS 수준, 이번 변경 범위 밖
- stretched link 로 카드 텍스트 드래그 선택 불가 — UX 트레이드오프 판단
- 소분류가 없는 카테고리에서 **임시저장조차 막혀** 작성 중인 글을 남길 수 없다 — 탈출구 설계
- 죽은 설정 둘: `next.config.ts` 의 Storage `remotePatterns`, `firestore.indexes.json` 의 tags 색인

**다음 작업**

- 남긴 항목 중 🔴 두 건 우선 판단

---

### Commit — 2026-08-23 09:20

- Message: `Fix:#4 리뷰 수렴 3라운드 — 업로드 오류 번역 보강과 canonical 인코딩 되돌림`
- Issue: `#4`
- Jira: 미사용 (1인 프로젝트)

**변경 요약** (/review-converge 라운드 2 — 직전 라운드 **자기 수정분**에 대한 지적 2건)

- `uploadErrorMessage()` 가 네 갈래를 갈라 번역한다. 직전 라운드에서 토큰 발급 실패 하나만
  잡았는데, **실제로 가장 자주 걸리는 크기 초과·형식 불허가 영문 원문 그대로** 나가고 있었다
  (그 둘은 토큰이 아니라 업로드 단계에서 와 응답 본문이 살아 있다). 네트워크 실패도 추가
- 토큰 갈래 문구에서 **`BLOB_READ_WRITE_TOKEN` 을 뺐다** — 관리자가 화면에서 고칠 수 없는
  서버 변수인 데다, 권한 없는 로그인 사용자에게 서버 구성을 알려주는 답이 된다.
  라우트의 실패 넷은 라이브러리가 한 문구로 뭉개 **클라이언트에서 갈라낼 수단이 없으므로**,
  스스로 확인 가능한 것(로그인 만료 · 권한 없음)만 안내하도록 문구를 낮췄다
- 크기 상한 숫자는 적지 않는다 — 정본은 라우트의 `MAX_BYTES`·`ALLOWED_TYPES` 다.
  옮겨 적으면 두 곳이 갈린다
- canonical 의 `encodeURIComponent` 를 **되돌렸다.** `layout.tsx` 에 `metadataBase` 가 있어
  Next 가 canonical 을 절대 URL 로 해석하므로 두 표기의 출력이 같다 — 즉 **고쳐진 동작이 없고**,
  나머지 5곳(카테고리·소분류 1페이지, 태그 2곳, sitemap)은 그대로라 오히려 표기만 갈렸다.
  되돌리면 최소한 일관하다

**결정 로그**

- 라운드 2 는 **Blocker 0 · 회귀 0**. 라운드 1 반영 8건은 추적으로 동작 확인됐다 —
  `safeFileName` 22케이스(`사진.png`→`image.png`, `../../x.png`→`x.png` 경로 탈출 불가),
  `subsOf` TDZ 없음, `TagChip` `aria-current` 는 `active` 를 넘기는 사이드바에서만 붙음
- **`pushList` 의 `+1` 은 그대로 둔다.** 아키텍트 실측 — 경로 수가 66→123(+86%)로 늘지만
  늘어난 건 전부 존재하지 않는 `/page/마지막+1` 이고, 없는 경로의 `revalidatePath` 는
  무동작인 데다 아무도 요청하지 않아 뒤따르는 재검증 렌더도 없다. 반면 막으려는 결함은
  단건 쓰기에서 정확히 1페이지 축소라 `+1` 이 완전히 덮는다
- **`분류 없음` 표시 조건은 손대지 않았다 — 두 라운드가 반대 결론을 냈다.**
  라운드 1(QA): 소분류 0개일 때 숨으면 마이그레이션 대상 글을 어느 화면도 안 알려준다 →
  열어야 한다. 라운드 2(아키텍트): 소분류 0개면 `looseCount === count` 가 항상 참이라
  `개발 7 / 분류 없음 7` 로 같은 숫자를 반복하고 링크도 아니다 → `looseCount !== count`
  일 때만 그려야 한다. **표시 판단이라 사람이 고를 항목으로 남긴다**

**남긴 항목 (라운드 1 목록에 아래 추가)**

- `분류 없음` 표시 조건 — 위 두 라운드의 상반된 결론 중 택일 필요
- `deleteCategory()` 안으로 소분류 가드 이전 + **이미 생긴 고아 소분류 정리 UI** —
  가드는 버튼에만 있어 연산 자체는 무방비이고, 기존 고아는 여전히 화면에 안 뜨는데
  sitemap·프리렌더에는 실린다. 데이터는 이미 손에 있고(`listSubcategories`) 렌더 경로만 없다
- canonical·sitemap·사이드바의 세그먼트 인코딩 규칙 통일 — `categoryHref`/`subHref`/`tagHref`
  헬퍼로 모으자는 제안(같은 표현식이 6번 복붙돼 있다). 동작에는 영향 없음
- 업로드 실패 배너가 폼 최상단이라 본문 하단에서 붙여넣기 실패 시 화면 밖 (`role="alert"` 는 있음)
- `new Error(msg, { cause: error })` 로 원본 스택 보존 — 디버깅 손해

**다음 작업**

- 남긴 항목 중 🔴 두 건(`clientPayload` 토큰 유출 · 소분류 `degraded`) 우선 판단

---

### Commit — 2026-08-23 11:05

- Message: `Fix:#4 업로드 토큰에 Firebase ID 토큰이 실려 나가는 경로 차단`
- Issue: `#4`
- Jira: 미사용 (1인 프로젝트)

**변경 요약** (상용 반영 전 선행 수정 — 수렴 때 남긴 보안 Medium 1건)

- `/api/blob-upload` 에서 비어 있던 `onUploadCompleted` 를 제거. 그 훅이 있으면 라이브러리가
  `callbackUrl` 을 만들고, 그 순간 `tokenPayload`(= 승계된 `clientPayload` = **admin 클레임이
  든 Firebase ID 토큰**)가 발급 토큰에 실려 Blob 을 거쳐 업로드 완료 웹훅 본문으로 돌아온다
- `onBeforeGenerateToken` 반환값에 `tokenPayload: ''` 명시 — 콜백을 되살리는 사람이 같은
  함정을 밟지 않게 하는 방어선. `null` 은 `??` 에 걸려 되살아나므로 오답

**결정 로그**

- 훅을 **지우는 쪽**을 골랐다. 업로드 결과를 기록할 일이 없어 본문이 no-op 이었고,
  지우면 토큰 페이로드와 공개 콜백 경로가 **함께** 사라진다
- **로컬에서는 재현되지 않는다** — `getCallbackUrl` 이 `VERCEL=1` 에서만 해석되므로
  배포본에서만 생기는 노출이었다. 상용 반영 전에 닫는 게 맞다고 판단
- `clientPayload` 대신 `headers: { Authorization }` 로 옮기는 변경은 **하지 않았다** —
  인증 경로 수정이라 별도 판단이 필요하다. 유출 경로만 닫았다

**남긴 항목** (변동 없음 — 소분류 `degraded` 전파 등은 그대로)

**다음 작업**

- `dev` 머지 → `dev → main` 상용 반영 PR
