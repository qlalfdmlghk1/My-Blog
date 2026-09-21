# comments

| 항목         | 값                              |
| ------------ | ------------------------------- |
| Jira         | (미사용)                        |
| GitHub Issue | (수동 생성 필요 — github-issue-draft.md 참고) |
| Branch       | feature/comments               |
| 작성자       | 최원서                          |
| 작성일       | 2026-09-21                      |
| Type         | Feat                            |

## 🎯 작업 목적

토스 기술 블로그처럼 독자가 로그인 없이 글에 댓글을 남길 수 있게 하되, 비속어·악플·도배가 공개 화면에 실리지 않게 한다.

## 📋 작업 범위

**포함 (In Scope)**

- [ ] 글 상세 하단에서 로그인 없이 랜덤 닉네임(형용사+동물)으로 댓글을 남길 수 있게 — `published` 글만, draft·없는 slug 는 404
- [ ] 닉네임과 아바타 시드를 브라우저가 기억하고 "랜덤 변경"으로 다시 뽑을 수 있게
- [ ] 본문은 trim 후 1~500자만 통과하고, 공백만 있는 입력은 거절되게
- [ ] 비속어가 든 댓글은 단어 사전(정규화·자모 분해)에서 즉시 거절되게
- [ ] 단어 사전을 통과한 댓글은 Gemini 판정(욕설·혐오·인신공격)을 거쳐야 게시되게 — Gemini 실패 시 "잠시 후 다시 시도" 거절 + 서버 로그
- [ ] 같은 IP(salt 해시)가 30초 안에 다시 쓰면 거절되게 — 해시 기록은 TTL 1시간 뒤 자동 삭제
- [ ] URL이 든 댓글은 거절되게
- [ ] 그 글의 가장 최근 댓글과 정규화(trim·공백 압축) 후 완전히 같은 본문은 거절되게
- [ ] 브라우저가 보낸 닉네임이 서버 목록 조합이 아니면 거절되게(사칭 방지)
- [ ] 공개 목록이 최신순으로, 한 글당 최대 100개까지 보이게
- [ ] 댓글이 저장되면 그 글의 정적 페이지가 재생성되고, 작성자 화면에 바로 보이게
- [ ] 관리자가 `/admin/comments`에서 댓글을 삭제할 수 있고, 삭제 후 글 페이지가 재생성되게
- [ ] Firestore 규칙에 `comments`(읽기 공개·생성 차단·삭제 관리자)와 `commentThrottle`(전부 차단)을 추가

**제외 (Out of Scope)**

- 작성자 본인의 댓글 수정·삭제 (토스와 같이 불가)
- 대댓글·좋아요·정렬 옵션
- 승인 대기함(관리자 사전 승인) — Gemini 실패가 매일 반복되면 그때 검토
- Cloudflare Turnstile 등 봇 검사 — 여러 IP 도배가 실제로 생기면 그때 검토
- 댓글 알림(메일·푸시)
- 닉네임 중복 방지 — 같은 닉네임이 한 글에 여러 번 나와도 아바타로 구분한다
- 공개 화면의 문의처 표기 — 연락용 주소가 아직 없다

## 🖥️ 화면 단위 분해 (UI 작업 시)

| 화면명 | 요약 | 핵심 인터랙션 |
| --- | --- | --- |
| 글 상세 댓글 영역 | 댓글 수 · 닉네임/아바타 + 랜덤 변경 · 입력창 · 목록 | 입력 → 제출 → 거절 사유 표시 또는 목록 갱신 |
| 관리자 댓글 목록 | 전체 댓글을 최신순으로, 글 제목·닉네임·본문·시각 | 삭제 → 확인 → 재검증 호출 |

## 🎨 디자인 분석 (UI 작업 시)

- **반응형 분기**: 별도 분기 없음. 본문 폭(`max-w-prose`)을 그대로 따른다
- **재사용 컴포넌트**: `src/components/admin/ui.tsx`(버튼·StatusPill), `src/components/CategoryBadge.tsx` 스타일 토큰, `globals.css`의 `--surface`·`--line`·`--accent` 토큰
- **신규 컴포넌트**: `src/components/CommentSection.tsx`(입력 폼+목록, 클라이언트), `src/components/CommentAvatar.tsx`(시드 기반 도형 아바타)

## 🛠️ 접근 방식

