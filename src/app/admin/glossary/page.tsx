'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import {
  Field,
  Panel,
  btnPrimary,
  btnQuiet,
  btnSecondary,
  fieldClass,
  hintClass,
} from '@/components/admin/ui';
import {
  createGlossaryTerm,
  deleteGlossaryTerm,
  isGlossarySlugTaken,
  listGlossary,
  updateGlossaryTerm,
} from '@/lib/glossary.client';
import { revalidateGlossary } from '@/lib/posts.client';
import { toAsciiSlug } from '@/lib/slug';
import type { GlossaryDraft, GlossaryTerm } from '@/types/glossary';

/** 편집 중인 대상 — 새로 만드는 중이면 null slug */
type Editing = { slug: string | null; draft: GlossaryDraft };

const EMPTY: GlossaryDraft = { term: '', aliases: [], definition: '', postSlug: '' };

/**
 * 용어 사전 관리.
 *
 * 카테고리 관리 화면과 같은 규약을 따른다 — 문서 ID 가 곧 slug 이고, 만들 때
 * 한 번만 정하며 이후 바꾸지 않는다. 다른 점은 여기서 slug 이 URL 이 아니라
 * **앵커**라는 것뿐이다(`/glossary#{slug}`). 바꾸면 이미 발행된 글 본문의
 * 자동 링크가 전부 빈 앵커로 떨어진다.
 */
export default function AdminGlossaryPage() {
  const [terms, setTerms] = useState<GlossaryTerm[] | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [slugInput, setSlugInput] = useState('');
  /** slug 을 손댔는지 — 손댄 뒤에는 표제어를 고쳐도 따라오지 않는다 (PostEditor 와 같은 규칙) */
  const [slugTouched, setSlugTouched] = useState(false);
  /** 별칭은 쉼표로 끊어 입력받는다 — 배열 상태로 두면 입력 도중 커서가 튄다 */
  const [aliasInput, setAliasInput] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setTerms(await listGlossary());
  }, []);

  useEffect(() => {
    load().catch((err: unknown) =>
      setError(err instanceof Error ? err.message : '목록을 불러오지 못했습니다.'),
    );
  }, [load]);

  function startCreate() {
    setError(null);
    setSlugInput('');
    setSlugTouched(false);
    setAliasInput('');
    setEditing({ slug: null, draft: { ...EMPTY } });
  }

  function startEdit(term: GlossaryTerm) {
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
      },
    });
  }

  function patch(next: Partial<GlossaryDraft>) {
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
    const definition = editing.draft.definition.trim();
    if (!term) {
      setError('표제어를 입력하세요.');
      return;
    }
    if (!definition) {
      setError('정의를 입력하세요. 사전 항목은 정의가 본체입니다.');
      return;
    }

    // slug 는 만들 때 한 번만 정한다 — 바꾸면 발행된 글 본문의 용어 링크가 끊긴다
    const slug = editing.slug ?? toAsciiSlug(slugInput || term);
    if (!slug) {
      setError('slug 을 만들 수 없습니다. 영문·숫자·한글이 포함된 표제어를 쓰세요.');
      return;
    }

    // 쉼표로 끊고 빈 조각을 버린다. 빈 별칭이 남으면 자동 링크 정규식이 빈 대안을
    // 갖게 되어 본문의 모든 위치에 매칭된다 (lib/glossary.ts 의 buildGlossaryIndex).
    const aliases = [
      ...new Set(
        aliasInput
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean),
      ),
    ];

    setBusy('저장 중…');
    setError(null);
    try {
      const payload: GlossaryDraft = {
        term,
        aliases,
        definition,
        postSlug: editing.draft.postSlug.trim(),
      };

      if (editing.slug) {
        await updateGlossaryTerm(editing.slug, payload);
      } else {
        if (await isGlossarySlugTaken(slug)) {
          setError(`slug "${slug}" 는 이미 사용 중입니다.`);
          return;
        }
        await createGlossaryTerm(slug, payload);
      }

      // 표제어·별칭 어느 것이 바뀌어도 글 본문의 자동 링크가 낡는다
      await revalidateGlossary();
      await load();
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setBusy(null);
    }
  }

  async function remove(target: GlossaryTerm) {
    if (!window.confirm(`"${target.term}" 용어를 삭제합니다. 되돌릴 수 없습니다.`)) return;

    setBusy('삭제 중…');
    setError(null);
    try {
      await deleteGlossaryTerm(target.slug);
      await revalidateGlossary();
      await load();
      if (editing?.slug === target.slug) setEditing(null);
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
            여기 등록한 표기가 글 본문에 나오면 사전으로 자동 링크됩니다 (글 한 편당 첫
            등장 한 번).
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link href="/glossary" target="_blank" rel="noreferrer" className={btnQuiet}>
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
                  : `앵커 주소 — /glossary#${slugInput || '…'}`
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
              htmlFor="g-aliases"
              label="별칭"
              hint="쉼표로 구분. 본문에서 이 표기들도 같은 용어로 인식합니다 (예: RSC, React Server Component)"
            >
              <input
                id="g-aliases"
                className={fieldClass}
                value={aliasInput}
                onChange={(e) => setAliasInput(e.target.value)}
              />
            </Field>

            <Field htmlFor="g-definition" label="정의">
              <textarea
                id="g-definition"
                rows={3}
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
          <p className={hintClass}>
            아직 없습니다. 글에서 반복해 설명하게 되는 낱말부터 넣으세요.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {terms.map((item) => (
              <li key={item.slug} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="text-sm font-bold tracking-tight">{item.term}</span>
                    <code className="text-[11px] text-ink-dim">{item.slug}</code>
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
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
