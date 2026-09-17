import 'server-only';

import { hasAdminCredentials } from '@/lib/firebase/admin';
import type { Category, Subcategory } from '@/types/category';
import type { Post } from '@/types/post';

/**
 * 자격 증명이 없는 개발 환경의 목 데이터.
 *
 * `.env.local` 없이 `npm run dev` 를 띄우면 화면이 전부 빈 상태라 레이아웃을 손볼 수
 * 없었다. 홈 히어로 · 썸네일 · 분류 탭 · 상세 화면이 실제 글 모양으로 보이도록
 * 글 8편 · 카테고리 4개 · 소분류를 여기서 준다.
 *
 * ── 켜지는 조건은 둘 다 만족할 때뿐이다 ──
 *  1. Firebase Admin 자격 증명이 없다 (`hasAdminCredentials()` false)
 *  2. `NODE_ENV` 가 production 이 아니다
 * 그래서 `next build` 는 자격 증명이 없어도 예전처럼 빈 목록을 내고, 배포본에는
 * 이 데이터가 절대 실리지 않는다. 자격 증명이 있으면 개발 중에도 Firestore 를 읽는다.
 *
 * 카테고리 · 소분류의 기본값을 코드에 두지 않는다는 결정(categories.server.ts)과
 * 어긋나지 않는다 — 그 결정은 "관리 화면에서 다 지워도 되살아나지 않는다"는 뜻이고,
 * 이 데이터는 Firestore 에 닿을 수조차 없는 상황에서만 나온다.
 *
 * 커버는 자동 생성(lib/cover-art.ts)이 기본이라 대부분 비워 둔다. 두 편에만 picsum 의
 * seed 사진을 넣어 사진이 도형 사이에 섞였을 때 어떻게 보이는지도 함께 확인한다.
 */
export function mockDataEnabled(): boolean {
  return !hasAdminCredentials() && process.env.NODE_ENV !== 'production';
}

export const MOCK_CATEGORIES: Category[] = [
  { slug: 'frontend', name: '프론트엔드', hint: 'React · Next.js · 렌더링', palette: 'blue', order: 1 },
  { slug: 'performance', name: '성능', hint: '측정하고 줄인 기록', palette: 'coral', order: 2 },
  { slug: 'architecture', name: '아키텍처', hint: '구조를 정한 이유', palette: 'purple', order: 3 },
  { slug: 'troubleshooting', name: '트러블슈팅', hint: '깨진 것과 고친 것', palette: 'amber', order: 4 },
];

export const MOCK_SUBCATEGORIES: Subcategory[] = [
  { slug: 'nextjs', category: 'frontend', name: 'Next.js', order: 1 },
  { slug: 'react', category: 'frontend', name: 'React', order: 2 },
  { slug: 'css', category: 'frontend', name: 'CSS', order: 3 },
  { slug: 'loading', category: 'performance', name: '로딩', order: 1 },
  { slug: 'rendering', category: 'performance', name: '렌더링', order: 2 },
  { slug: 'data', category: 'architecture', name: '데이터 흐름', order: 1 },
  { slug: 'firebase', category: 'troubleshooting', name: 'Firebase', order: 1 },
  { slug: 'build', category: 'troubleshooting', name: '빌드 · 배포', order: 2 },
];

function cover(seed: string): string {
  return `https://picsum.photos/seed/${seed}/1200/650`;
}

/** 오늘에서 n 일 전 — 목록 정렬과 날짜 표시가 실제와 같이 보이게 한다 */
function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

interface Seed {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  subcategory: string;
  tags: string[];
  coverImage: string | null;
  daysAgo: number;
  content: string;
}