- 쓰기는 브라우저가 Firestore에 직접 하지 않고 `src/app/api/comments/route.ts`를 거친다. 서버가 검사한 뒤 Admin SDK로 저장한다 (규칙으로 익명 쓰기를 열면 필터를 우회할 수 있다)
- 닉네임 발급은 `src/app/api/comments/identity/route.ts`, 조합 목록은 `src/lib/nickname.ts`. 서버가 같은 목록으로 검증한다
- 비속어 사전·정규화는 `src/lib/profanity.ts`. Gemini 판정은 기존 `src/lib/gemini.server.ts`의 `generateJson`을 `{ abusive, reason }` 스키마로 호출하는 `src/lib/moderation.server.ts`
- IP는 `x-forwarded-for` 첫 값을 `COMMENT_IP_SALT`(신규 env)와 함께 SHA-256 해시. `commentThrottle/{hash}`에 `lastAt`·`expireAt` 저장, Firestore TTL 정책으로 자동 삭제. 댓글 문서에는 해시를 넣지 않는다
- 글 상세는 서버에서 `getComments(slug)`(`src/lib/comments.ts`)로 읽어 `CommentSection`에 넘긴다. API가 저장 직후 `revalidatePath('/posts/{slug}')`를 호출하고 클라이언트는 `router.refresh()`
- 관리자 삭제는 기존 패턴대로 클라이언트가 규칙(`isAdmin()`)을 통과해 직접 삭제하고 `/api/revalidate`를 호출한다 (`src/lib/comments.client.ts`)
- 댓글 본문은 React 텍스트로만 렌더한다 (마크다운·자동 링크 없음)
- Gemini 차단 기준은 **욕설 · 혐오 · 인신공격 · 개인정보(전화번호·실명 등) 노출 · 광고성** 5종으로 한정한다. 글 내용에 대한 강한 비판·반박은 허용한다
- 댓글 변경은 글 상세 한 경로만 낡으므로 기존 `/api/revalidate` 에 `scope: 'comment'` 를 더해 그 경로만 무효화한다 (기존 scope 는 목록·RSS·sitemap·전 카테고리까지 훑는다)
- 데이터 모델: `comments/{id}` = `{ postSlug, nickname, avatarSeed, body, createdAt }`. 타입은 `src/types/comment.ts`

## 🔗 참고 자료

| 유형       | 링크 |
| ---------- | ---- |
| Figma      | -    |
| Storybook  | -    |
| API 명세   | docs/PLAN.md (데이터 모델 정본) |
| Confluence | -    |
| 기타       | 토스 기술 블로그 댓글 UI (스크린샷 참고) |

## ✅ 검증 계획

- 단위/통합 테스트: 테스트 스크립트 미도입 — `profanity.ts` 정규화는 스크립트로 수동 대조 (`시 발`·`시1발`·`ㅅㅂ` 변형)
- 회귀 포인트: 글 상세 ISR(`revalidate = 3600`)과 `revalidatePath` 상호작용, Firestore 규칙 배포(`npm run rules:deploy`) 후 기존 관리자 쓰기 동작
- 수동 확인: 비속어 거절 문구 / Gemini 차단 문구 / 30초 내 재작성 거절 / URL 포함 거절 / 위조 닉네임 거절 / 저장 후 새로고침 없이 목록 반영 / 관리자 삭제 후 글 페이지 갱신 / `npm run lint` · `npm run typecheck`

## 🤔 주요 결정 사항

- Gemini 실패 시 게시하지 않고 거절한다 — "단어 사전만으로 게시"는 봇으로 한도를 소진시켜 AI 필터를 끄는 우회 경로가 된다. 승인 대기함은 실패가 매일 반복될 때 검토
- IP 해시에 서버 전용 salt를 섞는다 — IPv4 공간이 작아 salt 없는 해시는 역산 가능
- 도배 제한은 닉네임이 아니라 IP 기준 — 닉네임은 브라우저가 기억하는 표시일 뿐이다
- 기획 정본(`docs/PLAN.md`)의 "댓글 — 필요해지면 giscus 지연 로드" 를 이번 결정(자체 구현)으로 갱신한다
- 공개 목록 상한 100개는 정적 HTML 크기를 댓글 수에 묶어 두기 위한 값이다. 넘치는 글이 실제로 생기면 그때 더 보기를 검토한다

## ⚠️ 미확인 항목

- **Firebase 요금제** — Spark(무료)면 한도에서 멈추고 요금이 없지만, Blaze(종량)면 익명 쓰기가 비용에 직결된다. 배포 전에 확인하고 Blaze 면 예산 알림을 건다
- **Firestore TTL 정책** — `commentThrottle.expireAt` 기준 TTL 은 콘솔에서 사람이 켜야 한다. 켜지 않으면 해시 기록이 계속 쌓인다. 만료 후 실제 삭제까지는 Firestore 일정에 따라 시간이 걸린다
