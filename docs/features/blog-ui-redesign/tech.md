# blog-ui-redesign — tech 기록

## [2026-08-22] 이미지 업로드를 Firebase Storage → Vercel Blob 으로 이전 (#4)

**옮긴 이유**

Firebase Storage 가 2024년부터 Blaze(종량제) 플랜을 요구한다. 이 블로그는 카드 등록 없이
운영하는 것이 전제라, 이미지 한 축 때문에 프로젝트 전체를 종량제로 올릴 수 없었다.
Vercel Blob 은 Hobby 플랜에서 카드 없이 무료 한도를 쓴다. 이미 Vercel 로 배포하고 있어
스토어를 프로젝트에 연결하면 `BLOB_READ_WRITE_TOKEN` 이 배포본에 자동 주입된다.

**파일이 서버를 지나가지 않는 구조 (client upload)**

`/api/blob-upload` 는 **파일을 받지 않는다.** 브라우저가 Blob 으로 직접 올리고, 이 라우트는
그 업로드를 허가하는 짧은 토큰만 내준다. 그렇게 한 이유가 둘이다.

- 서버리스 함수의 요청 본문 상한(4.5MB)에 이미지가 걸리지 않는다
- 함수는 `iad1`, 스토어는 `icn1` 이라 파일이 서버를 거치면 태평양을 두 번 건넌다.
  브라우저 → `icn1` 직행이면 국내에서 올릴 때 한 번도 안 건넌다

**권한 — 호출자를 신뢰하지 않는다**

토큰 발급 경로가 열려 있으면 누구나 스토어에 쓸 수 있다. `handleUpload` 의
`onBeforeGenerateToken` 에서 Firebase ID 토큰을 `clientPayload` 로 받아
`verifyIdToken(token, true)` 로 검증하고 `admin` 커스텀 클레임을 확인한다.
`checkRevoked: true` 라 로그아웃·계정 비활성화된 토큰은 걸러진다.
클레임은 Firebase 가 서명한 토큰 안에 있어 클라이언트가 위조할 수 없다 —
`/api/revalidate` 와 같은 방식이다.

크기(5MB)·형식(이미지 5종) 제한도 **이 라우트가 정한다.** 클라이언트에서 거르면
`upload()` 를 직접 호출해 우회할 수 있다.

`addRandomSuffix: true` — 같은 파일명을 두 번 올려도 앞의 것을 덮어쓰지 않는다.

**남는 것**

- `onUploadCompleted` 는 비워 뒀다. 업로드 결과를 따로 기록하지 않는다.
  로컬 개발에서는 Vercel 이 localhost 에 도달할 수 없어 호출되지 않는다.
- 글을 지워도 Blob 파일은 남는다. 고아 파일 정리는 아직 없다.
- `storage.rules` · `storageBucket` · `firebase/storage` import 를 전부 제거했다.
  `firebase.json` 의 `storage` 항목도 뺐다 — 안 켠 프로젝트에서 배포가 깨진다.

**곁다리 — `npm run dev` 가 `listen EFAULT` 로 죽던 문제**

와일드카드 바인딩(`::`·`0.0.0.0`)이 간헐적으로 EFAULT 를 낸다. IPv6 전용 문제도, 포트
충돌도 아니다 — 같은 프로세스에서 5회 반복하면 3승 2패처럼 갈린다. 특정 인터페이스
주소(`127.0.0.1`, LAN IP)로는 항상 성공한다. 커널 레벨 네트워크 필터(백신·EDR·VPN)가
소켓 호출에 끼어들 때 나타나는 양상이다. `dev:ipv4` 스크립트로 우회하되 **저장소
기본값은 바꾸지 않았다** — 머신마다 다른 문제이고, 고정하면 같은 네트워크의 다른
기기(휴대폰 등)에서 접속할 수 없다.
