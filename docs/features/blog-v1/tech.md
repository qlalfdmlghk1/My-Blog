# blog-v1 — tech 기록

## [2026-08-21] 초기 세팅·배포 상태 점검과 결정 사항 (#1)

**발행 파이프라인 프로덕션 검증 (완료)**

브라우저 로그인 없이 관리자 커스텀 토큰 → ID 토큰 교환으로 보안 규칙 평가를 실제로 받아 검증했다.
Admin SDK 직접 쓰기는 규칙을 우회하므로 규칙 검증이 되지 않는다는 점 때문에 이 방식을 택했다.

| 검증 항목 | 결과 |
| --- | --- |
| 비로그인 Firestore 쓰기 | 403 차단 |
| 관리자 + 잘못된 `category` | 403 차단 → `validPost` 동작 = 규칙 배포 확인 |
| 관리자 정상 쓰기 | 200 |
| `/api/revalidate` (관리자 토큰) | 200 — `/`·`/rss.xml`·`/sitemap.xml`·`/posts/{slug}`·`/tags/{tag}` |
| `/api/revalidate` (비인증) | 401 차단 |
| 정적 페이지 반영 | 홈 목록·상세 200·RSS 1건·sitemap 3건 |
| 삭제 → 재검증 | 200, posts 0건, 홈 빈 상태 복귀 |

"인증 → 작성 → 저장 → 정적 페이지 재생성" 파이프라인이 프로덕션에서 실제로 도는 것을 확인했다.
검증용 임시 글과 스크립트는 모두 제거했다.

**`rules:deploy` 실행 불가 수정**

보안 규칙은 이미 배포돼 있었지만 `npm run rules:deploy` 는 실행이 안 되는 상태였다 —
`.firebaserc` 가 없어 프로젝트 지정이 안 되고 firebase CLI 도 미설치였다.
`.firebaserc` 를 추가하고 `rules:deploy` 를 `npx -y firebase-tools` 로 바꿔 전역 설치 없이 돌아가게 했다.
최초 1회 `npx firebase-tools login` 은 브라우저 OAuth 라 남아 있다.

**결정 — `NEXT_PUBLIC_SITE_URL` 등록 보류**

커스텀 도메인을 붙일 예정이므로 지금 vercel.app 주소로 고정하지 않는다.
지금 고정하면 도메인 연결 시 canonical·RSS guid 가 두 번 바뀐다.
현재는 `VERCEL_PROJECT_PRODUCTION_URL` 폴백으로 정상 동작한다.
글이 0건인 지금이 주소를 바꿔도 RSS 구독자에게 재발송이 발생하지 않는 마지막 타이밍이다.

**결정 — 사이트 메타 문구 확정**

`SITE.description` 을 "성능 · 아키텍처 · 트러블슈팅을 기록하는 프론트엔드 기술 블로그.",
`author` 를 `CHOI` 로 확정했다. `site.ts` 주석과 README 체크리스트의 임시값 표기를 제거했다.

**정정 — Vercel 환경변수**

`vercel env ls production` 의 필터링된 출력만 보고 "Production 스코프 전용"으로 판단했으나,
실제로는 Development·Preview·Production 세 스코프 모두에 등록돼 있었다. 조치 불필요.

**로컬 저장소 상태**

로컬이 `origin/dev` 보다 6커밋 뒤처져 `src/` 가 없는 상태였다 (초기 설정 커밋만 있는 것처럼 보였음).
fast-forward pull 로 동기화했다. 로컬 `main` 은 아직 `origin/main` 보다 뒤처져 있다.
