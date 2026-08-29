/**
 * 한글 → 로마자(국어의 로마자 표기법, RR) 변환.
 *
 * slug 을 한글로 두면 URL 이 퍼센트 인코딩돼 공유·검색 결과에서 읽히지 않는다.
 * 그렇다고 제목을 영어로 "번역"하려면 외부 API 키와 실패 폴백이 필요하고,
 * 같은 제목이 호출 시점마다 다른 slug 이 될 수 있다. 발음 표기는 외부 의존 없이
 * 언제나 같은 결과를 내므로 slug 의 성질(안정성)에 맞는다.
 *
 * **완전한 RR 구현이 아니다.** 표준 부록의 음운 변화 표 중 자주 걸리는 칸만 담았고,
 * 사람 이름·행정구역 예외(붙임표, 고유명사 대문자)는 다루지 않는다.
 * 목적이 "읽히는 ASCII 주소"라 근사치로 충분하고, 최종 slug 은 어차피 관리자가
 * 직접 고칠 수 있다 (PostEditor 의 slug 입력란).
 *
 * 로마자 변환 말고 `hangulChoseong()` 도 여기 있다. 소비자는 용어 사전의 ㄱㄴㄷ 묶음이라
 * 관심사가 달라 보이지만, 두 함수가 공유하는 것은 "로마자화"가 아니라 **음절 분해**
 * (`decompose`)라는 한글 원시 연산이고 초성 인덱스 19개도 같은 순서를 쓴다.
 * 파일을 쪼개면 그 분해가 복제되고 두 인덱스가 어긋날 여지가 생긴다.
 */

const BASE = 0xac00;
const LAST = 0xd7a3;
const JUNG_COUNT = 21;
const JONG_COUNT = 28;

/** 초성 19개 — 음절 첫소리로 쓰일 때의 표기 */
const CHOSEONG = [
  'g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's',
  'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h',
] as const;

/** 초성 자모 자체 — 용어 사전의 ㄱㄴㄷ 묶음 같은 곳에서 쓴다 */
const CHOSEONG_JAMO = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
] as const;

/** 중성 21개 */
const JUNGSEONG = [
  'a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa',
  'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i',
] as const;

/**
 * 종성 28개 — **받침으로 끝날 때의 대표음**.
 * 뒤에 모음이 오면 이 값이 아니라 아래 JONG_LINK(연음)를 쓴다.
 */
const JONGSEONG = [
  '', 'k', 'k', 'k', 'n', 'n', 'n', 't', 'l', 'k',
  'm', 'l', 'l', 'l', 'p', 'l', 'm', 'p', 'p', 't',
  't', 'ng', 't', 't', 'k', 't', 'p', 't',
] as const;

/**
 * 받침 + 모음(초성 ㅇ) — 받침이 다음 음절 첫소리로 넘어간다(연음).
 * `목요일`이 mokyoil 이 아니라 mogyoil 이 되는 자리다.
 * 받침 ㅎ 은 모음 앞에서 소리가 없어진다 (`좋아` → joa).
 */
const JONG_LINK = [
  '', 'g', 'kk', 'ks', 'n', 'nj', 'n', 'd', 'r', 'lg',
  'lm', 'lb', 'ls', 'lt', 'lp', 'r', 'm', 'b', 'ps', 's',
  'ss', 'ng', 'j', 'ch', 'k', 't', 'p', '',
] as const;

/**
 * 자음동화 — 앞 음절 받침의 대표음과 뒤 음절 초성이 만나 둘 다 바뀌는 칸만 적는다.
 * 키는 `{받침대표음}:{초성표기}`, 값은 `[바뀐 받침, 바뀐 초성]`.
 * 표에 없는 조합은 두 값을 그대로 잇는다.
 */
const ASSIMILATION: Record<string, readonly [string, string]> = {
  // ㄱ 받침
  'k:n': ['ng', 'n'], // 국내 → gungnae
  'k:r': ['ng', 'n'], // 백리 → baengni
  'k:m': ['ng', 'm'], // 국민 → gungmin
  'k:h': ['k', ''], // 축하 → chuka (ㅎ 이 앞 자음에 붙어 거센소리)
  // ㄴ 받침
  'n:r': ['l', 'l'], // 신라 → silla
  // ㄷ 받침(ㅅ·ㅈ·ㅊ·ㅌ 포함)
  't:n': ['n', 'n'], // 몇 년 → myeonnyeon
  't:r': ['n', 'n'],
  't:m': ['n', 'm'], // 갓머리 → ganmeori
  // ㄹ 받침
  'l:n': ['l', 'l'], // 별내 → byeollae
  'l:r': ['l', 'l'], // 블로그 → beullogeu (없으면 대표음 l + 초성 r 이 그대로 이어져 lr)
  // ㅁ 받침
  'm:r': ['m', 'n'], // 담력 → damnyeok
  // ㅂ 받침
  'p:n': ['m', 'n'], // 십년 → simnyeon
  'p:r': ['m', 'n'], // 압력 → amnyeok
  'p:m': ['m', 'm'], // 밥맛 → bammat
  'p:h': ['p', ''], // 입학 → ipak
  // ㅇ 받침
  'ng:r': ['ng', 'n'], // 종로 → jongno
};

