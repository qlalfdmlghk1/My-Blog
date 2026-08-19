import Link from 'next/link';

/** 태그는 색 없음(회색) · 자유롭게 여러 개 */
export function TagChip({
  tag,
  count,
  active = false,
  href,
  label,
}: {
  tag: string;
  count?: number;
  active?: boolean;
  href?: string;
  /** 지정하면 # 접두어 없이 이 문자열을 그대로 보여준다 ("전체" 칩) */
  label?: string;
}) {
  const body = (
    <>
      <span>{label ?? `#${tag}`}</span>
      {typeof count === 'number' && (
        <span className="ml-1 opacity-60 tabular-nums">{count}</span>
      )}
    </>
  );
  const className = [
    'inline-flex items-center rounded-full px-2.5 py-1 text-xs transition-colors',
    active ? 'font-semibold ring-1 ring-current' : 'hover:opacity-80',
  ].join(' ');
  const style = { backgroundColor: 'var(--tag-bg)', color: 'var(--tag-fg)' };

  if (!href) {
    return (
      <span className={className} style={style}>
        {body}
      </span>
    );
  }
  return (
    <Link href={href} className={className} style={style}>
      {body}
    </Link>
  );
}
