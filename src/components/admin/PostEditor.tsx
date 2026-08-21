'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState, type ClipboardEvent } from 'react';

import { CATEGORIES, type CategorySlug } from '@/lib/categories';
import { renderPreview } from '@/lib/markdown-preview';
import {
  createPost,
  deletePost,
  isSlugTaken,
  revalidatePost,
  updatePost,
  uploadImage,
} from '@/lib/posts.client';
import { autoExcerpt, slugify } from '@/lib/slug';
import type { Post, PostDraft, PostStatus } from '@/types/post';

/**
 * v1 은 WYSIWYG 를 만들지 않는다 — 툴바·드래그·자동저장까지 가면
 * 블로그가 아니라 에디터를 만드는 프로젝트가 된다.
 * 마크다운 직접 입력 + 실시간 미리보기까지가 범위.
 */
export function PostEditor({ existing }: { existing?: Post }) {
  const router = useRouter();
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const [title, setTitle] = useState(existing?.title ?? '');
  const [slug, setSlug] = useState(existing?.slug ?? '');
  const [slugEdited, setSlugEdited] = useState(Boolean(existing));
  const [content, setContent] = useState(existing?.content ?? '');
  const [excerpt, setExcerpt] = useState(existing?.excerpt ?? '');
  const [category, setCategory] = useState<CategorySlug>(existing?.category ?? 'frontend');
  const [tagInput, setTagInput] = useState(existing?.tags.join(', ') ?? '');
  const [coverImage, setCoverImage] = useState(existing?.coverImage ?? '');

  const [busy, setBusy] = useState<null | string>(null);
  const [error, setError] = useState<string | null>(null);

  const previewHtml = useMemo(() => renderPreview(content), [content]);
  // 발췌문 placeholder 도 본문 전체를 정규식으로 훑으므로 미리보기와 같이 memo 한다
  const excerptHint = useMemo(() => autoExcerpt(content), [content]);

  /**
   * 저장값에는 `#` 을 넣지 않는다.
   *
   * 화면에서 `#` 을 붙이는 건 TagChip 의 역할이라, 입력값에 `#` 이 남으면
   * `##프론트엔드` 로 두 번 찍힌다. 표시만의 문제가 아니라 `프론트엔드` 와
   * `#프론트엔드` 가 서로 다른 태그로 갈라지고 태그 URL 에도 `%23` 이 섞인다.
   * 사람은 `#` 을 붙여 쓰는 게 자연스러우므로 막지 말고 여기서 벗겨낸다.
   */
  const tags = useMemo(
    () => [
      ...new Set(
        tagInput
          .split(',')
          .map((t) => t.trim().replace(/^#+/, '').trim())
          .filter(Boolean),
      ),
    ],
    [tagInput],
  );

  function onTitleChange(next: string) {
    setTitle(next);
    // slug 를 손대지 않았다면 제목에서 따라간다
    if (!slugEdited) setSlug(slugify(next));
  }

  /** 붙여넣기로 이미지가 들어오면 업로드하고 커서 위치에 마크다운을 삽입한다 */
  async function onPaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    const file = [...e.clipboardData.items]
      .find((i) => i.kind === 'file' && i.type.startsWith('image/'))
      ?.getAsFile();
    if (!file) return;

    e.preventDefault();
    setBusy('이미지 업로드 중…');
    setError(null);
    try {
      const url = await uploadImage(file);
      const el = bodyRef.current;
      const markdown = `\n![](${url})\n`;
      if (el) {
        const start = el.selectionStart;
        const end = el.selectionEnd;
        setContent((prev) => prev.slice(0, start) + markdown + prev.slice(end));
      } else {
        setContent((prev) => prev + markdown);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '이미지 업로드에 실패했습니다.');
    } finally {
      setBusy(null);
    }
  }

  async function onCoverPick(file: File | undefined) {
    if (!file) return;
    setBusy('커버 업로드 중…');
    setError(null);
    try {
      setCoverImage(await uploadImage(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : '커버 업로드에 실패했습니다.');
    } finally {
      setBusy(null);
    }
  }

  function validate(status: PostStatus): string | null {
    if (!title.trim()) return '제목을 입력하세요.';
    if (!slug.trim()) return 'slug 를 입력하세요.';
    if (status === 'published' && !content.trim()) return '본문이 비어 있습니다.';
    return null;
  }

  async function save(status: PostStatus) {
    const invalid = validate(status);
    if (invalid) {
      setError(invalid);
      return;
    }
    setBusy(status === 'published' ? '발행 중…' : '저장 중…');
    setError(null);
    try {
      // 검사와 저장이 같은 값을 봐야 한다 — trim 전 값으로 조회하면
      // 뒤에 공백이 붙은 slug 가 검사를 통과하고 trim 된 값으로 저장돼 중복이 생긴다.
      // getPostBySlug 는 limit(1) 이라 그 경우 한쪽 글이 영구히 접근 불가가 된다.
      const normalizedSlug = slug.trim();

      if (await isSlugTaken(normalizedSlug, existing?.id)) {
        setError(`slug "${normalizedSlug}" 는 이미 사용 중입니다.`);
        return;
      }

      const draft: PostDraft = {
        slug: normalizedSlug,
        title: title.trim(),
        content,
        excerpt: excerpt.trim() || excerptHint,
        category,
        tags,
        coverImage: coverImage.trim() || null,
        status,
      };

      if (existing) {
        await updatePost(existing.id, draft, existing.status === 'published');
      } else {
        await createPost(draft);
      }

      // draft 로 되돌린 경우에도 기존 정적 페이지를 걷어내야 하므로 항상 재생성한다.
      // 카테고리를 바꿔 저장하면 옮겨온 쪽과 떠나온 쪽 목록이 둘 다 낡으므로 함께 넘긴다.
      const affected = [...new Set([...tags, ...(existing?.tags ?? [])])];
      const affectedCategories = [
        ...new Set([draft.category, ...(existing ? [existing.category] : [])]),
      ];
      await revalidatePost(draft.slug, affected, affectedCategories);

      router.push('/admin');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!existing) return;
    if (!window.confirm(`"${existing.title}" 를 삭제합니다. 되돌릴 수 없습니다.`)) return;
    setBusy('삭제 중…');
    setError(null);
    try {
      await deletePost(existing.id);
      await revalidatePost(existing.slug, existing.tags, [existing.category]);
      router.push('/admin');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제에 실패했습니다.');
    } finally {
      setBusy(null);
    }
  }

  const field = 'w-full rounded-md border border-line bg-bg px-3 py-2 text-sm';
  const label = 'mb-1.5 block text-xs font-semibold text-ink-dim';
  const button =
    'rounded-md border border-line px-3.5 py-2 text-sm font-semibold disabled:opacity-50';

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-bold tracking-tight">
          {existing ? '글 수정' : '글 작성'}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          {busy && <span className="text-xs text-ink-dim">{busy}</span>}
          <button
            type="button"
            className={button}
            disabled={Boolean(busy)}
            onClick={() => void save('draft')}
          >
            임시저장
          </button>
          <button
            type="button"
            className={`${button} bg-ink text-bg`}
            disabled={Boolean(busy)}
            onClick={() => void save('published')}
          >
            발행
          </button>
          {existing && (
            <button
              type="button"
              className={`${button} text-ink-dim`}
              disabled={Boolean(busy)}
              onClick={() => void remove()}
            >
              삭제
            </button>
          )}
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-md border border-line px-3 py-2 text-sm"
          style={{
            backgroundColor: 'var(--danger-bg)',
            color: 'var(--danger-fg)',
          }}
        >
          {error}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* ── 입력 ── */}
        <div className="space-y-4">
          <div>
            <label className={label} htmlFor="f-title">
              제목
            </label>
            <input
              id="f-title"
              className={field}
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
            />
          </div>

          <div>
            <label className={label} htmlFor="f-slug">
              slug — /posts/{slug || '…'}
            </label>
            <input
              id="f-slug"
              className={`${field} font-mono`}
              value={slug}
              onChange={(e) => {
                setSlugEdited(true);
                setSlug(e.target.value);
              }}
            />
          </div>

          <div>
            <label className={label} htmlFor="f-category">
              카테고리 — 정확히 1개
            </label>
            <select
              id="f-category"
              className={field}
              value={category}
              onChange={(e) => setCategory(e.target.value as CategorySlug)}
            >
              {CATEGORIES.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name} — {c.hint}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={label} htmlFor="f-tags">
              태그 — 쉼표로 구분 · 색 없음
            </label>
            <input
              id="f-tags"
              className={field}
              value={tagInput}
              placeholder="ISR, Firestore, 성능측정"
              onChange={(e) => setTagInput(e.target.value)}
            />
            {tags.length > 0 && (
              <p className="mt-1.5 text-xs text-ink-dim">{tags.map((t) => `#${t}`).join(' ')}</p>
            )}
          </div>

          <div>
            <label className={label} htmlFor="f-excerpt">
              발췌문 — 비우면 본문에서 자동 생성
            </label>
            <textarea
              id="f-excerpt"
              className={`${field} h-20 resize-y`}
              value={excerpt}
              placeholder={excerptHint || '본문을 쓰면 자동 생성 미리보기가 표시됩니다'}
              onChange={(e) => setExcerpt(e.target.value)}
            />
          </div>

          <div>
            <label className={label} htmlFor="f-cover">
              커버 이미지
            </label>
            <input
              id="f-cover"
              type="file"
              accept="image/*"
              className="text-xs"
              onChange={(e) => void onCoverPick(e.target.files?.[0])}
            />
            {coverImage && (
              <p className="mt-1.5 break-all font-mono text-[11px] text-ink-dim">{coverImage}</p>
            )}
          </div>

          <div>
            <label className={label} htmlFor="f-body">
              본문 (마크다운) — 이미지는 붙여넣기하면 업로드 후 자동 삽입됩니다
            </label>
            <textarea
              id="f-body"
              ref={bodyRef}
              className={`${field} h-[32rem] resize-y font-mono text-[13px] leading-relaxed`}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onPaste={(e) => void onPaste(e)}
            />
          </div>
        </div>

        {/* ── 미리보기 ── */}
        <div>
          <p className={label}>미리보기 — 코드 하이라이팅은 발행 후 서버에서 적용됩니다</p>
          <div className="rounded-md border border-line p-5">
            <div className="md" dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </div>
        </div>
      </div>
    </div>
  );
}
