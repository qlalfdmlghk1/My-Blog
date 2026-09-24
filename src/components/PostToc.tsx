import { TocCollapseToggle } from '@/components/TocCollapseToggle';
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
 * 폭에 따라 두 벌이고, 접는 뜻이 서로 다르다.
 *  - PostToc (xl 이상): 본문 옆자리에 붙어 따라 내려온다. 접으면 **목차 칸을 치우고
 *    본문을 넓힌다** — 넓게 읽고 싶은 독자를 위한 선택이다. 단추만 클라이언트 JS 이고
 *    (TocCollapseToggle), 접힌 상태는 다른 글에서도 기억한다.
 *  - PostTocInline (xl 미만): 옆자리가 없으니 글 머리 아래에 둔다. 접으면 **목록만
 *    숨긴다** — 본문은 이미 화면 폭 가득이라 넓힐 것이 없다. 기본으로 접어 둔다 —
 *    펼친 채로 두면 좁은 화면에서 본문 첫 줄이 한참 아래로 밀린다. <details> 라
 *    JS 가 없고, 키보드(Enter/Space)와 스크린리더의 펼침 안내도 브라우저가 해 준다.
 */
/** 옆자리 목차의 글자·목록이 접힐 때 옅어지는 전환. 시간은 page.tsx 의 칸 폭 전환과 같다 */
const FADE =
  'transition-[opacity,visibility] duration-300 ease-out toc-collapsed:invisible toc-collapsed:opacity-0 motion-reduce:transition-none';

export function hasToc(toc: TocEntry[]): boolean {
  return toc.length >= 3;
}

export function PostToc({ toc }: { toc: TocEntry[] }) {
  if (!hasToc(toc)) return null;

  return (
    // overflow-x-hidden: 접히는 동안 칸(13rem → 2rem)이 안쪽 목록보다 좁아진다.
    // 넘친 부분은 잘라 내야 가로 스크롤바가 생기지 않는다.
    // 접힌 뒤에는 세로 스크롤도 끈다 — 숨긴 목록(invisible)이 높이를 그대로 차지해,
    // 긴 목차 글에서는 2rem 칸에 스크롤바가 남아 펼치기 단추를 덮는다.
    <nav aria-label="목차" className="hidden xl:sticky xl:top-20 xl:block xl:max-h-[calc(100dvh-7rem)] xl:self-start xl:overflow-y-auto xl:overflow-x-hidden xl:toc-collapsed:overflow-y-hidden">
      {/*
          단추를 맨 왼쪽에 둔다 — 칸이 2rem 으로 줄어도 왼쪽 끝은 그대로라 단추가
          제자리에 남고, 오른쪽의 글자·목록만 칸 밖으로 밀려 잘린다.

          안쪽은 폭을 13rem 으로 못 박는다. 칸 폭을 따라가게 두면 접히는 300ms 동안
          항목 글자가 매 프레임 다시 줄바꿈되며 출렁인다.

          접힌 쪽은 display:none 이 아니라 투명 + invisible 이다 — none 은 전환이 안
          걸려 뚝 사라진다. invisible 이 같이 걸려 있어 숨은 링크에 Tab 이 멈추지 않는다.
          칸 폭 자체는 page.tsx 의 그리드가 toc-collapsed: 로 줄인다.
      */}
      <div className="w-[13rem]">
        <div className="mb-1 flex items-center gap-2">
          <TocCollapseToggle />
          <h2 className={`text-[11px] font-bold uppercase tracking-wider text-ink-dim ${FADE}`}>
            목차
          </h2>
        </div>
        <div id="post-toc-list" className={FADE}>
          <TocList toc={toc} />
        </div>
      </div>
    </nav>
  );
}

/** 좁은 화면용 — 글 머리(header) 바로 아래에 둔다. xl 부터는 옆자리 목차가 대신한다 */
export function PostTocInline({ toc }: { toc: TocEntry[] }) {
  if (!hasToc(toc)) return null;

  return (
    <nav aria-label="목차" className="mt-6 rounded-xl border border-line px-4 py-3 xl:hidden">
      <details className="group">
        {/* 터치 타깃 44px — 접힌 상태에선 이 한 줄이 목차의 전부다 */}
        <TocSummary className="min-h-11 text-sm" count={toc.length} />
        <div className="mt-1 pb-1">
          <TocList toc={toc} />
        </div>
      </details>
    </nav>
  );
}

/**
 * 좁은 화면 목차(<details>)의 여닫는 손잡이. 브라우저 기본 삼각형은 지우고 같은
 * 자리에 화살표를 둔다 — 기본 마커는 브라우저마다 모양과 여백이 달라 통일한다.
 */
function TocSummary({ className, count }: { className: string; count?: number }) {
  return (
    <summary
      className={`flex cursor-pointer list-none items-center gap-1.5 font-bold text-ink-dim transition-colors hover:text-ink [&::-webkit-details-marker]:hidden ${className}`}
    >
      <svg
        aria-hidden
        viewBox="0 0 16 16"
        className="size-3 shrink-0 transition-transform group-open:rotate-90 motion-reduce:transition-none"
      >
        <path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      목차
      {count !== undefined && <span className="font-normal tabular-nums">({count})</span>}
    </summary>
  );
}

function TocList({ toc }: { toc: TocEntry[] }) {
  return (
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
  );
}
