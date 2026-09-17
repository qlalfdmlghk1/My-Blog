import { notFound } from 'next/navigation';

import { HeroCarousel, type HeroSlide } from '@/components/HeroCarousel';
import { ListShell } from '@/components/ListShell';
import { Pagination } from '@/components/Pagination';
import { PostCard } from '@/components/PostCard';
import { paginate } from '@/lib/pagination';
import { getCategoryTree, readPublishedPosts } from '@/lib/posts';
import { SITE } from '@/lib/site';

/** 히어로에 올리는 최신 글 수 — 넘기다 지루해지지 않을 만큼만 */
const HERO_COUNT = 5;

/**
 * 홈 목록의 본문 — `/`(1페이지)와 `/page/[page]`(2페이지부터)가 함께 쓴다.
 *
 * 라우트마다 따로 조립하지 않는다. 두 벌로 두면 카드 한 줄을 고칠 때 고칠 곳이
 * 두 군데가 되고, 1페이지와 2페이지의 화면이 조금씩 어긋나기 시작한다.
 *
 * 골격(분류 탭 + 본문 한 칸)은 ListShell 이 준다 — 카테고리 · 태그 화면과 같다.
 * 홈만의 것은 그 아래 최신 글 캐러셀뿐이다.
 *
 * 히어로는 1페이지에만 있다. 2페이지부터는 목록을 이어서 보는 중이라 같은 다섯 편을
 * 다시 크게 보여줄 이유가 없다.
 */
export async function HomeList({ page }: { page: number }) {
  // 분류 탭 · 배지가 쓸 트리를 이 목록에서 집계하므로 Firestore 를 한 번만 읽는다
  const { posts, degraded } = await readPublishedPosts();
  const categories = await getCategoryTree(posts);
  // 글 카드가 배지 색·이름을 각자 조회하지 않도록 한 번 만들어 넘긴다
  const byslug = new Map(categories.map((c) => [c.slug, c]));

  const paged = paginate(posts, page);
  if (!paged) {
    // 조회가 실패해 목록이 비었을 뿐인데 404 를 내면, 살아 있는 URL 이 revalidate
    // 주기(1시간) 동안 404 로 굳는다. 던지면 ISR 이 직전 정적 페이지를 계속 서빙한다.
    if (degraded) throw new Error(`글 조회 실패 — /page/${page} 를 404 로 굳히지 않는다`);
    notFound();
  }

  // 목록은 publishedAt 내림차순이라 앞에서 자르면 곧 최신 글이다
  const hero: HeroSlide[] =
    page === 1
      ? posts.slice(0, HERO_COUNT).map((p) => ({ post: p, category: byslug.get(p.category) ?? null }))
      : [];

  return (
    <ListShell categories={categories}>
      {/* 화면의 h1 은 사이트 이름 하나다. 히어로 제목은 넘길 때마다 바뀌고 2페이지엔
          없어서 h1 을 맡길 수 없다. 헤더 로고가 이미 이름을 보여주므로 눈에는 숨긴다. */}
      <h1 className="sr-only">{SITE.name}</h1>

      {hero.length > 0 && (
        <div className="mt-8 sm:mt-12">
          <HeroCarousel slides={hero} />
        </div>
      )}

      <section aria-labelledby="all-posts" className={hero.length > 0 ? 'mt-16 sm:mt-24' : 'mt-8'}>
        <h2 id="all-posts" className="rise text-2xl font-bold tracking-tight sm:text-[28px]">
          전체 글
        </h2>

        {posts.length === 0 ? (
          <p className="py-20 text-center text-sm text-ink-dim">
            아직 발행된 글이 없습니다.
            <br />
            <span className="mt-2 inline-block">
              <code className="rounded bg-surface px-1.5 py-0.5">/admin/write</code>
              에서 첫 글을 작성하세요.
            </span>
          </p>
        ) : (
          <>
            <div className="stagger mt-6">
              {paged.items.map((p) => (
                <PostCard key={p.id} post={p} category={byslug.get(p.category)} />
              ))}
            </div>
            <Pagination page={paged.page} totalPages={paged.totalPages} basePath="/" />
          </>
        )}
      </section>
    </ListShell>
  );
}
