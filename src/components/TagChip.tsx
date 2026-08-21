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
    // 색도 currentColor(=본문 글자색) 대신 반투명으로 낮춰 다른 테두리와 톤을 맞춘다.
    active ? 'font-semibold ring-1 ring-inset ring-current/40' : 'hover:opacity-80',
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
