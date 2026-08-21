'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { CategoryBadge } from '@/components/CategoryBadge';
import {
  Field,
  Panel,
  btnPrimary,
  btnQuiet,
  btnSecondary,
  fieldClass,
  hintClass,
  labelClass,
} from '@/components/admin/ui';
import {
  createCategory,
  deleteCategory,
  isCategorySlugTaken,
  listCategories,
  updateCategory,
} from '@/lib/categories.client';
import { PALETTE, type PaletteId } from '@/lib/palette';
import { listAllPosts, revalidateTaxonomy } from '@/lib/posts.client';
import { slugify } from '@/lib/slug';
import type { Category, CategoryDraft } from '@/types/category';

/** 편집 중인 대상 — 새로 만드는 중이면 null slug */
type Editing = { slug: string | null; draft: CategoryDraft };

const EMPTY: CategoryDraft = { name: '', hint: '', palette: 'slate', order: 0 };

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[] | null>(null);
  /** slug → 글 수 (초안 포함). 삭제 가능 여부의 근거다 */
  const [counts, setCounts] = useState<Map<string, number>>(new Map());
  const [editing, setEditing] = useState<Editing | null>(null);
  const [slugInput, setSlugInput] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    // 글 수는 초안까지 세야 한다 — 초안이 참조 중인 카테고리를 지우면
    // 그 글은 발행하는 순간 존재하지 않는 카테고리를 가리키게 된다.
    const [found, posts] = await Promise.all([listCategories(), listAllPosts()]);
    const tally = new Map<string, number>();
    for (const p of posts) tally.set(p.category, (tally.get(p.category) ?? 0) + 1);
    setCategories(found);
    setCounts(tally);
  }, []);

  useEffect(() => {
    load().catch((err: unknown) =>
      setError(err instanceof Error ? err.message : '목록을 불러오지 못했습니다.'),
    );
  }, [load]);

  /** 이미 쓰이고 있는 팔레트 — 고르지 못하게 막지는 않고 표시만 한다 */
  const usedPalettes = useMemo(() => {
    const used = new Map<string, string>();
    for (const c of categories ?? []) {
      if (c.slug !== editing?.slug) used.set(c.palette, c.name);
    }
    return used;
  }, [categories, editing?.slug]);

  function startCreate() {
    setError(null);
    setSlugInput('');
    setEditing({
      slug: null,
      draft: { ...EMPTY, order: (categories?.length ?? 0) * 10 },
    });
  }

  function startEdit(category: Category) {
    setError(null);
    setSlugInput(category.slug);
    setEditing({
      slug: category.slug,
      draft: {
        name: category.name,
        hint: category.hint,
        palette: category.palette,
        order: category.order,
      },
    });
  }

  function patch(next: Partial<CategoryDraft>) {
    setEditing((prev) => (prev ? { ...prev, draft: { ...prev.draft, ...next } } : prev));
  }

  async function save() {
    if (!editing) return;
    const draft = editing.draft;
    const name = draft.name.trim();
    if (!name) {
      setError('이름을 입력하세요.');
      return;
    }

    // slug 는 만들 때 한 번만 정한다 — 바꾸면 발행된 카테고리 URL 이 깨지고
    // 글의 category 참조도 함께 끊긴다.
    const slug = editing.slug ?? slugify(slugInput || name);
    if (!slug) {
      setError('slug 를 만들 수 없습니다. 영문·숫자·한글이 포함된 이름을 쓰세요.');
      return;
    }

    setBusy('저장 중…');
    setError(null);
    try {
      const payload: CategoryDraft = { ...draft, name, hint: draft.hint.trim() };

      if (editing.slug) {
        await updateCategory(editing.slug, payload);
      } else {
        if (await isCategorySlugTaken(slug)) {
          setError(`slug "${slug}" 는 이미 사용 중입니다.`);
          return;
        }
        await createCategory(slug, payload);
      }

      // 이름·색·순서 어느 것이 바뀌어도 모든 목록 화면의 사이드바가 낡는다
      await revalidateTaxonomy();
      await load();
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setBusy(null);
    }
  }

  async function remove(category: Category) {
    const count = counts.get(category.slug) ?? 0;
    if (count > 0) return; // 버튼이 이미 잠겨 있다. 방어적으로 한 번 더 막는다
    if (!window.confirm(`"${category.name}" 카테고리를 삭제합니다. 되돌릴 수 없습니다.`)) return;

    setBusy('삭제 중…');
    setError(null);
    try {
      await deleteCategory(category.slug);
      await revalidateTaxonomy();
      await load();
      if (editing?.slug === category.slug) setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제에 실패했습니다.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-shell px-5 py-8 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">카테고리</h1>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-ink-dim">
            글의 성격을 나누는 축입니다. 다루는 기술 이름은 카테고리가 아니라 태그로 붙이세요 —
            <span className="font-mono"> 테스트</span>는 카테고리,
            <span className="font-mono"> Jest</span>는 태그입니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin" className={btnSecondary}>
            글 관리
          </Link>
          <button type="button" className={btnPrimary} onClick={startCreate}>
            새 카테고리
          </button>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-6 rounded-lg border border-line px-3.5 py-3 text-sm"
          style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger-fg)' }}
        >
          {error}
        </p>
      )}

      {editing && (
        <Panel
          title={editing.slug ? `수정 — ${editing.slug}` : '새 카테고리'}
          className="mt-6"
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-4">
              <Field htmlFor="c-name" label="이름">
                <input
                  id="c-name"
                  className={fieldClass}
                  value={editing.draft.name}
                  placeholder="테스트"
                  onChange={(e) => {
                    patch({ name: e.target.value });
                    // 새로 만드는 중이고 slug 를 아직 손대지 않았으면 이름에서 따라간다
                    if (!editing.slug) setSlugInput((prev) => (prev ? prev : ''));
                  }}
                />
              </Field>

              <Field
                htmlFor="c-slug"
                label="slug"
                hint={
                  editing.slug
                    ? '만든 뒤에는 바꾸지 않습니다 — 발행된 주소와 글의 참조가 함께 끊깁니다.'
                    : `주소가 됩니다 — /categories/${slugify(slugInput || editing.draft.name) || '…'}`
                }
              >
                <input
                  id="c-slug"
                  className={`${fieldClass} font-mono disabled:opacity-60`}
                  value={editing.slug ?? slugInput}
                  disabled={Boolean(editing.slug)}
                  placeholder={slugify(editing.draft.name) || 'testing'}
                  onChange={(e) => setSlugInput(e.target.value)}
                />
              </Field>

              <Field
                htmlFor="c-hint"
                label="한 줄 설명"
                hint="사이드바 툴팁과 카테고리 페이지 부제에 쓰입니다"
              >
                <input
                  id="c-hint"
                  className={fieldClass}
                  value={editing.draft.hint}
                  placeholder="단위 · E2E · 회귀"
                  onChange={(e) => patch({ hint: e.target.value })}
                />
              </Field>

              <Field
                htmlFor="c-order"
                label="정렬 순서"
                hint="작을수록 사이드바 위쪽. 같으면 이름 가나다순입니다."
              >
                <input
                  id="c-order"
                  type="number"
                  className={`${fieldClass} w-28 tabular-nums`}
                  value={editing.draft.order}
                  onChange={(e) => patch({ order: Number(e.target.value) || 0 })}
                />
              </Field>
            </div>

            <div>
              <p className={labelClass}>색</p>
              <p className={hintClass}>
                12개 슬롯 모두 라이트 · 다크 2벌과 대비 4.5:1 이 미리 맞춰져 있습니다.
              </p>
              <div className="mt-2 grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                {PALETTE.map((slot) => {
                  const takenBy = usedPalettes.get(slot.id);
                  return (
                    <label
                      key={slot.id}
                      className="cursor-pointer"
                      title={takenBy ? `이미 "${takenBy}" 가 쓰는 색` : slot.name}
                    >
                      <input
                        type="radio"
                        name="palette"
                        value={slot.id}
                        checked={editing.draft.palette === slot.id}
                        onChange={() => patch({ palette: slot.id as PaletteId })}
                        className="peer sr-only"
                      />
                      <span className="flex flex-col items-center gap-1 rounded-lg border border-line bg-bg px-1.5 py-2 transition-colors hover:border-ink-dim peer-checked:border-ink peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[color:var(--text)]">
                        <span
                          aria-hidden
                          className="flex h-6 w-full items-center justify-center rounded text-[10px] font-bold"
                          style={{
                            backgroundColor: `var(--pal-${slot.id}-bg)`,
                            color: `var(--pal-${slot.id}-fg)`,
                          }}
                        >
                          가
                        </span>
                        <span className="truncate text-[10px] text-ink-dim">
                          {slot.name}
                          {takenBy && ' ·'}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>

              <div className="mt-4 rounded-lg border border-line bg-bg p-4">
                <p className={labelClass}>미리보기</p>
                <div className="mt-2 flex items-center gap-2.5">
                  <CategoryBadge
                    slug={slugify(slugInput || editing.draft.name) || 'preview'}
                    category={{
                      name: editing.draft.name || '이름',
                      palette: editing.draft.palette,
                    }}
                    size="sm"
                  />
                  <span className="flex items-center gap-2 text-sm">
                    <span
                      aria-hidden
                      className="size-2 rounded-full"
                      style={{ backgroundColor: `var(--pal-${editing.draft.palette}-fg)` }}
                    />
                    {editing.draft.name || '이름'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2 border-t border-line pt-4">
            <button
              type="button"
              className={btnPrimary}
              disabled={Boolean(busy)}
              onClick={() => void save()}
            >
              {editing.slug ? '저장' : '만들기'}
            </button>
            <button
              type="button"
              className={btnQuiet}
              disabled={Boolean(busy)}
              onClick={() => setEditing(null)}
            >
              취소
            </button>
            {busy && <span className="text-xs text-ink-dim">{busy}</span>}
          </div>
        </Panel>
      )}

      {!categories && !error && (
        <p className="mt-8 text-sm text-ink-dim">불러오는 중…</p>
      )}

      {categories && (
        <ul className="mt-8 space-y-2">
          {categories.map((c) => {
            const count = counts.get(c.slug) ?? 0;
            return (
              <li key={c.slug} className="rounded-xl border border-line p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <CategoryBadge slug={c.slug} category={c} size="sm" />
                  <span className="font-mono text-[11px] text-ink-dim">/{c.slug}</span>
                  <span className="text-xs text-ink-dim">글 {count}개</span>
                  <div className="ml-auto flex items-center gap-3 text-xs font-medium">
                    <button
                      type="button"
                      className="hover:underline"
                      onClick={() => startEdit(c)}
                    >
                      수정
                    </button>
                    {/* 글이 있으면 삭제를 잠근다 — 지우면 그 글들이 존재하지 않는
                        카테고리를 가리키게 되고, 사이드바에서 사라져 찾을 수 없다 */}
                    <button
                      type="button"
                      className="text-ink-dim enabled:hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={count > 0 || Boolean(busy)}
                      title={count > 0 ? `글 ${count}편을 먼저 다른 카테고리로 옮기세요` : undefined}
                      onClick={() => void remove(c)}
                    >
                      삭제
                    </button>
                  </div>
                </div>
                {c.hint && <p className="mt-2 text-xs text-ink-dim">{c.hint}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