const SEEDS: Seed[] = [
  {
    slug: 'isr-publish-pipeline',
    title: '글 하나 발행하면 정적 페이지가 몇 장 다시 만들어질까',
    excerpt:
      '발행 버튼 한 번에 revalidatePath 가 홈 · 카테고리 · 태그 · 상세를 전부 건드린다. 어디까지 갱신해야 하고 어디부터는 기다려도 되는지 정한 기록.',
    category: 'frontend',
    subcategory: 'nextjs',
    tags: ['Next.js', 'ISR', 'Firestore'],
    coverImage: null,
    daysAgo: 1,
    content: `## 발행 한 번에 무엇이 낡는가

글을 하나 발행하면 그 글의 상세 페이지만 새로 생기는 것이 아니다. 홈 목록, 그 글이 속한 카테고리, 붙어 있는 태그 페이지 전부가 낡은 상태가 된다.

처음에는 \`revalidatePath('/')\` 하나만 불렀다. 홈은 바뀌었는데 카테고리 페이지에는 새 글이 한 시간 동안 나타나지 않았다.

## 어디까지 건드리는가

\`\`\`ts
export async function revalidateForPost(post: Post) {
  revalidatePath('/');
  revalidatePath(\`/categories/\${post.category}\`);
  for (const tag of post.tags) {
    revalidatePath(\`/tags/\${encodeURIComponent(tag)}\`);
  }
  revalidatePath(\`/posts/\${post.slug}\`);
}
\`\`\`

페이지네이션 2페이지부터는 일부러 건드리지 않는다. 한 시간 뒤 재검증으로 따라오고, 그동안 한 편이 밀려 있는 것은 눈에 띄지 않는다.

## 남은 문제

sitemap 과 RSS 는 아직 revalidate 주기에만 기댄다. 검색엔진이 새 글을 늦게 아는 것이 실제로 문제가 되는지 먼저 재 보고 정한다.`,
  },
  {
    slug: 'font-metrics-override',
    title: '모바일에서만 글자가 위로 붙어 보이던 이유',
    excerpt:
      'Windows Chrome 에서는 멀쩡한데 Android 와 macOS 에서는 탭과 배지의 글자가 위로 밀렸다. 원인은 폰트 파일의 hhea 테이블이었고, 해결은 CSS 세 줄이었다.',
    category: 'troubleshooting',
    subcategory: 'build',
    tags: ['폰트', 'CSS', '트러블슈팅'],
    coverImage: cover('font'),
    daysAgo: 4,
    content: `## 증상

같은 CSS 인데 기기마다 글자의 세로 위치가 달랐다. 데스크톱에서는 배지 한가운데에 글자가 놓이는데, 폰에서는 위쪽 테두리에 붙어 있었다.

## 원인

폰트 파일 안에는 세로 메트릭이 두 벌 있다. \`hhea\` 와 \`OS/2\`. Windows 는 \`OS/2\` 의 win 값을 읽고, macOS 와 Android 는 \`hhea\` 를 읽는다. 이 폰트의 Regular 는 \`hhea\` 의 descent 가 비정상적으로 커서, 글자 아래에 위와 맞먹는 빈 공간이 잡혔다.

## 해결

\`\`\`css
@font-face {
  font-family: 'Tmoney Round Wind';
  ascent-override: 102.5%;
  descent-override: 27.6%;
  line-gap-override: 0%;
}
\`\`\`

override 값은 Windows 가 이미 쓰고 있던 win 메트릭 그대로다. 데스크톱은 그대로고 다른 플랫폼이 거기에 맞춰진다.`,
  },
  {
    slug: 'sidebar-to-hero',
    title: '홈에서 사이드바를 걷어내고 히어로를 둔 이유',
    excerpt:
      '분류 6줄과 태그 무더기가 첫 화면의 왼쪽을 차지하고 있었다. 처음 온 사람이 봐야 하는 것은 분류가 아니라 글이라서, 홈만 구조를 바꿨다.',
    category: 'architecture',
    subcategory: 'data',
    tags: ['UI', '설계'],
    coverImage: null,
    daysAgo: 7,
    content: `## 무엇이 문제였나

홈 · 카테고리 · 태그 화면이 같은 2단 골격을 썼다. 카테고리 화면에서는 트리가 제 역할을 하는데, 홈에서는 글 세 편 옆에 빈 트리가 서 있었다.

## 홈만 다르게

카테고리와 태그 화면은 그대로 두고 홈만 한 칸으로 펼쳤다. 분류로 가는 길은 위쪽 탭 한 줄이 맡는다.

## 얻은 것과 잃은 것

첫 화면에서 글 제목이 40px 로 보인다. 대신 홈에서 태그로 바로 가는 길은 카드 안의 칩뿐이다. 태그를 훑고 싶은 사람은 카테고리 화면으로 한 번 들어가야 한다.`,
  },
  {
    slug: 'lcp-font-preload',
    title: 'LCP 2.8초를 1.9초로 — 폰트 하나를 preload 했을 뿐인데',
    excerpt:
      '히어로 제목이 폰트를 기다리느라 늦게 그려졌다. 웹폰트 838KiB 중 어느 파일을 먼저 받게 할지, 그리고 왜 둘 다는 안 되는지.',
    category: 'performance',
    subcategory: 'loading',
    tags: ['LCP', '폰트', 'Lighthouse'],
    coverImage: cover('lcp'),
    daysAgo: 10,
    content: `## 측정

Lighthouse 모바일 기준으로 LCP 가 2.8초였다. LCP 요소는 히어로 제목이었고, 폰트 파일이 CSS 를 다 읽은 뒤에야 요청되고 있었다.

## 시도

\`\`\`html
<link rel="preload" as="font" type="font/woff2" crossorigin
      href=".../TmoneyRoundWindRegular.woff2" />
\`\`\`

Regular 만 preload 했다. ExtraBold 까지 넣으면 첫 요청이 두 배가 되어 오히려 본문 렌더가 늦어졌다.

## 결과

LCP 1.9초. 제목이 쓰는 ExtraBold 는 여전히 늦게 스왑되지만, \`font-display: swap\` 이라 자리는 먼저 잡힌다.`,
  },
  {
    slug: 'firestore-index-missing',
    title: 'FAILED_PRECONDITION — 색인 하나가 빌드를 통째로 멈췄다',
    excerpt:
      '복합 쿼리에 색인이 없으면 Firestore 는 에러 메시지에 생성 링크를 함께 준다. 문제는 그 에러가 프리렌더 중에 터지면 배포가 통째로 실패한다는 것.',
    category: 'troubleshooting',
    subcategory: 'firebase',
    tags: ['Firestore', '배포', 'ISR'],
    coverImage: null,
    daysAgo: 14,
    content: `## 무슨 일이 있었나

\`where(status) + where(category) + orderBy(publishedAt)\` 쿼리를 추가하고 배포했더니 빌드가 FAILED_PRECONDITION 으로 죽었다.

## 두 가지를 바꿨다

1. 조회 실패는 빈 목록으로 떨어뜨리고 로그만 남긴다. ISR 이라 다음 재검증에서 채워진다.
2. 카테고리 필터는 쿼리를 따로 쏘지 않고 전체 목록을 메모리에서 거른다. 글이 세 자리를 넘기 전까지는 이쪽이 싸다.

\`\`\`ts
export async function safeRead<T>(fn: string, run: () => Promise<T>, fallback: T) {
  try {
    return await run();
  } catch (error) {
    console.error(\`[firestore] \${fn}() 실패 — 기본값으로 대체합니다.\`);
    return fallback;
  }
}
\`\`\``,
  },
  {
    slug: 'server-component-boundary',
    title: "'use client' 를 어디까지 내려보낼 것인가",
    excerpt:
      '캐러셀 하나 때문에 홈 전체가 클라이언트 번들로 가면 안 된다. 상태가 필요한 최말단만 잘라내고 나머지는 정적 HTML 로 남긴 기준.',
    category: 'frontend',
    subcategory: 'react',
    tags: ['React', 'Server Component', 'Next.js'],
    coverImage: null,
    daysAgo: 18,
    content: `## 기준

상태 · 이벤트 · 브라우저 API 중 하나라도 필요하면 그 컴포넌트만 클라이언트로 둔다. 페이지나 레이아웃에 \`'use client'\` 를 붙이는 순간 하위 트리 전체가 번들에 실린다.

## 캐러셀의 경우

넘기는 index 하나가 state 의 전부다. 슬라이드 데이터는 서버가 읽어 props 로 넘기고, 클라이언트는 몇 번째를 보여줄지만 정한다.

## 확인 방법

\`next build\` 의 First Load JS 를 본다. 홈이 108kB 에서 움직이지 않으면 경계가 새지 않은 것이다.`,
  },
  {
    slug: 'dark-mode-shadow',
    title: '다크 모드에서 그림자가 사라지는 문제',
    excerpt:
      '검정 배경에 검정 그림자를 얹으면 아무 일도 일어나지 않는다. 그림자를 더 진하게 하는 대신 위에서 오는 빛을 흉내 낸 안쪽 흰 선으로 바꿨다.',
    category: 'frontend',
    subcategory: 'css',
    tags: ['CSS', '다크 모드'],
    coverImage: null,
    daysAgo: 23,
    content: `## 문제

라이트에서 카드를 띄우던 \`box-shadow\` 가 다크에서는 배경에 묻혀 깊이가 사라졌다.

## 해결

\`\`\`css
.dark {
  --shadow-card: inset 0 1px 0 rgb(255 255 255 / 0.04),
                 0 8px 24px -14px rgb(0 0 0 / 0.7);
}
\`\`\`

안쪽 위에 흰 선 1px 을 얹으면 면이 살짝 떠 보인다. Tailwind 기본 \`shadow-*\` 를 쓰면 이 전환이 안 되므로 토큰으로 뺐다.`,
  },
  {
    slug: 'pagination-without-searchparams',
    title: '?page=2 대신 /page/2 를 쓰는 이유',
    excerpt:
      'Server Component 가 searchParams 를 읽는 순간 그 라우트는 동적 렌더링이 되고 ISR 정적 생성이 사라진다. 페이지 번호를 경로에 넣어 정적으로 남긴 방법.',
    category: 'performance',
    subcategory: 'rendering',
    tags: ['Next.js', 'ISR', '페이지네이션'],
    coverImage: null,
    daysAgo: 30,
    content: `## 문제

목록 페이지를 \`?page=2\` 로 만들었더니 빌드 결과에서 홈이 ○ (Static) 이 아니라 ƒ (Dynamic) 으로 바뀌었다.

## 원인

\`searchParams\` 를 읽는 Server Component 는 요청 시점에만 값을 알 수 있어 정적으로 만들 수 없다.

## 해결

\`/page/[page]\` 라우트를 두고 \`generateStaticParams\` 로 번호를 미리 만든다. 글이 늘면 마지막 번호도 늘어야 하므로 \`dynamicParams = true\` 를 함께 둔다.`,
  },
];

export const MOCK_POSTS: Post[] = SEEDS.map((s, i) => {
  const publishedAt = daysAgo(s.daysAgo);
  return {
    id: `mock-${i + 1}`,
    slug: s.slug,
    title: s.title,
    content: s.content,
    excerpt: s.excerpt,
    category: s.category,
    subcategory: s.subcategory,
    tags: s.tags,
    coverImage: s.coverImage,
    status: 'published',
    createdAt: daysAgo(s.daysAgo + 2),
    updatedAt: publishedAt,
    publishedAt,
  };
});
