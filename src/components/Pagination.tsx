import Link from 'next/link';

import { pageHref, pageWindow } from '@/lib/pagination';

/**
 * 목록 페이지 이동 — 홈 · 카테고리 · 소분류 · 태그가 함께 쓴다.
 *
 * 색을 쓰지 않는다: 색은 분류(카테고리)에만 등장한다는 원칙을 지킨다.
 * 현재 페이지는 배경과 굵기로만 구분하고, 스크린리더에는 `aria-current` 로 알린다.
 *
 * 링크는 `?page=2` 가 아니라 `/page/2` 다 — Server Component 가 `searchParams` 를
 * 읽으면 라우트가 동적 렌더링으로 바뀌어 목록 화면의 ISR 정적 생성이 사라진다.
 */
export function Pagination({
  page,
  totalPages,
  basePath,
}: {
  page: number;
  totalPages: number;
  /** 1페이지의 주소 — `/`, `/categories/dev`, `/tags/react` 처럼 */
  basePath: string;
}) {
  // 한 페이지뿐이면 아무것도 그리지 않는다 — 이동할 곳이 없는 줄은 소음이다
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="페이지" className="mt-12 flex items-center justify-center gap-1">
      <Step
        basePath={basePath}
        page={page - 1}
        enabled={page > 1}
        label="이전"
        aria-label="이전 페이지"
      />

      {pageWindow(page, totalPages).map((item, i) =>
        item === 'gap' ? (
          // 접힌 구간 — 링크가 아니므로 스크린리더에서는 숨긴다
          <span key={`gap-${i}`} aria-hidden className="px-1 text-sm text-ink-dim">
            …
          </span>
        ) : item === page ? (
          <span
            key={item}
            aria-current="page"
            className={`${cell} bg-surface font-bold ring-1 ring-inset ring-line`}
          >
            {item}
          </span>
        ) : (
          <Link
            key={item}
            href={pageHref(basePath, item)}
            className={`${cell} text-ink-dim transition-colors hover:bg-surface hover:text-ink`}
          >
            {item}
          </Link>
        ),
      )}

      <Step
        basePath={basePath}
        page={page + 1}
        enabled={page < totalPages}
        label="다음"
        aria-label="다음 페이지"
      />
    </nav>
  );
}

/** 번호·화살표가 같은 크기의 과녁을 갖게 한다 (모바일 터치 최소 크기) */
const cell =
  'inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg px-2.5 text-sm tabular-nums';

/**
 * 이전·다음 — 갈 곳이 없으면 링크가 아니라 흐린 글자로 둔다.
 * 비활성 링크를 그대로 두면 탭 이동이 아무 일도 하지 않는 곳에서 멈춘다.
 */
function Step({
  basePath,
  page,
  enabled,
  label,
  'aria-label': ariaLabel,
}: {
  basePath: string;
  page: number;
  enabled: boolean;
  label: string;
  'aria-label': string;
}) {
  if (!enabled) {
    return (
      <span aria-hidden className={`${cell} text-ink-dim opacity-40`}>
        {label}
      </span>
    );
  }
  return (
    <Link
      href={pageHref(basePath, page)}
      aria-label={ariaLabel}
      className={`${cell} text-ink-dim transition-colors hover:bg-surface hover:text-ink`}
    >
      {label}
    </Link>
  );
}
