import type { TocEntry } from '@/lib/markdown';

/**
 * 글 목차 — 긴 기술 글에서 현재 위치와 전체 구조를 알려준다.
 *
 * 서버 컴포넌트로 둔다. 스크롤 위치를 추적해 현재 항목을 강조하려면
 * 클라이언트 JS 가 필요한데, 목차는 그 값어치보다 전송 비용이 크다.
 * 앵커 이동만으로 충분하고, 부드러운 스크롤은 CSS(scroll-behavior)가 처리한다.
 *
 * 항목이 2개 이하면 렌더하지 않는다 — 목차가 본문보다 눈에 띄면 방해가 된다.
 */
export function PostToc({ toc }: { toc: TocEntry[] }) {
  if (toc.length < 3) return null;

  return (
    <nav aria-label="목차" className="xl:sticky xl:top-8 xl:self-start">
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
