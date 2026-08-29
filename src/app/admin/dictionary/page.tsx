'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  Field,
  Panel,
  Select,
  btnPrimary,
  btnQuiet,
  btnSecondary,
  fieldClass,
  hintClass,
  labelClass,
} from '@/components/admin/ui';
import {
  DICTIONARY_LIMITS,
  UNCATEGORIZED_LABEL,
  dictionaryDraftError,
  findDictionaryCategory,
  parseAliases,
} from '@/lib/dictionary';
import {
  createDictionaryCategory,
  createDictionaryTerm,
  deleteDictionaryCategory,
  deleteDictionaryTerm,
  isDictionaryCategorySlugTaken,
  isDictionarySlugTaken,
  listDictionary,
  listDictionaryCategories,
  updateDictionaryCategory,
  updateDictionaryTerm,
} from '@/lib/dictionary.client';
import { PALETTE, type PaletteId } from '@/lib/palette';
import { revalidateDictionary } from '@/lib/posts.client';
import { toAsciiSlug } from '@/lib/slug';
import type {
  DictionaryCategory,
  DictionaryCategoryDraft,
  DictionaryDraft,
  DictionaryTerm,
} from '@/types/dictionary';

/** 편집 중인 대상 — 새로 만드는 중이면 null slug */
interface Editing {
  slug: string | null;
  draft: DictionaryDraft;
}

/** 분류 편집 — 용어와 같은 규약(slug 는 만들 때 한 번) */
interface EditingCategory {
  slug: string | null;
  draft: DictionaryCategoryDraft;
}

const EMPTY: DictionaryDraft = {
  term: '',
  aliases: [],
  definition: '',
  postSlug: '',
  category: '',
};

const EMPTY_CATEGORY: DictionaryCategoryDraft = {
  name: '',
  palette: 'slate',
  order: 0,
};

/**
 * 용어 사전 관리.
 *
 * 카테고리 관리 화면과 같은 규약을 따른다 — 문서 ID 가 곧 slug 이고, 만들 때
 * 한 번만 정하며 이후 바꾸지 않는다. 다른 점은 여기서 slug 이 URL 이 아니라
 * **앵커**라는 것뿐이다(`/dictionary#{slug}`). 바꾸면 이미 발행된 글 본문의
 * 자동 링크가 전부 빈 앵커로 떨어진다.
 *
 * 용어 분류는 글 카테고리(`/admin/categories`)와 **별개 체계**라 여기서 함께 관리한다.
 * 사전을 보는 사람과 분류를 정하는 사람이 같고, 용어를 등록하는 자리에서 분류가
 * 비어 있으면 바로 만들 수 있어야 한다.
 */
