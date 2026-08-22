import { HomeList } from '@/components/lists/HomeList';

/** ISR — 평소에는 생성된 정적 HTML 을 서빙하고, 발행 시 revalidatePath 로 갱신 */
export const revalidate = 3600;

/** 홈은 목록의 1페이지다. 2페이지부터는 `/page/[page]` 가 같은 본문을 그린다. */
export default async function HomePage() {
  return <HomeList page={1} />;
}
