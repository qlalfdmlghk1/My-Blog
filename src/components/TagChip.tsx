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
    // ring 은 기본이 바깥쪽이라 active 칩만 사방 1px 씩 커진다 — 배경 밖에 링이 떠
    // 보이고 칩이 줄바꿈으로 놓일 때 정렬이 어긋난다. inset 으로 안쪽에 긋는다.
    // 색에 알파 수식(ring-current/40)을 쓰지 않는다 — currentColor 는 <alpha-value> 를
    // 받지 못해 유틸이 생성되지 않고, 링이 통째로 사라진다(빌드 CSS 에 .ring-current 없음).
    active ? 'font-semibold ring-1 ring-inset ring-current' : 'hover:opacity-80',
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
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={className}
      style={style}
    >
      {body}
    </Link>
  );
}
