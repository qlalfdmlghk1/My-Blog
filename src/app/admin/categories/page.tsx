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
  createSubcategory,
  deleteCategory,
  deleteSubcategory,
  isCategorySlugTaken,
  isSubcategorySlugTaken,
  listCategories,
  listSubcategories,
  updateCategory,
  updateSubcategory,
} from '@/lib/categories.client';
import { PALETTE, type PaletteId } from '@/lib/palette';
import { listAllPosts, revalidateTaxonomy } from '@/lib/posts.client';
import { slugify } from '@/lib/slug';
import type {
  Category,
  CategoryDraft,
  Subcategory,
  SubcategoryDraft,
} from '@/types/category';

/** 편집 중인 대상 — 새로 만드는 중이면 null slug */
type Editing = { slug: string | null; draft: CategoryDraft };

/** 소분류 편집 — category 는 항상 고정, slug 이 null 이면 새로 만드는 중 */
type EditingSub = { category: string; slug: string | null; draft: SubcategoryDraft };

const EMPTY: CategoryDraft = { name: '', hint: '', palette: 'slate', order: 0 };

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  /** slug → 글 수 (초안 포함). 삭제 가능 여부의 근거다 */
  const [counts, setCounts] = useState<Map<string, number>>(new Map());
  /** "카테고리/소분류" → 글 수. 소분류 slug 은 카테고리 안에서만 유일하다 */
  const [subCounts, setSubCounts] = useState<Map<string, number>>(new Map());
  const [editingSub, setEditingSub] = useState<EditingSub | null>(null);
  const [subSlugInput, setSubSlugInput] = useState('');
  const [editing, setEditing] = useState<Editing | null>(null);
  const [slugInput, setSlugInput] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    // 글 수는 초안까지 세야 한다 — 초안이 참조 중인 카테고리를 지우면
    // 그 글은 발행하는 순간 존재하지 않는 카테고리를 가리키게 된다.
    const [found, subs, posts] = await Promise.all([
      listCategories(),
      listSubcategories(),
      listAllPosts(),
    ]);
    const tally = new Map<string, number>();
    const subTally = new Map<string, number>();
    for (const p of posts) {
      tally.set(p.category, (tally.get(p.category) ?? 0) + 1);
      if (p.subcategory) {
        const key = `${p.category}/${p.subcategory}`;
        subTally.set(key, (subTally.get(key) ?? 0) + 1);
      }
    }
    setCategories(found);
    setSubcategories(subs);
    setCounts(tally);
    setSubCounts(subTally);
  }, []);

  useEffect(() => {
    load().catch((err: unknown) =>
      setError(err instanceof Error ? err.message : '목록을 불러오지 못했습니다.'),
    );
  }, [load]);

  /**
   * 존재하지 않는 카테고리를 참조하는 글.
   *
   * 카테고리를 코드에서 Firestore 로 옮기면서 생길 수 있는 상태다 — 예전 글이
   * 가리키던 slug 로 문서를 만들지 않으면 그 글은 어느 카테고리에도 안 잡히고
   * 사이드바에서 사라진다. 목록 화면에는 보이므로 눈치채기 어려워 여기서 알린다.
   */
  const orphans = useMemo(() => {
    if (!categories) return [];
    const known = new Set(categories.map((c) => c.slug));
    return [...counts.entries()]
      .filter(([slug]) => !known.has(slug))
      .sort((a, b) => b[1] - a[1]);
  }, [categories, counts]);

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
    // Firestore 는 문서를 지워도 하위 컬렉션을 지우지 않는다. 소분류를 남긴 채
    // 카테고리를 지우면 그 문서들이 고아로 남아 collectionGroup 조회에 계속 잡히고,
    // sitemap 과 프리렌더가 404 로만 열리는 주소를 광고한다. 관리 화면은 소분류를
    // 카테고리 카드 안에서만 그리므로 부모가 사라지면 화면에서 지울 수조차 없다.
    if (subsOf(category.slug).length > 0) return;
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

  const subsOf = (category: string) => subcategories.filter((s) => s.category === category);

  function startCreateSub(category: string) {
    setError(null);
    setSubSlugInput('');
    setEditingSub({
      category,
      slug: null,
      draft: { name: '', order: subsOf(category).length * 10 },
    });
  }

  function startEditSub(sub: Subcategory) {
    setError(null);
    setSubSlugInput(sub.slug);
    setEditingSub({
      category: sub.category,
      slug: sub.slug,
      draft: { name: sub.name, order: sub.order },
    });
  }

  async function saveSub() {
    if (!editingSub) return;
    const name = editingSub.draft.name.trim();
    if (!name) {
      setError('소분류 이름을 입력하세요.');
      return;
    }
    const slug = editingSub.slug ?? slugify(subSlugInput || name);
    if (!slug) {
      setError('소분류 slug 을 만들 수 없습니다.');
      return;
    }

    setBusy('저장 중…');
    setError(null);
    try {
      const payload: SubcategoryDraft = { ...editingSub.draft, name };
      if (editingSub.slug) {
        await updateSubcategory(editingSub.category, editingSub.slug, payload);
      } else {
        if (await isSubcategorySlugTaken(editingSub.category, slug)) {
          setError(`이 카테고리에 slug "${slug}" 가 이미 있습니다.`);
          return;
        }
        await createSubcategory(editingSub.category, slug, payload);
      }
      await revalidateTaxonomy();
      await load();
      setEditingSub(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setBusy(null);
    }
  }

  async function removeSub(sub: Subcategory) {
    // 글이 남은 소분류를 지우면 그 글들이 조용히 '분류 없음'으로 떨어진다.
    // 규칙은 이제 빈 소분류를 허용하므로 수정이 막히지는 않지만, 지운 사람이 모르는 사이
    // 글의 분류가 바뀌는 것은 여전하다 — 글을 먼저 옮기게 하고 여기서는 막는다.
    if ((subCounts.get(`${sub.category}/${sub.slug}`) ?? 0) > 0) return;
    if (!window.confirm(`소분류 "${sub.name}" 을(를) 삭제합니다. 되돌릴 수 없습니다.`)) return;

    setBusy('삭제 중…');
    setError(null);
    try {
      await deleteSubcategory(sub.category, sub.slug);
      await revalidateTaxonomy();
      await load();
      if (editingSub?.slug === sub.slug && editingSub.category === sub.category) {
        setEditingSub(null);
      }
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

      {orphans.length > 0 && (
        <div className="mt-6 rounded-xl border border-ink-dim p-4">
          <p className="text-sm font-bold">없는 카테고리를 가리키는 글이 있습니다</p>
          <p className={hintClass}>
            아래 slug 로 카테고리를 만들거나, 글을 열어 다른 카테고리로 바꾸세요. 그때까지 이
            글들은 사이드바 어디에도 잡히지 않습니다.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {orphans.map(([slug, count]) => (
              <li
                key={slug}
                className="rounded-full border border-line px-2.5 py-1 text-[11px]"
              >
                <span className="font-mono">{slug}</span>
                <span className="ml-1.5 text-ink-dim">글 {count}개</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!categories && !error && (
        <p className="mt-8 text-sm text-ink-dim">불러오는 중…</p>
      )}

      {categories?.length === 0 && !editing && (
        <div className="mt-8 rounded-xl border border-dashed border-line px-5 py-16 text-center">
          <p className="text-sm font-semibold">아직 카테고리가 없습니다</p>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-ink-dim">
            기본값은 없습니다 — 여기서 만드는 것이 전부입니다. 글의 성격을 나누는 축이므로
            서너 개로 시작해 글이 쌓이는 대로 늘리는 편이 낫습니다.
          </p>
          <button type="button" className={`${btnSecondary} mt-5`} onClick={startCreate}>
            첫 카테고리 만들기
          </button>
        </div>
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
                        카테고리를 가리키게 되고, 사이드바에서 사라져 찾을 수 없다.
                        소분류도 같은 이유로 막는다: 하위 컬렉션은 부모를 지워도 남아
                        고아가 되고, 여기서만 그려지므로 지울 방법이 사라진다 */}
                    <button
                      type="button"
                      className="text-ink-dim enabled:hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={count > 0 || subsOf(c.slug).length > 0 || Boolean(busy)}
                      title={
                        count > 0
                          ? `글 ${count}편을 먼저 다른 카테고리로 옮기세요`
                          : subsOf(c.slug).length > 0
                            ? `소분류 ${subsOf(c.slug).length}개를 먼저 지우세요`
                            : undefined
                      }
                      onClick={() => void remove(c)}
                    >
                      삭제
                    </button>
                  </div>
                </div>
                {c.hint && <p className="mt-2 text-xs text-ink-dim">{c.hint}</p>}

                {/* 소분류는 카테고리에 종속이라 카테고리 카드 안에서 관리한다 —
                    별도 화면으로 빼면 "이게 어느 카테고리 소분류였지"를 매번 확인해야 한다 */}
                <div className="mt-3 border-t border-line pt-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-ink-dim">
                      소분류
                    </p>
                    <button
                      type="button"
                      className="text-[11px] font-medium text-ink-dim hover:text-ink"
                      onClick={() => startCreateSub(c.slug)}
                    >
                      + 추가
                    </button>
                  </div>

                  {subsOf(c.slug).length === 0 ? (
                    <p className={hintClass}>
                      소분류가 없습니다. 이 카테고리의 글은 &lsquo;분류 없음&rsquo;으로 남습니다.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-1">
                      {subsOf(c.slug).map((s) => {
                        const used = subCounts.get(`${s.category}/${s.slug}`) ?? 0;
                        return (
                          <li
                            key={s.slug}
                            className="flex flex-wrap items-center gap-2.5 rounded-lg border border-line px-3 py-2"
                          >
                            <span className="text-sm">{s.name}</span>
                            <span className="font-mono text-[11px] text-ink-dim">/{s.slug}</span>
                            <span className="text-[11px] text-ink-dim">글 {used}개</span>
                            <div className="ml-auto flex items-center gap-3 text-[11px] font-medium">
                              <button
                                type="button"
                                className="hover:underline"
                                onClick={() => startEditSub(s)}
                              >
                                수정
                              </button>
                              <button
                                type="button"
                                className="text-ink-dim enabled:hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                                disabled={used > 0 || Boolean(busy)}
                                title={used > 0 ? `글 ${used}편을 먼저 옮기세요` : undefined}
                                onClick={() => void removeSub(s)}
                              >
                                삭제
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {editingSub?.category === c.slug && (
                    <div className="mt-2 rounded-lg border border-ink-dim p-3">
                      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_6rem]">
                        <Field htmlFor={`s-name-${c.slug}`} label="이름">
                          <input
                            id={`s-name-${c.slug}`}
                            className={fieldClass}
                            value={editingSub.draft.name}
                            placeholder="Next.js"
                            onChange={(e) =>
                              setEditingSub({
                                ...editingSub,
                                draft: { ...editingSub.draft, name: e.target.value },
                              })
                            }
                          />
                        </Field>
                        <Field htmlFor={`s-slug-${c.slug}`} label="slug">
                          <input
                            id={`s-slug-${c.slug}`}
                            className={`${fieldClass} font-mono disabled:opacity-60`}
                            value={editingSub.slug ?? subSlugInput}
                            disabled={Boolean(editingSub.slug)}
                            placeholder={slugify(editingSub.draft.name) || 'nextjs'}
                            onChange={(e) => setSubSlugInput(e.target.value)}
                          />
                        </Field>
                        <Field htmlFor={`s-order-${c.slug}`} label="순서">
                          <input
                            id={`s-order-${c.slug}`}
                            type="number"
                            className={`${fieldClass} tabular-nums`}
                            value={editingSub.draft.order}
                            onChange={(e) =>
                              setEditingSub({
                                ...editingSub,
                                draft: {
                                  ...editingSub.draft,
                                  order: Number(e.target.value) || 0,
                                },
                              })
                            }
                          />
                        </Field>
                      </div>
                      <p className={hintClass}>
                        주소 — /categories/{c.slug}/
                        {editingSub.slug ?? (slugify(subSlugInput || editingSub.draft.name) || '…')}
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          className={`${btnPrimary} px-3 py-1.5 text-xs`}
                          disabled={Boolean(busy)}
                          onClick={() => void saveSub()}
                        >
                          {editingSub.slug ? '저장' : '만들기'}
                        </button>
                        <button
                          type="button"
                          className={`${btnQuiet} px-3 py-1.5 text-xs`}
                          disabled={Boolean(busy)}
                          onClick={() => setEditingSub(null)}
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
