/**
 * 비속어 1차 필터 — 단어 사전 대조.
 *
 * 이 필터가 잡는 것은 **뻔한 욕설의 표기 변형**까지다. 돌려 까는 말이나 맥락상
 * 모욕은 여기서 안 잡히고, 그건 Gemini 판정(`moderation.server.ts`)이 맡는다.
 * 두 겹으로 나눈 이유는 속도다 — 뻔한 욕은 모델을 부르기 전에 끝낸다.
 *
 * ## 어떻게 변형을 따라가는가
 *
 * 1. **정규화**: 공백·숫자·기호·이모지를 전부 버리고 한글과 영문만 남긴다.
 *    `시 발`·`시1발`·`시*발` 이 모두 `시발` 이 된다.
 * 2. **자모 분해**: 남은 글자를 자모로 풀어 한 줄로 잇는다. 금지어도 같은 방식으로
 *    풀어서 부분 문자열로 찾는다. 받침이 다음 글자로 넘어간 표기(`시바ㄹ`·`싯발`)가
 *    같은 줄이 되고, 낱자를 섞어 쓴 `시ㅂㅏㄹ` 도 여기서 걸린다.
 * 3. **초성 표기**: `ㅅㅂ` 처럼 자모만 입력한 경우는 따로 본다.
 *
 * **모음을 바꾼 표기(`싀발`·`쉬발`)는 자모 분해로 안 잡힌다** — `시`(ㅅㅣ)와
 * `싀`(ㅅㅢ)는 다른 자모다. 이런 변형은 아래 목록에 표기마다 한 줄씩 적는다.
 * 모음까지 무시하고 자음만 맞춰보는 방법도 있지만, 그러면 `사부`·`소방`·`수법` 이
 * 전부 `ㅅㅂ` 로 걸린다 — 오탐이 미탐보다 비싸서 그 길은 택하지 않았다.
 *
 * ## 초성을 따로 보는 이유 (중요)
 *
 * 초성 패턴(`ㅅㅂ`)을 2번의 자모 줄에서 찾으면 안 된다. `웃보` 의 자모 줄은
 * `ㅇㅜㅅㅂㅗ` 라서 `ㅅㅂ` 가 그 안에 들어 있다. 받침과 다음 글자의 초성이 우연히
 * 붙는 경우가 흔해서, 멀쩡한 낱말이 줄줄이 걸린다.
 *
 * 그래서 초성 패턴은 **원문에서 자모 글자로 직접 입력된 구간**에서만 찾는다.
 * 사람이 `ㅅㅂ` 라고 친 자리는 자모 글자 그대로 남아 있고, `사부`·`웃보` 처럼
 * 음절로 쓴 글자에서는 그런 구간이 만들어지지 않는다.
 */

const HANGUL_BASE = 0xac00;
const HANGUL_LAST = 0xd7a3;

// 유니코드 한글 음절 조합 순서 — 분해에 필요한 표다.
const CHO = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
];
const JUNG = [
  'ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ',
  'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ',
];
const JONG = [
  '', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ',
  'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
];

/**
 * 금지어. **자모로 풀어서** 대조하므로 여기에는 보통 표기 하나만 적으면 된다.
 * (`시발` 하나로 `시 발`·`시1발`·`싀발` 이 함께 걸린다)
 *
 * 목록을 코드에 두는 이유: 관리 화면을 만들 만큼 자주 바뀌지 않고, 바뀔 때는
 * 배포와 함께 나가는 편이 낫다. 늘릴 때는 이 배열에 한 줄 더하면 된다.
 */
const WORDS = [
  // 모음을 바꾼 표기는 자모 분해가 못 따라가므로 한 줄씩 적는다 (파일 머리 주석)
  '시발', '씨발', '씨빨', '싀발', '쉬발', '시팔', '씨팔', '쒸발', '슈발',
  '십새', '십새끼', '씹새끼', '개새끼', '개세끼',
  '병신', '븅신', '빙신', '지랄', '좆', '썅', '썅놈',
  '미친놈', '미친년', '또라이', '등신', '바보새끼',
  '새끼야', '뒤져라', '엿먹어',
  '창녀', '걸레년', '야동',
  'fuck', 'shit', 'bitch', 'asshole', 'bastard',
];

