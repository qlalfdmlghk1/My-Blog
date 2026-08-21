import type { PostStatus } from '@/types/post';

/**
 * 관리자 화면 공통 표현 조각.
 *
 * 공개 화면과 같은 토큰(bg · surface · line · ink · ink-dim)만 쓴다 —
 * 관리자라고 색을 더 얹으면 "색은 분류에만" 규칙이 관리자에서부터 무너지고,
 * 카테고리 색이 화면에서 눈에 띄지 않게 된다.
 *
 * 토큰 색에 Tailwind 투명도 수식(`bg-bg/80`)은 쓰지 않는다 —
 * 값이 `var(--bg)` 라 `<alpha-value>` 자리가 없어 조용히 무시된다.
 * 흐림이 필요하면 요소에 `opacity-*` 를 준다.
 */

export const labelClass = 'block text-xs font-semibold text-ink-dim';
export const hintClass = 'mt-1.5 text-[11px] leading-relaxed text-ink-dim';

/**
 * focus 시 outline 을 끄지 않는다 — globals.css 의 `:focus-visible` 이
 * 키보드 포커스 표시를 담당하므로, 여기서 지우면 대체 표시가 사라진다.
 * 테두리 변화는 마우스 사용자용 보조 신호일 뿐이다.
 */
export const fieldClass =
  'w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm transition-colors hover:border-ink-dim';

const btnBase =
  'inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50';

export const btnPrimary = `${btnBase} border border-ink bg-ink text-bg hover:opacity-90`;
export const btnSecondary = `${btnBase} border border-line hover:bg-surface`;
export const btnQuiet = `${btnBase} border border-transparent text-ink-dim hover:bg-surface hover:text-ink`;

/** 라벨 · 도움말 · 우측 보조 표시(글자 수 등)를 한 덩어리로 묶는다 */
export function Field({
  htmlFor,
  label,
  hint,
  aside,
  children,
}: {
  htmlFor: string;
  label: string;
  hint?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label className={labelClass} htmlFor={htmlFor}>
          {label}
        </label>
        {aside}
      </div>
      {children}
      {hint && <p className={hintClass}>{hint}</p>}
    </div>
  );
}

/**
 * 발행 / 임시 표시.
 *
 * 색을 쓰지 않는다. 예전에는 발행 배지가 `--cat-devenv-*`(개발 환경 카테고리)를
 * 빌려 썼는데, 그러면 그 카테고리 색을 조정할 때 상태 배지가 같이 바뀐다.
 * globals.css 가 오류 색을 `--danger-*` 로 따로 뺀 것과 같은 이유다.
 * 게다가 같은 줄에 카테고리 배지가 나란히 서므로, 상태까지 색을 가지면
 * 어느 쪽이 분류인지 읽히지 않는다. 채운 점 / 빈 점으로만 구분한다.
 */
export function StatusPill({ status }: { status: PostStatus }) {
  const published = status === 'published';
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line px-2 py-0.5 text-[11px] font-semibold text-ink-dim">
      <span
        aria-hidden
        className={`size-1.5 rounded-full ${published ? 'bg-ink' : 'border border-current'}`}
      />
      {published ? '발행' : '임시'}
    </span>
  );
}

/** 관리자 화면의 기본 면 — 카드 하나가 한 가지 관심사를 담는다 */
export function Panel({
  title,
  hint,
  children,
  className = '',
}: {
  title?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-line bg-surface p-4 sm:p-5 ${className}`}>
      {title && (
        <div className="mb-4">
          <h2 className="text-sm font-bold tracking-tight">{title}</h2>
          {hint && <p className="mt-1 text-[11px] text-ink-dim">{hint}</p>}
        </div>
      )}
      {children}
    </section>
  );
}
