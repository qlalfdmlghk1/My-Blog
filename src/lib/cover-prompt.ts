import { isPaletteId, type PaletteId } from '@/lib/palette';

/**
 * 커버 생성 프롬프트 — 화풍은 고정하고 소재만 글에서 가져온다.
 *
 * "비슷한 깔"의 실체가 이 파일이다. 글마다 프롬프트를 새로 쓰면 그림이 제각각이 되어
 * 사진을 직접 고르던 때와 다를 게 없다. 재질·조명·구도·여백을 여기서 못 박고,
 * 글이 정하는 것은 **무엇을 그릴지**(제목 · 요약)와 **바탕색**(카테고리 팔레트)뿐이다.
 *
 * 영어로 쓴다 — 이미지 모델은 영어 프롬프트에서 스타일 지시를 더 정확히 따른다.
 * 글자 금지를 두 번 말하는 이유: 모델이 제목을 그림 안에 써 넣는 일이 잦고, 그 글자는
 * 대개 깨져 있다. 사람 금지는 초상 문제와 화풍 유지 둘 다를 위해서다.
 *
 * 색은 hex 가 아니라 이름으로 준다. 모델은 "#EBF5FF" 보다 "soft pastel blue" 를
 * 훨씬 잘 따르고, 정확한 색은 어차피 카테고리 배지가 옆에서 맡는다.
 */
export function buildCoverPrompt({
  title,
  excerpt,
  category,
}: {
  title: string;
  excerpt: string;
  /** 카테고리 팔레트 슬롯 ID. 모르면 무채색 */
  category: string | null;
}): string {
  // 모르는 슬롯은 무채색으로 — getPaletteSlot 의 폴백(첫 슬롯 = 코랄)을 쓰면 분류를 잃은
  // 글이 엉뚱한 색을 받는다
  const tone = category && isPaletteId(category) ? PALETTE_TONE[category] : 'soft neutral gray';
  const subject = [title, excerpt].filter(Boolean).join(' — ');

  return [
    'A cover illustration for a software engineering blog post.',
    `Style: soft 3D clay render, matte rounded objects, gentle studio lighting, subtle soft shadows, pastel ${tone} background.`,
    'Composition: a small abstract scene of 3 to 5 simple geometric objects (spheres, rounded cubes, cylinders, pill shapes, thin connecting lines) arranged with generous empty space, centered, wide 16:9 frame.',
    `The scene should metaphorically represent this topic: "${subject}".`,
    'Strictly no text, no letters, no numbers, no logos, no screens with code, no people, no faces, no hands.',
    'Clean, minimal, calm, high quality.',
  ].join(' ');
}

/** 팔레트 슬롯 → 모델이 알아듣는 색 이름. 슬롯이 늘면 타입이 여기 빠진 것을 잡는다 */
const PALETTE_TONE: Record<PaletteId, string> = {
  coral: 'coral peach',
  blue: 'sky blue',
  purple: 'lavender purple',
  amber: 'warm amber yellow',
  teal: 'mint teal',
  pink: 'blush pink',
  lime: 'fresh lime green',
  cyan: 'light cyan',
  rose: 'rose red',
  indigo: 'periwinkle indigo',
  brown: 'sand brown',
  slate: 'cool slate gray',
};