export default function AdminDictionaryPage() {
  const [terms, setTerms] = useState<DictionaryTerm[] | null>(null);
  const [categories, setCategories] = useState<DictionaryCategory[]>([]);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [editingCategory, setEditingCategory] = useState<EditingCategory | null>(null);
  const [slugInput, setSlugInput] = useState('');
  const [categorySlugInput, setCategorySlugInput] = useState('');
  /** slug 을 손댔는지 — 손댄 뒤에는 표제어를 고쳐도 따라오지 않는다 (PostEditor 와 같은 규칙) */
  const [slugTouched, setSlugTouched] = useState(false);
  const [categorySlugTouched, setCategorySlugTouched] = useState(false);
  /** 별칭은 쉼표로 끊어 입력받는다 — 배열 상태로 두면 입력 도중 커서가 튄다 */
  const [aliasInput, setAliasInput] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [foundTerms, foundCategories] = await Promise.all([
      listDictionary(),
      listDictionaryCategories(),
    ]);
    setTerms(foundTerms);
    setCategories(foundCategories);
  }, []);

  useEffect(() => {
    load().catch((err: unknown) =>
      setError(err instanceof Error ? err.message : '목록을 불러오지 못했습니다.'),
    );
  }, [load]);

  /** 분류별 용어 수 — 삭제를 막을 근거이자 목록의 길잡이 */
  const countByCategory = useMemo(() => {
    const counts = new Map<string, number>();
    for (const term of terms ?? []) {
      counts.set(term.category, (counts.get(term.category) ?? 0) + 1);
    }
    return counts;
  }, [terms]);

  function startCreate() {
    setError(null);
    setSlugInput('');
    setSlugTouched(false);
    setAliasInput('');
    // 분류는 비워 둔다. 첫 항목을 기본값으로 넣으면 사람이 고른 적 없는 분류가
    // 고른 것처럼 저장된다 — 그렇게 들어간 값은 나중에 진짜 분류와 구분되지 않는다.
    setEditing({ slug: null, draft: { ...EMPTY } });
  }

  function startEdit(term: DictionaryTerm) {
    setError(null);
    setSlugInput(term.slug);
    setSlugTouched(true);
    setAliasInput(term.aliases.join(', '));
    setEditing({
      slug: term.slug,
      draft: {
        term: term.term,
        aliases: term.aliases,
        definition: term.definition,
        postSlug: term.postSlug,
        category: term.category,
      },
    });
  }

  function patch(next: Partial<DictionaryDraft>) {
    setEditing((prev) => (prev ? { ...prev, draft: { ...prev.draft, ...next } } : prev));
  }

  /** 표제어를 치면 slug 이 따라온다 — 한글 표제어는 로마자로 (lib/slug.ts) */
  function onTermChange(next: string) {
    patch({ term: next });
    if (!slugTouched) setSlugInput(toAsciiSlug(next));
  }

  async function save() {
    if (!editing) return;
    const term = editing.draft.term.trim();

    // slug 는 만들 때 한 번만 정한다 — 바꾸면 발행된 글 본문의 용어 링크가 끊긴다
    const slug = editing.slug ?? toAsciiSlug(slugInput || term);

    // 쉼표로 끊고 빈 조각을 버린다 (규칙은 lib/dictionary.ts 의 parseAliases 한 곳)
    const aliases = parseAliases(aliasInput);

    // firestore.rules 의 validDictionaryTerm 과 같은 기준. 발행 확인 화면도 같은 함수를
    // 쓰므로, 한 화면에서 저장되는 값이 다른 화면에서 규칙에 막히는 일이 없다.
    const invalid = dictionaryDraftError({
      term: editing.draft.term,
      definition: editing.draft.definition,
      aliases,
      postSlug: editing.draft.postSlug,
    });
    if (invalid) {
      setError(invalid);
      return;
    }
    if (!slug) {
      setError('slug 을 만들 수 없습니다. 영문·숫자·한글이 포함된 표제어를 쓰세요.');
      return;
    }

    setBusy('저장 중…');
    setError(null);

    const payload: DictionaryDraft = {
      term,
      aliases,
      definition: editing.draft.definition.trim(),
      postSlug: editing.draft.postSlug.trim(),
      category: editing.draft.category,
    };

    // 쓰기와 재검증을 분리한다. 한 try 로 묶으면 **쓰기는 성공했는데 재검증이 실패**했을 때
    // 폼이 열린 채 에러만 떠서 사람이 "저장 실패"로 읽고 다시 누르는데, 그때는
    // "이미 사용 중"이 뜬다 — 두 번 다 성공/차단이었는데 문구는 둘 다 실패를 가리킨다.
    try {
      if (editing.slug) {
        await updateDictionaryTerm(editing.slug, payload);
      } else {
        if (await isDictionarySlugTaken(slug)) {
          setError(`slug "${slug}" 는 이미 사용 중입니다.`);
          setBusy(null);
          return;
        }
        await createDictionaryTerm(slug, payload);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.');
      setBusy(null);
      return;
    }

    // 여기부터는 저장이 끝난 뒤다 — 폼을 닫고 목록을 새로 읽는다.
    // 표제어·별칭 어느 것이 바뀌어도 글 본문의 자동 링크가 낡으므로 재검증을 부른다.
    setEditing(null);
    try {
      await revalidateDictionary();
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      setError(
        `저장은 됐지만 목록 갱신에 실패했습니다${message ? ` — ${message}` : ''}. 새로고침하세요.`,
      );
    } finally {
      setBusy(null);
    }
  }

  async function remove(target: DictionaryTerm) {
    if (!window.confirm(`"${target.term}" 용어를 삭제합니다. 되돌릴 수 없습니다.`)) return;

    setBusy('삭제 중…');
    setError(null);
    try {
      await deleteDictionaryTerm(target.slug);
      await revalidateDictionary();
      await load();
      if (editing?.slug === target.slug) setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제에 실패했습니다.');
    } finally {
      setBusy(null);
    }
  }

  /* ── 분류 ── */

  function startCreateCategory() {
    setError(null);
    setCategorySlugInput('');
    setCategorySlugTouched(false);
    // 순서는 목록 끝에 놓는다 — 새로 만든 분류가 맨 앞에 끼어들 이유가 없다
    setEditingCategory({
      slug: null,
      draft: { ...EMPTY_CATEGORY, order: categories.length },
    });
  }

  function startEditCategory(category: DictionaryCategory) {
    setError(null);
    setCategorySlugInput(category.slug);
    setCategorySlugTouched(true);
    setEditingCategory({
      slug: category.slug,
      draft: {
        name: category.name,
        palette: category.palette,
        order: category.order,
      },
    });
  }

  function patchCategory(next: Partial<DictionaryCategoryDraft>) {
    setEditingCategory((prev) => (prev ? { ...prev, draft: { ...prev.draft, ...next } } : prev));
  }

  async function saveCategory() {
    if (!editingCategory) return;
    const name = editingCategory.draft.name.trim();
    if (!name) {
      setError('분류 이름을 입력하세요.');
      return;
    }
    if (name.length >= DICTIONARY_LIMITS.categoryName) {
      setError(
        `분류 이름은 ${DICTIONARY_LIMITS.categoryName}자 미만이어야 합니다 (현재 ${name.length}자).`,
      );
      return;
    }

    const slug = editingCategory.slug ?? toAsciiSlug(categorySlugInput || name);
    if (!slug) {
      setError('분류 slug 을 만들 수 없습니다. 직접 입력하세요.');
      return;
    }
    // 한글 이름은 로마자로 3~4배 늘어난다. 이름이 규칙(60자)을 통과해도 slug 이 100자를
    // 넘을 수 있고, 그러면 이 분류를 지정한 **용어 저장**이 규칙의 category 상한에 걸려
    // permissions 원문 에러만 뜬다 — 원인이 분류 쪽에 있는데 용어 화면에서 막힌다.
    // 수정 모드의 slug 은 이미 고정돼 있고 입력란도 잠겨 있다 — 거기서 막으면
    // 이름·색조차 못 고치고 삭제 외에 빠져나갈 길이 없다. 새로 만들 때만 본다.
    if (!editingCategory.slug && slug.length >= DICTIONARY_LIMITS.category) {
      setError(
        `분류 slug 은 ${DICTIONARY_LIMITS.category}자 미만이어야 합니다 (현재 ${slug.length}자). 짧게 직접 입력하세요.`,
      );
      return;
    }

    setBusy('저장 중…');
    setError(null);

    const payload: DictionaryCategoryDraft = { ...editingCategory.draft, name };

    // 용어 저장(save)과 같은 이유로 쓰기와 재검증을 나눈다 — 한 try 로 묶으면
    // 저장은 됐는데 재검증이 실패했을 때 폼이 열린 채 남아, 다시 누르면
    // "이미 사용 중"이 뜬다.
    try {
      if (editingCategory.slug) {
        await updateDictionaryCategory(editingCategory.slug, payload);
      } else {
        if (await isDictionaryCategorySlugTaken(slug)) {
          setError(`분류 slug "${slug}" 는 이미 사용 중입니다.`);
          setBusy(null);
          return;
        }
        await createDictionaryCategory(slug, payload);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.');
      setBusy(null);
      return;
    }

    setEditingCategory(null);
    try {
      // 사전 페이지의 필터 줄이 이 목록을 그린다
      await revalidateDictionary();
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      setError(
        `저장은 됐지만 목록 갱신에 실패했습니다${message ? ` — ${message}` : ''}. 새로고침하세요.`,
      );
    } finally {
      setBusy(null);
    }
  }

  async function removeCategory(target: DictionaryCategory) {
    // 소속 용어가 남은 분류는 화면이 막는다 — 보안 규칙은 집계 질의를 할 수 없어
    // 규칙에서 확인할 수단이 없다 (카테고리 삭제와 같은 판단).
    const count = countByCategory.get(target.slug) ?? 0;
    if (count > 0) {
      setError(`"${target.name}" 에 용어 ${count}개가 남아 있습니다. 먼저 다른 분류로 옮기세요.`);
      return;
    }
    if (!window.confirm(`"${target.name}" 분류를 삭제합니다. 되돌릴 수 없습니다.`)) return;

    setBusy('삭제 중…');
    setError(null);
    try {
      await deleteDictionaryCategory(target.slug);
      await revalidateDictionary();
      await load();
      if (editingCategory?.slug === target.slug) setEditingCategory(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제에 실패했습니다.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-5 py-8">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">용어 사전</h1>
          <p className={`mt-1 ${hintClass}`}>
            여기 등록한 표기가 글 본문에 나오면 사전으로 자동 링크됩니다 (글 한 편당 첫 등장 한 번).
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {/* 분류 관리는 이 페이지 아래쪽 패널이다. 용어를 등록하다 분류가 없으면 그 자리에서
              바로 만들 수 있도록 한 화면에 뒀는데, 그러면 용어 목록에 묻혀 안 보인다.
              위에서 내려가는 길을 하나 둔다 (글 카테고리는 자기 페이지가 있어 이 문제가 없다) */}
          <a href="#dictionary-categories" className={btnQuiet}>
            분류 관리 <span className="tabular-nums opacity-70">{categories.length}</span>
          </a>
          <Link href="/dictionary" target="_blank" rel="noreferrer" className={btnQuiet}>
            사전 보기 ↗
          </Link>
          <button type="button" className={btnPrimary} onClick={startCreate} disabled={!!busy}>
            새 용어
          </button>
        </div>
      </header>

      {error && (
        <p className="rounded-lg bg-danger-bg px-3.5 py-2.5 text-sm text-danger-fg">{error}</p>
      )}
      {busy && <p className={hintClass}>{busy}</p>}

      {editing && (
        <Panel
          title={editing.slug ? `용어 수정 — ${editing.slug}` : '새 용어'}
          hint="정의는 평문 한두 문장으로. 길게 설명할 내용이면 글을 쓰고 아래에서 이으세요."
        >
          <div className="space-y-4">
            <Field htmlFor="g-term" label="표제어">
              <input
                id="g-term"
                className={fieldClass}
                maxLength={DICTIONARY_LIMITS.term - 1}
                value={editing.draft.term}
                onChange={(e) => onTermChange(e.target.value)}
              />
            </Field>

            <Field
              htmlFor="g-slug"
              label="slug"
              hint={
                editing.slug
                  ? '만들 때 정해진 값입니다 — 바꾸면 이미 발행된 글의 용어 링크가 끊깁니다.'
                  : `앵커 주소 — /dictionary#${slugInput || '…'}`
              }
            >
              <input
                id="g-slug"
                className={`${fieldClass} font-mono`}
                value={slugInput}
                disabled={!!editing.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlugInput(e.target.value);
                }}
              />
            </Field>

            <Field
              htmlFor="g-category"
              label="분류"
              hint="선택 사항 — 비워 두면 '분류 없음'으로 저장되고, 나중에 여기서 지정할 수 있습니다. 사전 페이지의 필터 축이며 글 카테고리와는 별개예요."
            >
              <Select
                id="g-category"
                value={editing.draft.category}
                onChange={(next) => patch({ category: next })}
              >
                <option value="">분류 없음</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
                {/* 목록에 없는 분류를 가리키던 기존 용어. 고르지 않은 것처럼 보이면
                    사용자가 이유를 모른 채 저장이 막히므로 값 자체를 남겨 보여준다 */}
                {editing.draft.category &&
                  !findDictionaryCategory(categories, editing.draft.category) && (
                    <option value={editing.draft.category}>
                      {editing.draft.category} (목록에 없는 분류)
                    </option>
                  )}
              </Select>
            </Field>

            <Field
              htmlFor="g-aliases"
              label="별칭"
              hint={`쉼표로 구분, 최대 ${DICTIONARY_LIMITS.aliases}개. 본문에서 이 표기들도 같은 용어로 인식합니다 (예: RSC, React Server Component)`}
            >
              <input
                id="g-aliases"
                className={fieldClass}
                value={aliasInput}
                onChange={(e) => setAliasInput(e.target.value)}
              />
            </Field>

            <Field
              htmlFor="g-definition"
              label="정의"
              hint={`${editing.draft.definition.length} / ${DICTIONARY_LIMITS.definition - 1}자`}
            >
              <textarea
                id="g-definition"
                rows={3}
                maxLength={DICTIONARY_LIMITS.definition - 1}
                className={fieldClass}
                value={editing.draft.definition}
                onChange={(e) => patch({ definition: e.target.value })}
              />
            </Field>

            <Field
              htmlFor="g-post"
              label="자세히 다룬 글 slug"
              hint="선택 — 비우면 '자세히' 링크가 없습니다. 이 블로그의 글 slug 만 넣으세요."
            >
              <input
                id="g-post"
                className={`${fieldClass} font-mono`}
                maxLength={DICTIONARY_LIMITS.postSlug - 1}
                value={editing.draft.postSlug}
                onChange={(e) => patch({ postSlug: e.target.value })}
              />
            </Field>

            <div className="flex gap-2">
              <button
                type="button"
                className={btnPrimary}
                onClick={() => void save()}
                disabled={!!busy}
              >
                저장
              </button>
              <button
                type="button"
                className={btnSecondary}
                onClick={() => setEditing(null)}
                disabled={!!busy}
              >
                취소
              </button>
            </div>
          </div>
        </Panel>
      )}

      <Panel title={`등록된 용어 ${terms?.length ?? 0}개`}>
        {terms === null ? (
          <p className={hintClass}>불러오는 중…</p>
        ) : terms.length === 0 ? (
          <p className={hintClass}>아직 없습니다. 글에서 반복해 설명하게 되는 낱말부터 넣으세요.</p>
        ) : (
          <ul className="divide-y divide-line">
            {terms.map((item) => {
              const category = findDictionaryCategory(categories, item.category);
              return (
                <li key={item.slug} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="text-sm font-bold tracking-tight">{item.term}</span>
                      <code className="text-[11px] text-ink-dim">{item.slug}</code>
                      <span
                        className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                        style={
                          category
                            ? {
                                backgroundColor: `var(--pal-${category.palette}-bg)`,
                                color: `var(--pal-${category.palette}-fg)`,
                              }
                            : undefined
                        }
                      >
                        {category?.name ?? UNCATEGORIZED_LABEL}
                      </span>
                      {item.aliases.length > 0 && (
                        <span className="text-[11px] text-ink-dim">{item.aliases.join(' · ')}</span>
                      )}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-ink-dim">{item.definition}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      className={btnQuiet}
                      onClick={() => startEdit(item)}
                      disabled={!!busy}
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      className={btnQuiet}
                      onClick={() => void remove(item)}
                      disabled={!!busy}
                    >
                      삭제
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {/* ── 용어 분류 ── */}
      {/* 위 헤더의 '분류 관리'가 여기로 내려온다. scroll-mt 는 관리자 띠(AdminBar) 높이만큼 */}
      <section id="dictionary-categories" className="scroll-mt-6">
        <Panel
          title={`용어 분류 ${categories.length}개`}
          hint="사전 페이지의 필터 축입니다. 글 카테고리(/admin/categories)와는 다른 체계예요 — 글은 '무엇에 대해 썼는가'로, 용어는 '무엇에 속한 낱말인가'로 나뉩니다."
        >
          <div className="space-y-4">
            {categories.length === 0 ? (
              <p className={hintClass}>
                아직 없습니다. 분류 없이도 용어는 등록되며(&lsquo;분류 없음&rsquo;), 나중에 여기서
                만들어 지정할 수 있습니다.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {categories.map((c) => (
                  <li key={c.slug} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                      style={{
                        backgroundColor: `var(--pal-${c.palette}-bg)`,
                        color: `var(--pal-${c.palette}-fg)`,
                      }}
                    >
                      {c.name}
                    </span>
                    <code className="text-[11px] text-ink-dim">{c.slug}</code>
                    <span className="text-[11px] text-ink-dim">
                      용어 {countByCategory.get(c.slug) ?? 0}개
                    </span>
                    <div className="ml-auto flex shrink-0 gap-1">
                      <button
                        type="button"
                        className={btnQuiet}
                        onClick={() => startEditCategory(c)}
                        disabled={!!busy}
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        className={btnQuiet}
                        onClick={() => void removeCategory(c)}
                        disabled={!!busy}
                      >
                        삭제
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {editingCategory ? (
              <div className="space-y-4 rounded-lg border border-line bg-bg p-4">
                <Field htmlFor="gc-name" label="이름">
                  <input
                    id="gc-name"
                    className={fieldClass}
                    maxLength={DICTIONARY_LIMITS.categoryName - 1}
                    value={editingCategory.draft.name}
                    onChange={(e) => {
                      patchCategory({ name: e.target.value });
                      if (!categorySlugTouched) setCategorySlugInput(toAsciiSlug(e.target.value));
                    }}
                  />
                </Field>

                <Field
                  htmlFor="gc-slug"
                  label="slug"
                  hint={
                    editingCategory.slug
                      ? '만들 때 정해진 값입니다 — 바꾸면 이 분류를 쓰던 용어가 전부 미분류로 떨어집니다.'
                      : '용어가 이 값을 가리킵니다.'
                  }
                >
                  <input
                    id="gc-slug"
                    className={`${fieldClass} font-mono`}
                    value={categorySlugInput}
                    disabled={!!editingCategory.slug}
                    onChange={(e) => {
                      setCategorySlugTouched(true);
                      setCategorySlugInput(e.target.value);
                    }}
                  />
                </Field>

                <div>
                  <p className={labelClass}>색</p>
                  <p className={hintClass}>
                    팔레트 슬롯 12개 중 하나 — 라이트·다크 두 벌이 이미 짝지어져 있습니다.
                  </p>
                  <div className="mt-2 grid grid-cols-6 gap-1.5">
                    {PALETTE.map((slot) => (
                      <label key={slot.id} className="cursor-pointer">
                        <input
                          type="radio"
                          name="dictionary-palette"
                          value={slot.id}
                          checked={editingCategory.draft.palette === slot.id}
                          onChange={() => patchCategory({ palette: slot.id as PaletteId })}
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
                          <span className="truncate text-[10px] text-ink-dim">{slot.name}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <Field htmlFor="gc-order" label="순서" hint="작을수록 필터 줄의 앞쪽">
                  <input
                    id="gc-order"
                    type="number"
                    className={fieldClass}
                    value={editingCategory.draft.order}
                    onChange={(e) => patchCategory({ order: Number(e.target.value) || 0 })}
                  />
                </Field>

                <div className="flex gap-2">
                  <button
                    type="button"
                    className={btnPrimary}
                    onClick={() => void saveCategory()}
                    disabled={!!busy}
                  >
                    저장
                  </button>
                  <button
                    type="button"
                    className={btnSecondary}
                    onClick={() => setEditingCategory(null)}
                    disabled={!!busy}
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className={btnSecondary}
                onClick={startCreateCategory}
                disabled={!!busy}
              >
                새 분류
              </button>
            )}
          </div>
        </Panel>
      </section>
    </div>
  );
}
