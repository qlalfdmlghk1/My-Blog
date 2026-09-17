import { COVER_VIEWBOX, coverShapes, type CoverShape } from '@/lib/cover-art';
import type { Category } from '@/types/category';

/**
 * 글의 커버 — 홈 히어로와 글 카드가 함께 쓴다.
 *
 * 사진을 올린 글은 사진, 나머지는 slug 로 정해지는 도형 그림이다. 도형 그림이 기본이고
 * 사진은 예외다 — 목록이 한 톤으로 보이는 것은 도형 쪽이 책임진다(lib/cover-art.ts).
 *
 * next/image 를 쓰지 않는다. 커버 주소는 에디터에 자유 입력하거나 Vercel Blob 으로
 * 올린 것이라 호스트를 미리 열거할 수 없고, `remotePatterns` 에 없는 호스트를 만나면
 * next/image 는 렌더 시점에 던진다. 목록 한 화면이 커버 하나 때문에 통째로 깨지면 안 된다.
 *
 * `alt` 는 항상 비어 있다 — 커버는 장식이고 제목이 바로 옆에 있다. 대체 텍스트로
 * 제목을 다시 넣으면 스크린리더가 같은 제목을 두 번 읽는다. 도형 그림도 같은 이유로
 * aria-hidden 이다.
 *
 * 색은 카테고리 팔레트의 CSS 변수에서 온다 — 인라인 SVG 라 var() 가 그대로 먹고,
 * 다크 모드 전환도 변수가 바뀌면서 따라온다. 카테고리를 모르는 글(지워진 분류)은
 * 태그와 같은 무채색으로 떨어뜨린다.
 */
export function CoverImage({
  src,
  seed,
  category,
  priority = false,
  className = '',
}: {
  src: string | null;
  /** 도형 배치를 정하는 값 — 글 slug. 같은 글은 어느 화면에서든 같은 그림이어야 한다 */
  seed: string;
  category?: Pick<Category, 'name' | 'palette'> | null;
  /** 첫 화면에 보이는 히어로만 true — 지연 로딩을 끄고 우선순위를 올린다 */
  priority?: boolean;
  /** 크기 · 비율 · 모서리는 호출부가 정한다 (히어로와 카드가 다르다) */
  className?: string;
}) {
  const frame = `relative overflow-hidden bg-surface ${className}`;

  if (src) {
    return (
      <div className={frame}>
        {/* eslint-disable-next-line @next/next/no-img-element -- 호스트를 열거할 수 없다 (위 주석) */}
        <img
          src={src}
          alt=""
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          className="absolute inset-0 size-full object-cover"
        />
      </div>
    );
  }

  const bg = category ? `var(--pal-${category.palette}-bg)` : 'var(--tag-bg)';
  const fg = category ? `var(--pal-${category.palette}-fg)` : 'var(--tag-fg)';

  return (
    // 왼쪽 위에서 오는 옅은 빛을 배경에 깐다 — 납작한 단색 판이 아니라 공간처럼 보인다.
    // SVG 의 radialGradient 로 하지 않는 이유: id 가 필요한데, 같은 글이 히어로와
    // 목록에 동시에 나오면 한 화면에 같은 id 가 두 번 생긴다.
    <div
      aria-hidden
      className={frame}
      style={{
        backgroundImage: 'radial-gradient(circle at 20% 10%, rgb(255 255 255 / 0.55), transparent 70%)',
        backgroundColor: bg,
      }}
    >
      {/* slice — 정사각형 썸네일은 16:9 그림의 가운데를 잘라 쓴다 */}
      <svg
        viewBox={`0 0 ${COVER_VIEWBOX.width} ${COVER_VIEWBOX.height}`}
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 size-full"
        style={{ color: fg }}
      >
        {coverShapes(seed).map((shape, i) => (
          <Shape key={i} shape={shape} />
        ))}
      </svg>
    </div>
  );
}

/** 도형 하나 — 네 가지 모두 중심 좌표 기준으로 그려 회전이 제자리에서 돈다 */
function Shape({ shape }: { shape: CoverShape }) {
  const { kind, x, y, size, rotate, opacity } = shape;
  const half = size / 2;
  const transform = `rotate(${rotate} ${x} ${y})`;
  const common = { fill: 'currentColor', opacity, transform };

  switch (kind) {
    case 'circle':
      return <circle cx={x} cy={y} r={half} {...common} />;
    case 'square':
      return <rect x={x - half} y={y - half} width={size} height={size} rx={size * 0.22} {...common} />;
    case 'pill':
      // 가로로 긴 알약 — 높이는 폭의 절반, 모서리는 완전히 둥글다
      return (
        <rect x={x - half} y={y - half / 2} width={size} height={half} rx={half / 2} {...common} />
      );
    case 'triangle': {
      // 꼭짓점을 살짝 깎아 다른 도형과 같은 둥근 어휘를 유지한다
      const top = `${x},${y - half}`;
      const right = `${x + half * 0.92},${y + half * 0.6}`;
      const left = `${x - half * 0.92},${y + half * 0.6}`;
      return (
        <polygon
          points={`${top} ${right} ${left}`}
          strokeLinejoin="round"
          stroke="currentColor"
          strokeWidth={size * 0.18}
          {...common}
        />
      );
    }
  }
}
