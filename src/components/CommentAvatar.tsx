import { seedToNumber } from '@/lib/avatar';

/**
 * 익명 작성자 아바타.
 *
 * 닉네임 중복을 허용하므로(형용사 40 × 동물 40) 한 글에 같은 이름이 둘 나올 수 있다.
 * 그때 둘을 갈라 보여주는 것이 이 그림이다 — 시드가 다르면 색과 무늬가 다르다.
 *
 * 이미지가 아니라 도형으로 그린다. 요청이 늘지 않고, 시드만 있으면 서버에서 그대로
 * 그릴 수 있어 정적 HTML 에 함께 실린다(커버의 도형 그림과 같은 판단).
 */

/** 카테고리 팔레트를 그대로 쓰지 않는다 — 분류 색과 섞이면 어느 색이 분류인지 흐려진다 */
const TONES = [
  { bg: '#ffe0e6', fg: '#c2476a' },
  { bg: '#e0ecff', fg: '#3560b0' },
  { bg: '#e6e0ff', fg: '#5540b0' },
  { bg: '#fff0d6', fg: '#a8701a' },
  { bg: '#d9f2ee', fg: '#1f7a6c' },
  { bg: '#e8f5d6', fg: '#4d7a1f' },
  { bg: '#ffe5d6', fg: '#b55a2b' },
  { bg: '#dcefff', fg: '#2f6f96' },
] as const;

export function CommentAvatar({ seed, className = '' }: { seed: string; className?: string }) {
  const n = seedToNumber(seed);
  const tone = TONES[n % TONES.length] ?? TONES[0];
  // 눈 두 개와 입 하나. 시드로 위치를 조금씩 흔들어 같은 색이라도 표정이 갈린다.
  const eyeY = 13 + (n % 3);
  const mouthW = 6 + (Math.floor(n / 7) % 5);
  const tilt = (Math.floor(n / 11) % 5) - 2;

  return (
    <span
      className={`inline-flex shrink-0 overflow-hidden rounded-full ${className}`}
      style={{ backgroundColor: tone.bg }}
      // 장식이다 — 바로 옆에 닉네임이 글자로 있어 읽어줄 내용이 없다
      aria-hidden="true"
    >
      <svg viewBox="0 0 32 32" className="size-full" style={{ color: tone.fg }}>
        <g transform={`rotate(${tilt} 16 16)`}>
          <circle cx={11} cy={eyeY} r={2.2} fill="currentColor" />
          <circle cx={21} cy={eyeY} r={2.2} fill="currentColor" />
          <path
            d={`M ${16 - mouthW / 2} 21 Q 16 ${24 + (n % 3)} ${16 + mouthW / 2} 21`}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
          />
        </g>
      </svg>
    </span>
  );
}