/**
 * 여기 넣었다가 뺀 낱말들 — 다시 넣지 말 것.
 *
 * `보지`·`자지`·`꺼져`·`죽어라` 는 평범한 문장에 그대로 나타난다
 * ("글을 **보지** 못했어요" · "불이 **꺼져** 있어요" · "**죽어라** 공부했다").
 * 자모로 풀어 부분 문자열로 찾기 때문에 어미까지 그대로 걸려서, 정상 댓글이
 * 차단되고 작성자는 이유도 모른다. `돌아이`(돌아이다·돌아있다)·`멍청이`(멍청이라)도 같다.
 *
 * 이런 낱말은 앞뒤를 봐야 갈리므로 Gemini 판정에 맡긴다. 1차 필터는 **오탐이 없는
 * 것만** 담는다 — 오탐 한 번이 정상 댓글을 막는 비용이 미탐 한 번보다 크다.
 */

/**
 * 자모로만 쓰는 욕설. 위 목록과 달리 **자모 글자로 직접 입력된 구간에서만** 찾는다
 * (이유는 파일 머리 주석).
 */
const JAMO_WORDS = ['ㅅㅂ', 'ㅆㅂ', 'ㅂㅅ', 'ㅄ', 'ㅈㄹ', 'ㄱㅅㄲ', 'ㅁㅊ', 'ㄲㅈ', 'ㅆㄺ'];

/** 한글 자모 글자인가 (음절이 아니라 `ㅅ`·`ㅏ` 같은 낱자) */
function isStandaloneJamo(ch: string): boolean {
  const code = ch.codePointAt(0) ?? 0;
  // 호환 자모 영역 — 키보드로 친 낱자가 여기 들어온다
  return code >= 0x3131 && code <= 0x318e;
}

function isHangulSyllable(ch: string): boolean {
  const code = ch.codePointAt(0) ?? 0;
  return code >= HANGUL_BASE && code <= HANGUL_LAST;
}

/**
 * 대조용 정규화 — 글자만 남긴다.
 *
 * 숫자를 지우는 것이 `시1발` 을 잡는 핵심이다. 기호·이모지·공백도 같은 이유로 버린다.
 * 영문은 소문자로 맞춘다.
 */
export function normalizeForMatch(text: string): string {
  return [...text.normalize('NFC').toLowerCase()]
    .filter((ch) => isHangulSyllable(ch) || isStandaloneJamo(ch) || /[a-z]/.test(ch))
    .join('');
}

/** 음절을 자모로 푼다. 자모 낱자와 영문은 그대로 둔다 */
export function toJamo(text: string): string {
  let out = '';
  for (const ch of text) {
    if (isHangulSyllable(ch)) {
      const index = (ch.codePointAt(0) as number) - HANGUL_BASE;
      out += CHO[Math.floor(index / 588)];
      out += JUNG[Math.floor((index % 588) / 28)];
      out += JONG[index % 28];
    } else {
      out += ch;
    }
  }
  return out;
}

/** 원문에서 **자모 낱자로 직접 입력된** 구간만 모은다 */
function standaloneJamoRuns(normalized: string): string[] {
  const runs: string[] = [];
  let current = '';
  for (const ch of normalized) {
    if (isStandaloneJamo(ch)) {
      current += ch;
    } else if (current) {
      runs.push(current);
      current = '';
    }
  }
  if (current) runs.push(current);
  return runs;
}

/** 금지어를 자모로 푼 목록. 모듈 로드 때 한 번만 만든다 */
const JAMO_WORD_LIST = WORDS.map((word) => ({ word, jamo: toJamo(normalizeForMatch(word)) }));

/**
 * 걸리면 그 금지어를, 아니면 null.
 *
 * 어느 낱말에 걸렸는지 돌려주는 이유는 화면에 보여주기 위해서가 **아니다** —
 * 무엇에 걸렸는지 알려주면 그 낱말만 바꿔 다시 시도하게 된다. 서버 로그에서
 * 오탐을 확인할 때 쓴다.
 */
export function findProfanity(body: string): string | null {
  const normalized = normalizeForMatch(body);
  if (!normalized) return null;

  const jamo = toJamo(normalized);
  const hit = JAMO_WORD_LIST.find((entry) => entry.jamo && jamo.includes(entry.jamo));
  if (hit) return hit.word;

  const runs = standaloneJamoRuns(normalized);
  const jamoHit = JAMO_WORDS.find((word) => runs.some((run) => run.includes(word)));
  return jamoHit ?? null;
}

export function hasProfanity(body: string): boolean {
  return findProfanity(body) !== null;
}