/**
 * 받침 ㅎ(ㄶ·ㅀ 포함) + 예사소리 → 거센소리.
 * `좋다`가 jotda 가 아니라 jota 가 되는 자리라 위 표와 따로 둔다
 * (위 표는 대표음 't' 로 뭉뚱그려져 ㅎ 인지 ㅅ 인지 구분하지 못한다).
 */
const H_ASPIRATION: Record<string, string> = {
  g: 'k', // 좋고 → joko
  d: 't', // 좋다 → jota
  j: 'ch', // 좋지 → jochi
  b: 'p',
  s: 'ss', // 좋소 → josso
};

/** 받침에 ㅎ 이 들어 있는 종성 인덱스 — ㄶ(6) · ㅀ(15) · ㅎ(27) */
const H_JONG = new Set([6, 15, 27]);

interface Syllable {
  cho: number;
  jung: number;
  jong: number;
}

function decompose(code: number): Syllable | null {
  if (code < BASE || code > LAST) return null;
  const offset = code - BASE;
  return {
    cho: Math.floor(offset / (JUNG_COUNT * JONG_COUNT)),
    jung: Math.floor(offset / JONG_COUNT) % JUNG_COUNT,
    jong: offset % JONG_COUNT,
  };
}

/**
 * 한 글자의 초성 자모 — 한글 음절이 아니면 null.
 * 용어 사전이 ㄱ·ㄴ·ㄷ 로 묶을 때 쓴다.
 */
export function hangulChoseong(char: string): string | null {
  const syllable = decompose(char.codePointAt(0) ?? -1);
  return syllable ? CHOSEONG_JAMO[syllable.cho] ?? null : null;
}

/**
 * 한글을 로마자로. 한글이 아닌 문자(영문·숫자·기호)는 그대로 통과시킨다.
 *
 * 음절을 하나씩 훑되 **다음 음절의 초성까지 함께 본다** — 받침 소리가 뒤 초성에
 * 따라 달라지기 때문이다. 뒤가 한글이 아니면 받침은 대표음 그대로 끝난다.
 */
export function romanizeKorean(input: string): string {
  const chars = [...input];
  const out: string[] = [];

  for (let i = 0; i < chars.length; i += 1) {
    const current = decompose(chars[i]!.codePointAt(0) ?? -1);
    if (!current) {
      out.push(chars[i]!);
      continue;
    }

    out.push(CHOSEONG[current.cho] ?? '', JUNGSEONG[current.jung] ?? '');
    if (current.jong === 0) continue;

    const next = decompose(chars[i + 1]?.codePointAt(0) ?? -1);
    // 뒤가 한글이 아니면 받침은 대표음으로 끝난다 (`책` → chaek)
    if (!next) {
      out.push(JONGSEONG[current.jong] ?? '');
      continue;
    }

    const nextCho = CHOSEONG[next.cho] ?? '';
    // 다음 초성이 ㅇ(빈 표기)이면 받침이 그쪽 첫소리로 넘어간다
    if (nextCho === '') {
      out.push(JONG_LINK[current.jong] ?? '');
      continue;
    }

    if (H_JONG.has(current.jong)) {
      const aspirated = H_ASPIRATION[nextCho];
      if (aspirated) {
        // ㄶ·ㅀ 은 ㅎ 이 뒤로 넘어가도 ㄴ·ㄹ 이 남는다 (`많다` → manta)
        out.push(current.jong === 6 ? 'n' : current.jong === 15 ? 'l' : '');
        out.push(aspirated);
        i += 1;
        out.push(JUNGSEONG[next.jung] ?? '');
        // 넘겨받은 음절의 받침은 다음 반복이 아니라 여기서 처리해야 한다
        if (next.jong !== 0) out.push(tailOf(next.jong, chars[i + 1]));
        continue;
      }
    }

    const jongRep = JONGSEONG[current.jong] ?? '';
    const changed = ASSIMILATION[`${jongRep}:${nextCho}`];
    if (!changed) {
      out.push(jongRep);
      continue;
    }
    out.push(changed[0]);
    // 초성이 바뀌었으므로 다음 음절을 여기서 소비한다 (다음 반복은 건너뛴다)
    i += 1;
    out.push(changed[1], JUNGSEONG[next.jung] ?? '');
    if (next.jong !== 0) out.push(tailOf(next.jong, chars[i + 1]));
  }

  return out.join('');
}

/**
 * 앞당겨 소비한 음절의 받침 처리 — 그 뒤가 모음이면 연음, 아니면 대표음.
 * (앞당긴 음절의 뒤 자음동화까지 다시 따지지는 않는다 — 두 번 연속으로 바뀌는
 * 조합은 드물고, 근사치로 충분하다)
 */
function tailOf(jong: number, following: string | undefined): string {
  const next = decompose(following?.codePointAt(0) ?? -1);
  const linked = next && (CHOSEONG[next.cho] ?? '') === '';
  return (linked ? JONG_LINK[jong] : JONGSEONG[jong]) ?? '';
}
