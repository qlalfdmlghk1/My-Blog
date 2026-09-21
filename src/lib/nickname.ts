/**
 * 익명 작성자 표시 — 닉네임 조합과 아바타 시드.
 *
 * 순수 모듈이다. 발급은 서버 라우트가 하고 보관은 브라우저가 하지만, **검증도
 * 서버가 이 목록으로 한다.** 브라우저가 보내는 닉네임을 그대로 믿으면 '관리자'
 * 같은 이름을 달 수 있어서, 발급과 검증이 같은 목록을 봐야 한다.
 *
 * 목록을 넉넉히 두는 이유: 조합 수가 적으면 한 글에서 같은 닉네임이 자주 겹친다.
 * 지금은 40 × 40 = 1,600 가지이고, 겹쳐도 아바타 시드로 갈린다(중복은 허용한다).
 */

const ADJECTIVES = [
  '유쾌한', '다정한', '쾌활한', '느긋한', '살가운', '차분한', '명랑한', '든든한',
  '상냥한', '꼼꼼한', '성실한', '엉뚱한', '재빠른', '넉넉한', '따뜻한', '솔직한',
  '침착한', '활발한', '용감한', '신중한', '깔끔한', '부지런한', '싹싹한', '너그러운',
  '씩씩한', '의젓한', '정직한', '섬세한', '단단한', '푸근한', '슬기로운', '소탈한',
  '기특한', '야무진', '해맑은', '늠름한', '어여쁜', '고요한', '반가운', '정다운',
] as const;

const ANIMALS = [
  '말', '나비', '원숭이', '다람쥐', '고래', '수달', '펭귄', '여우',
  '너구리', '오소리', '두더지', '고슴도치', '해달', '물범', '기린', '코알라',
  '판다', '사슴', '토끼', '거북이', '올빼미', '부엉이', '참새', '제비',
  '갈매기', '두루미', '학', '백조', '잉어', '가오리', '문어', '해마',
  '달팽이', '무당벌레', '사마귀', '잠자리', '반딧불이', '개구리', '도롱뇽', '카멜레온',
] as const;

/** 아바타 시드에 쓰는 글자. 화면 어디에도 안 보이지만 검증이 필요해 좁게 둔다 */
const SEED_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
const SEED_LENGTH = 8;

/**
 * 목록에서 하나.
 *
 * 인자를 "비어 있지 않은 목록"으로 받는다 — `readonly T[]` 로 받으면 인덱스 접근이
 * `T | undefined` 라 호출부마다 없는 경우를 다뤄야 하는데, 이 파일의 목록은 상수라
 * 비는 일이 없다. 그 사실을 타입으로 적어두는 편이 단언보다 낫다.
 */
function pick<T>(list: readonly [T, ...T[]]): T {
  return list[Math.floor(Math.random() * list.length)] ?? list[0];
}

/** 형용사+동물. 띄어쓰기를 넣지 않는다 — 토스처럼 한 덩어리로 읽힌다 */
export function randomNickname(): string {
  return `${pick(ADJECTIVES)}${pick(ANIMALS)}`;
}

export function randomAvatarSeed(): string {
  let seed = '';
  for (let i = 0; i < SEED_LENGTH; i += 1) {
    // charAt 은 범위를 벗어나도 빈 문자열이라 없는 값이 끼어들지 않는다
    seed += SEED_ALPHABET.charAt(Math.floor(Math.random() * SEED_ALPHABET.length));
  }
  return seed;
}

/**
 * 이 닉네임이 우리가 발급할 수 있는 조합인지 확인한다.
 *
 * 형용사 목록으로 앞을 잘라내고 나머지가 동물 목록에 있는지 본다. 단순히
 * "형용사가 앞에 붙어 있나"만 보면 `유쾌한관리자` 가 통과한다.
 *
 * 형용사가 다른 형용사의 접두사인 경우는 없지만, 있더라도 모든 형용사를 훑으므로
 * 어느 하나가 맞으면 통과한다.
 */
export function isValidNickname(nickname: string): boolean {
  return ADJECTIVES.some(
    (adj) =>
      nickname.startsWith(adj) &&
      (ANIMALS as readonly string[]).includes(nickname.slice(adj.length)),
  );
}

export function isValidAvatarSeed(seed: string): boolean {
  return seed.length === SEED_LENGTH && [...seed].every((c) => SEED_ALPHABET.includes(c));
}

/**
 * 시드에서 아바타 색·도형을 뽑을 때 쓰는 정수.
 *
 * 암호학적 해시가 아니다 — 같은 시드가 언제나 같은 그림이 되기만 하면 된다.
 * (djb2 변형: 곱하고 더하고 32비트로 자른다)
 */
export function seedToNumber(seed: string): number {
  let hash = 5381;
  for (let i = 0; i < seed.length; i += 1) {
    hash = ((hash << 5) + hash + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}
