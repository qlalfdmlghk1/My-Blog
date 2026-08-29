# project-wide-refactor — 진행 상황

## 📌 현재 작업

- 이슈: #9 (Refactor)
- 브랜치: refactor/9-project-wide-refactor
- 단계: In Scope 3건 구현 완료 — 수동 확인 대기
- 마지막 업데이트: 2026-08-27

---

## [Issue #9] project-wide-refactor

**Type**: Refactor | **Jira**: 미사용 | **시작**: 2026-08-27

### ✅ 완료

- [x] 작업 환경 셋업 (/start 실행)
- [x] 용어 사전 분리 — 별도 Firestore 컬렉션 + `/glossary` 페이지 + 본문 자동 링크
- [x] 글보기 드래그 형광펜 UI
- [x] 글작성 slug 영문화 (로마자 변환)

### 🚧 진행 중

- [ ] 관리자 화면에서 실제 용어 등록 후 본문 자동 링크 수동 확인

### 📝 결정 로그

- [2026-08-27] /start 실행, 작업 환경 셋업 완료 (Jira 미사용 · 기획 검수 게이트는 사용자 요청으로 생략)
- [2026-08-27] **용어 사전 저장 방식 = Firestore `glossary` 컬렉션 + 관리자 CRUD**.
  리포지토리 마크다운 파일 대신 택한 이유: "웹에서 직접 작성"이라는 프로젝트 목표와 같은 축이고,
  용어를 하나 늘릴 때마다 커밋·배포를 거치지 않는다. 카테고리와 같은 규약(문서 ID = slug)을 쓴다.
- [2026-08-27] **본문 연결 = 자동 링크**. 마크다운 렌더 시점에 등록된 표기를 찾아
  `/glossary#{slug}` 로 잇는다. 글 한 편당 **첫 등장 한 번만** — 스무 번 걸면 본문이 링크 밭이 된다.
  제목(h2/h3)과 기존 링크 안에서는 걸지 않는다 (중첩 `<a>` 는 유효하지 않은 HTML).
- [2026-08-27] **한글 낱말 경계 문제**: `\b` 가 한글에 없어서 앞뒤가 글자면 무조건 막으면
  `상태를`이 안 걸리고, 통과시키면 `상태관리`의 앞 두 글자에 링크가 걸린다.
  → 앞은 글자/숫자 금지, 뒤는 **조사 허용 목록**(을/를/이/가/으로/에서/…)으로 해결.
- [2026-08-27] **slug 영문화 = 번역이 아니라 로마자 표기**(RR). 번역 API 를 물리면 키·비용·실패
  폴백이 생기고, 같은 제목이 호출마다 다른 주소가 될 수 있다. 로마자는 외부 의존 없이 항상
  같은 결과를 낸다. 진짜 영어 낱말이 필요하면 관리자가 slug 입력란에서 직접 고친다.
- [2026-08-27] **`slugify` 는 그대로 두고 `toAsciiSlug` 를 새로 뒀다.** `slugify` 는 본문 제목
  앵커(`markdown.ts`)도 쓰는데, 그것까지 로마자로 바꾸면 이미 공유된 `#설치-방법` 링크가
  한꺼번에 죽는다. 기존 글의 slug 도 Firestore 저장값이라 영향 없다 — **새 글부터** 적용된다.
- [2026-08-27] **용어를 고치면 발행된 글 전체를 재생성**한다(`revalidateGlossary`).
  용어 링크는 저장된 본문이 아니라 렌더 시점에 붙으므로, 용어 하나를 추가하면 그 낱말이 든
  모든 글의 HTML 이 낡는다. 어느 글인지는 본문을 전부 훑어야 알 수 있어 전량 무효화가 더 싸다.
- [2026-08-27] **드래그 선택색은 무채색 원칙의 의도된 예외**. 선택 영역은 '분류'가 아니라
  '지금 짚은 곳'이라 카테고리 색과 경쟁하지 않고, 무채색이면 브라우저 기본 파랑과 구분되지
  않는다. 팔레트 슬롯(`--pal-*`)에서 빌리지 않고 `--select-*` 토큰을 따로 뒀다 —
  빌려 쓰면 amber 슬롯을 조정할 때 선택 배경이 같이 바뀐다.

### 🔎 현재 Firestore 상태 (2026-08-27 확인)

| 컬렉션 | 내용 |
| --- | --- |
| `categories` | `dictionary`(용어 사전 — 빈 껍데기) · `front-end`(프론트엔드, 소분류 nextjs·react) · `프로젝트` |
| `posts` | 1편 — `front-end/nextjs` · slug `1` (발행) |
| `glossary` | 0개 — 이번에 신설, 아직 비어 있음 |

- 용어 사전은 **카테고리로 자리만 잡아뒀고 글이 한 편도 없었다.** 이번 변경으로 별도 컬렉션이
  생겼으므로 그 카테고리는 역할이 사라졌다 — 옮길 데이터가 없어 정리만 남는다.
- `프로젝트` 카테고리는 **slug 이 한글**이라 주소가 `/categories/%ED%94%84...` 로 나간다.
  이번에는 글 slug 에만 로마자를 적용했고 카테고리 slug 생성은 그대로 `slugify` 를 쓴다 —
  바꾸면 이미 발행된 카테고리 URL 이 깨지므로 이번 범위에서 건드리지 않았다. 별도 과제.

### 🐛 트러블슈팅

