/** 목록 한 페이지에 싣는 글 수 */
export const PAGE_SIZE = 10;

export interface Paged<T> {
  items: T[];
  page: number;
  totalPages: number;
}

/**
 * 페이지 번호 세그먼트(`/page/2`) 파싱 — 알아볼 수 없으면 null.
 *
 * `01`·`2.0`·`+2`·` 2` 처럼 **같은 페이지를 가리키는 다른 문자열**을 모두 거른다.
 * 통과시키면 같은 내용이 여러 주소로 열려 검색엔진에 중복 문서로 잡힌다.
 * `1` 은 숫자로는 유효하므로 여기서 통과시키고, 기준 URL 로 되돌리는 판단은
 * 호출부(라우트)가 한다.
 */
export function parsePageParam(raw: string): number | null {
  if (!/^[1-9][0-9]*$/.test(raw)) return null;
  const page = Number(raw);
  return Number.isSafeInteger(page) ? page : null;
}

/** 글이 0개여도 1페이지는 존재한다 — 빈 목록 화면을 보여줘야 하므로 */
export function countPages(total: number): number {
  return Math.max(1, Math.ceil(total / PAGE_SIZE));
}

/** 범위 밖 페이지는 null — 호출부가 404 로 떨어뜨린다 */
export function paginate<T>(items: T[], page: number): Paged<T> | null {
  const totalPages = countPages(items.length);
  if (page < 1 || page > totalPages) return null;
  const start = (page - 1) * PAGE_SIZE;
  return { items: items.slice(start, start + PAGE_SIZE), page, totalPages };
}

/**
 * generateStaticParams 용 — **2페이지부터**만 돌려준다.
 * 1페이지는 기준 URL(`/`, `/categories/x`)이 이미 담당한다.
 */
export function pageParams(total: number): { page: string }[] {
  const pages = countPages(total) - 1;
  return Array.from({ length: Math.max(0, pages) }, (_, i) => ({ page: String(i + 2) }));
}

/** 기준 경로 + 페이지 번호 → URL. 1페이지는 기준 경로 그 자체 */
export function pageHref(basePath: string, page: number): string {
  if (page <= 1) return basePath;
  // 홈의 기준 경로는 '/' 라 그대로 이으면 '//page/2' 가 된다
  const base = basePath === '/' ? '' : basePath.replace(/\/$/, '');
  return `${base}/page/${page}`;
}

/**
 * 번호 줄에 실제로 그릴 항목 — 첫·끝·현재 주변만 남기고 사이는 'gap' 으로 접는다.
 * 글이 많아져도 번호 줄이 화면 폭을 넘지 않게 한다(최대 7칸).
 */
export function pageWindow(page: number, totalPages: number): (number | 'gap')[] {
  const keep = [1, totalPages, page - 1, page, page + 1].filter(
    (n) => n >= 1 && n <= totalPages,
  );
  const shown = [...new Set(keep)].sort((a, b) => a - b);

  const out: (number | 'gap')[] = [];
  let prev = 0;
  for (const n of shown) {
    if (prev > 0 && n - prev > 1) out.push('gap');
    out.push(n);
    prev = n;
  }
  return out;
}
