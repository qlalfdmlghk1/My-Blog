import type { TocEntry } from '@/lib/markdown';

/**
 * 글 목차 — 긴 기술 글에서 현재 위치와 전체 구조를 알려준다.
 *
 * 서버 컴포넌트로 둔다. 스크롤 위치를 추적해 현재 항목을 강조하려면
 * 클라이언트 JS 가 필요한데, 목차는 그 값어치보다 전송 비용이 크다.
 * 앵커 이동만으로 충분하고, 부드러운 스크롤은 CSS(scroll-behavior)가 처리한다.
 *
 * 항목이 2개 이하면 렌더하지 않는다 — 목차가 본문보다 눈에 띄면 방해가 된다.
 * 판정 기준은 hasToc() 로 내보내 호출부가 그리드 컬럼과 같은 값을 쓰게 한다
 * (여기서만 null 을 반환하면 빈 컬럼이 남아 본문이 한쪽으로 치우친다).
 *
 * xl 미만에서는 그리드가 1열이라 목차가 본문 맨 아래로 밀린다. 다 읽고 나서
 * 나오는 목차는 길잡이 구실을 못 하므로 그 폭에서는 감춘다.
 */
export function hasToc(toc: TocEntry[]): boolean {
  return toc.length >= 3;
}

export function PostToc({ toc }: { toc: TocEntry[] }) {
  if (!hasToc(toc)) return null;

  return (
    <nav aria-label="목차" className="hidden xl:sticky xl:top-8 xl:block xl:max-h-[calc(100dvh-4rem)] xl:self-start xl:overflow-y-auto">
      <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-dim">
        목차
      </h2>
      <ul className="border-l border-line text-[13px] leading-relaxed">
        {toc.map((e) => (
          <li key={e.id}>
            <a
              href={`#${e.id}`}
              className={[
                '-ml-px block border-l-2 border-transparent py-1 text-ink-dim transition-colors hover:border-ink hover:text-ink',
                e.level === 3 ? 'pl-6' : 'pl-3 font-semibold',
              ].join(' ')}
            >
              {e.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