- **템플릿 리터럴 안의 `\p{Letter}`**: 정규식을 `new RegExp(\`...\`)` 로 조립하면서 `\p` 를
  한 번만 적었더니, 템플릿 리터럴이 알 수 없는 이스케이프를 `p` 로 접어 `[p{Letter}]` 가 됐다.
  타입 검사도 lint 도 잡지 못한다(문법상 유효한 문자 클래스라서). `\\p` 로 적어야 한다.

### ⏭️ 남은 작업

- [ ] `/admin/glossary` 에서 용어를 등록하고 글 본문에서 링크가 붙는지 확인
- [ ] `npm run rules:deploy` — `glossary` 컬렉션 보안 규칙이 아직 배포 전이라,
      배포 전에는 관리 화면에서 저장이 `permission-denied` 로 막힌다
- [ ] **`dictionary` 카테고리 삭제** — `/admin/categories` 에서 "용어 사전" 카드의 삭제 버튼.
      Firestore 를 실제로 확인한 결과 **글 0편 · 소분류 0개인 빈 껍데기**였다(옮길 내용 없음).
      코드·시드 스크립트 어디에도 참조가 없어 지워도 걸리는 곳이 없다.
      관리 화면으로 지우면 `revalidateTaxonomy()` 가 함께 돌아 사이드바·sitemap 이 바로 갱신된다
      (스크립트로 직접 지우면 그 재생성이 빠져, 재검증 주기 동안 사라진 카테고리가 화면에 남는다).

---

## 📁 이번 변경 파일

**신규**

- `src/lib/romanize.ts` — 한글 → 로마자(RR). slug 과 용어 사전 자모 묶음이 함께 쓴다
- `src/types/glossary.ts` · `src/lib/glossary.ts` — 용어 타입 · 정규화 · 정렬 · **자동 링크 판정**
- `src/lib/glossary.server.ts` · `src/lib/glossary.client.ts` — 읽기(서버) · CRUD(관리 화면)
- `src/app/glossary/page.tsx` — 공개 사전 (자모 바로가기 + 앵커)
- `src/app/admin/glossary/page.tsx` — 관리자 CRUD

**수정**

- `src/lib/slug.ts` — `toAsciiSlug` 추가 (`slugify` 는 앵커용으로 유지)
- `src/components/admin/PostEditor.tsx` — 제목 → slug 생성이 `toAsciiSlug` 를 쓴다
- `src/lib/markdown.ts` — `renderMarkdown(markdown, glossary)` · `text` 렌더러에서 자동 링크
- `src/app/posts/[slug]/page.tsx` — 용어 표기를 읽어 렌더러에 넘김
- `src/app/globals.css` — `--select-*` 토큰 · `::selection` · `.md a.term` 점선 밑줄
- `src/app/api/revalidate/route.ts` · `src/lib/posts.client.ts` — `scope: 'glossary'` 재생성
- `firestore.rules` — `glossary` 컬렉션 공개 읽기 · 관리자 쓰기 + 필드 검증
- `src/components/SiteHeader.tsx` · `src/app/admin/page.tsx` · `src/app/sitemap.ts` — 진입 경로

---

### Commit — 2026-08-27 16:10

- Message: `Feat:#9 용어 사전을 독립 페이지로 분리하고 본문에서 자동 링크`
- Issue: `#9`
- Jira: 미사용 (1인 프로젝트)

**변경 요약**

- `glossary` 컬렉션 신설 — `types/glossary.ts`, 순수 로직(`lib/glossary.ts`),
  서버 읽기(`glossary.server.ts`), 관리자 CRUD(`glossary.client.ts`)
- 공개 사전 페이지 `/glossary` + 관리 화면 `/admin/glossary`
- `renderMarkdown(markdown, glossary)` — 본문 `text` 토큰에서만 용어를 찾아 링크.
  제목·링크 안은 `suppressGlossary` 로 끄고, 한 글에서 같은 용어는 첫 등장만
- `firestore.rules` — 공개 읽기 · 관리자 쓰기 + `validGlossaryTerm` 필드 검증
- `scope: 'glossary'` 재생성 — 사전이 바뀌면 발행된 글 전량 무효화
- 진입 경로: 헤더 "용어", `/admin` 의 "용어 사전" 버튼, sitemap

**결정 로그**

- **링크를 저장된 본문에 박지 않는다.** 렌더 시점에 붙인다 — 박아 넣으면 용어 하나
  고칠 때마다 글 본문을 다시 써야 하고, 지운 용어의 링크가 화석으로 남는다
- `text` 렌더러에서만 건다. marked 가 `text` 토큰을 **이스케이프 전 원문**으로 넘기므로
  탐색도 원문 위에서 해야 `&amp;` 낀 표기를 놓치지 않는다. 인라인 코드는 `codespan` 이
  따로 받아 애초에 오지 않는다 — 코드 속 낱말에 링크가 걸리는 사고가 구조적으로 막힌다
- 제목·링크 안은 끈다. 중첩 `<a>` 는 무효이고, 제목에 걸면 목차와 본문 모양이 갈린다
- **사전 변경 = 발행 글 전량 재생성.** 어느 글에 그 낱말이 있는지는 본문을 다 훑어야
  알 수 있어, 수십 편 규모에서는 전량이 탐색보다 싸다. 수백 편이 되면 역색인으로 전환
- `aliases` 를 10개로 묶었다 — 열어두면 표기 수천 개짜리 문서 하나로 글 렌더링마다
  거대한 정규식이 만들어진다. 화면이 아니라 **규칙**에서 막는다
- 점선 밑줄 — 실선+굵게는 "나간다"로 읽힌다. 점선은 사전의 관용 표시라 "참조"로 읽힌다

**다음 작업**

- 형광펜 선택 UI · slug 영문화 커밋
