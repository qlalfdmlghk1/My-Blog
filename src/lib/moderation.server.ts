import 'server-only';

import { generateJson } from '@/lib/gemini.server';

/**
 * 댓글 2차 필터 — 맥락 판정.
 *
 * 단어 사전(`profanity.ts`)이 잡는 것은 뻔한 욕설의 표기 변형까지다. 욕설 없이
 * 돌려 까는 말, 특정 집단 비하, 광고는 낱말만 봐서는 갈리지 않아서 모델에게 묻는다.
 *
 * 차단 기준을 프롬프트에 **다섯 가지로 못박는다.** 열어두면 모델이 "부정적인 글"까지
 * 차단하는데, 글에 대한 반박이나 강한 비판은 이 블로그가 막고 싶은 것이 아니다.
 * 기준을 바꾸는 것은 곧 정책을 바꾸는 것이므로 이 파일 한 곳에서만 고친다.
 */

const SCHEMA = {
  type: 'object',
  properties: {
    abusive: { type: 'boolean' },
    // 사람이 오탐을 확인할 때만 쓴다 — 작성자에게는 보여주지 않는다.
    // 무엇에 걸렸는지 알려주면 그 부분만 바꿔 다시 시도하게 된다.
    reason: { type: 'string' },
  },
  required: ['abusive', 'reason'],
} as const;

function prompt(body: string): string {
  return `당신은 개인 기술 블로그의 댓글을 검토합니다.
아래 댓글이 다음 다섯 가지 중 하나에 해당하면 abusive=true 로 판정하세요.

1. 욕설·비속어 (표기를 바꿔 쓴 경우 포함)
2. 특정 집단·개인에 대한 혐오나 비하
3. 글쓴이나 다른 댓글 작성자에 대한 인신공격 (능력·외모·인격을 깎는 말)
4. 개인정보 노출 (전화번호·주민번호·실명과 소속을 특정하는 정보 등)
5. 광고·홍보 (상품 판매, 외부 서비스 유입 유도)

다음은 abusive=false 입니다. 헷갈리면 false 로 판정하세요.
- 글의 내용·주장·기술 선택에 대한 반박이나 강한 비판
- 틀린 점을 지적하는 말, 아쉬움이나 불만의 표현
- 무례하지 않은 짧은 감상 ("좋은 글 감사합니다")
- 기술 용어나 라이브러리 이름 (욕설과 발음이 비슷해도 기술 맥락이면 false)

reason 에는 판정 근거를 한국어 한 문장으로 적으세요.

--- 댓글 시작 ---
${body}
--- 댓글 끝 ---`;
}

export type ModerationVerdict =
  | { ok: true; abusive: boolean; reason: string }
  /** 판정을 못 했다. 호출부는 게시하지 않고 거절한다 */
  | { ok: false; error: string };

/**
 * 판정 결과.
 *
 * **실패는 통과가 아니다.** 모델이 답을 못 주면 그 댓글은 게시하지 않는다.
 * "실패하면 단어 사전만으로 게시"로 두면, 봇으로 댓글을 쏟아부어 하루 한도를
 * 소진시키는 것만으로 2차 필터를 꺼버릴 수 있다. 무료 한도가 하루 수백 건이라
 * IP 하나로도 닿는 수준이다.
 *
 * 대신 실패는 **서버 로그에 남긴다.** 매일 반복되면 한도를 올리거나 승인 대기함을
 * 만들어야 한다는 신호이고, 로그가 없으면 그 사실을 알 방법이 없다.
 */
export async function judgeComment(body: string): Promise<ModerationVerdict> {
  const result = await generateJson<{ abusive: boolean; reason: string }>(prompt(body), SCHEMA);

  if (!result.ok) {
    console.error(`[moderation] 판정 실패 (status ${result.status}) — ${result.error}`);
    return { ok: false, error: result.error };
  }

  const { abusive, reason } = result.data;
  if (typeof abusive !== 'boolean') {
    console.error('[moderation] 판정 응답에 abusive 가 없습니다.');
    return { ok: false, error: '판정 응답 형식이 올바르지 않습니다.' };
  }

  return { ok: true, abusive, reason: String(reason ?? '') };
}
