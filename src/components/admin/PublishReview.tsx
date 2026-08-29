'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import {
  Field,
  Panel,
  Select,
  StatusPill,
  btnPrimary,
  btnQuiet,
  btnSecondary,
  fieldClass,
  hintClass,
  labelClass,
} from '@/components/admin/ui';
import { DICTIONARY_LIMITS } from '@/lib/dictionary';
import {
  createDictionaryTerm,
  extractDictionaryTerms,
  isDictionarySlugTaken,
  listDictionaryCategories,
  type ExtractResult,
} from '@/lib/dictionary.client';
import { renderPreview } from '@/lib/markdown-preview';
import { revalidateDictionary, revalidatePost, updatePost } from '@/lib/posts.client';
import { toAsciiSlug } from '@/lib/slug';
import type { DictionaryCategory } from '@/types/dictionary';
import type { Post, PostDraft } from '@/types/post';

/**
 * 발행 전 확인 화면.
 *
 * 에디터 옆의 실시간 미리보기와 역할이 다르다. 저 쪽은 **쓰는 동안** 구조를 보는
 * 자리이고, 여기는 **내보내기 직전에** 한 번 멈춰 서는 자리다. 그 멈춤이 있어야
 * 용어 추출처럼 "글이 다 써진 뒤에야 할 수 있는 일"을 끼워 넣을 자리가 생긴다.
 *
 * 이 화면에 오는 시점에 글은 **이미 저장돼 있다** — 에디터가 저장을 마치고
 * 문서 ID 로 넘긴다. 그래서 여기서 이탈해도 쓴 내용이 사라지지 않는다.
 * 다만 **아직 발행은 아니다**(새 글이면 임시저장 상태). 발행은 아래 확정 버튼이 한다.
 */
export function PublishReview({ post }: { post: Post }) {
  const router = useRouter();

  const [categories, setCategories] = useState<DictionaryCategory[] | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [skipped, setSkipped] = useState<ExtractResult['skipped']>([]);
  const [truncated, setTruncated] = useState(false);
  /** 추출을 한 번이라도 돌렸는가 — 0건과 "아직 안 돌림"은 다른 상태다 */
  const [extracted, setExtracted] = useState(false);
  const [registered, setRegistered] = useState(0);

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const previewHtml = useMemo(() => renderPreview(post.content), [post.content]);

  useEffect(() => {
    let cancelled = false;
    listDictionaryCategories()
      .then((found) => {
        if (!cancelled) setCategories(found);
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : '용어 분류를 불러오지 못했습니다.'),
      );
    return () => {
      cancelled = true;
    };
  }, []);

  async function extract() {
    setBusy('용어를 뽑는 중…');
    setError(null);
    setNotice(null);
    try {
      const result = await extractDictionaryTerms(post.title, post.content);
      setCandidates(
        result.candidates.map((c, index) => ({
          id: index,
          selected: true,
          term: c.term,
          // 영어 원어 제안이 있으면 그것을 쓴다. 없을 때만 로마자로 떨어뜨린다
          // (`서버 컴포넌트` → `server-component` vs `seobeo-keomponeonteu`).
          slug: c.slug || toAsciiSlug(c.term),
          // 제안을 받은 slug 은 표제어를 고쳐도 따라가지 않는다 — 표제어에서 파생된
          // 값이 아니라 그 용어의 영어 이름이라, 다시 계산하면 제안이 사라진다.
          slugTouched: Boolean(c.slug),
          aliasInput: c.aliases.join(', '),
          definition: c.definition,
          // 분류는 비워 둔다 — AI 가 뽑은 낱말이 어느 분류인지는 사람만 안다.
          // 정하지 않은 채 등록해도 되고(‘분류 없음’), 나중에 사전 관리에서 지정할 수 있다.
          category: '',
        })),
      );
      setSkipped(result.skipped);
      setTruncated(result.truncated);
      setExtracted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '추출에 실패했습니다.');
    } finally {
      setBusy(null);
    }
  }

  function patch(id: number, next: Partial<Candidate>) {
    setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, ...next } : c)));
  }

  /** 표제어를 고치면 slug 이 따라온다 — 손으로 고친 뒤에는 따라오지 않는다 */
  function onTermChange(id: number, term: string) {
    setCandidates((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, term, slug: c.slugTouched ? c.slug : toAsciiSlug(term) } : c,
      ),
    );
  }

  const chosen = candidates.filter((c) => c.selected);

  async function register() {
    if (chosen.length === 0) return;

    // 등록 전에 한 번에 검사한다 — 절반쯤 쓰다 멈추면 무엇이 들어갔는지 알 수 없다
    const seen = new Set<string>();
    for (const c of chosen) {
      const invalid = validate(c, seen);
      if (invalid) {
        setError(invalid);
        return;
      }
      seen.add(c.slug);
    }

    setBusy('용어를 등록하는 중…');
    setError(null);
    setNotice(null);
    try {
      for (const c of chosen) {
        if (await isDictionarySlugTaken(c.slug)) {
          setError(`slug "${c.slug}" 는 이미 사용 중입니다. 다른 값으로 고치세요.`);
          return;
        }
        await createDictionaryTerm(c.slug, {
          term: c.term.trim(),
          aliases: parseAliases(c.aliasInput),
          definition: c.definition.trim(),
          postSlug: post.slug,
          category: c.category,
        });
      }

      // 용어 링크는 저장된 본문이 아니라 렌더 시점에 붙는다 — 사전이 바뀌면
      // 그 낱말을 쓴 글의 HTML 이 전부 낡는다 (posts.client.ts 의 주석 참조).
      await revalidateDictionary();

      const count = chosen.length;
      setRegistered((prev) => prev + count);
      setCandidates((prev) => prev.filter((c) => !c.selected));
      setNotice(`용어 ${count}개를 사전에 등록했습니다.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '등록에 실패했습니다.');
    } finally {
      setBusy(null);
    }
  }

  async function publish() {
    setBusy('발행 중…');
    setError(null);
    try {
      const draft: PostDraft = {
        slug: post.slug,
        title: post.title,
        content: post.content,
        excerpt: post.excerpt,
        category: post.category,
        subcategory: post.subcategory,
        tags: post.tags,
        coverImage: post.coverImage,
        status: 'published',
      };
      await updatePost(post.id, draft, post.status === 'published');
      await revalidatePost(post.slug, post.tags);
      router.push('/admin');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '발행에 실패했습니다.');
      setBusy(null);
    }
  }

  const noCategories = categories !== null && categories.length === 0;

  return (
    <>
      <div className="sticky top-0 z-20 border-b border-line bg-bg">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3">
          <Link
            href={`/admin/edit/${post.id}`}
            className="text-xs font-medium text-ink-dim hover:text-ink"
          >
            ← 편집으로
          </Link>
          <h1 className="text-base font-bold tracking-tight">발행 확인</h1>
          <StatusPill status={post.status} />

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <span aria-live="polite" className="text-xs text-ink-dim">
              {busy}
            </span>
            <Link href="/admin" className={btnSecondary}>
              나중에
            </Link>
            <button
              type="button"
              className={btnPrimary}
              disabled={Boolean(busy)}
              onClick={() => void publish()}
            >
              {post.status === 'published' ? '다시 발행' : '발행 확정'}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1500px] px-5 py-6">
        {error && (
          <p
            role="alert"
            className="mb-5 rounded-lg border border-line px-3.5 py-3 text-sm"
            style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger-fg)' }}
          >
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="mb-5 rounded-lg border border-line bg-surface px-3.5 py-3 text-sm">
            {notice}
          </p>
        )}

        <div className="grid gap-4 xl:grid-cols-2 xl:items-start">
          {/* ── 용어 추출 ── */}
          <Panel
            title="용어 사전"
            hint="본문에서 용어 후보를 뽑아 사전에 등록합니다. 정의는 AI 초안이므로 그대로 두지 말고 한 번 읽어보세요."
          >
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={btnSecondary}
                  disabled={Boolean(busy)}
                  onClick={() => void extract()}
                >
                  {extracted ? '다시 뽑기' : '용어 뽑기'}
                </button>
                <Link href="/admin/dictionary" target="_blank" rel="noreferrer" className={btnQuiet}>
                  사전 관리 ↗
                </Link>
                {registered > 0 && (
                  <span className="text-xs text-ink-dim">이번에 {registered}개 등록됨</span>
                )}
              </div>

              {noCategories && (
                <p className="rounded-lg border border-line bg-bg px-3.5 py-3 text-xs leading-relaxed text-ink-dim">
                  용어 분류가 아직 없습니다. 지금 등록하면 &lsquo;분류 없음&rsquo;으로 들어가고,{' '}
                  <Link href="/admin/dictionary" className="font-semibold text-ink underline">
                    사전 관리
                  </Link>
                  에서 분류를 만든 뒤 지정할 수 있습니다.
                </p>
              )}

              {truncated && (
                <p className={hintClass}>
                  본문이 길어 앞부분만 보냈습니다. 뒤쪽 용어는 사전 관리에서 직접 넣으세요.
                </p>
              )}

              {extracted && candidates.length === 0 && (
                <p className="rounded-lg border border-line bg-bg px-3.5 py-6 text-center text-xs text-ink-dim">
                  {skipped.length > 0
                    ? '새로 등록할 용어가 없습니다 — 뽑힌 낱말이 모두 이미 사전에 있습니다.'
                    : '뽑힌 용어가 없습니다. 본문이 짧거나 이미 설명이 충분한 글일 수 있습니다.'}
                </p>
              )}

              {candidates.length > 0 && (
                <ul className="space-y-3">
                  {candidates.map((c) => (
                    <li key={c.id} className="rounded-lg border border-line bg-bg p-3.5">
                      <label className="flex items-center gap-2 text-sm font-semibold">
                        <input
                          type="checkbox"
                          checked={c.selected}
                          onChange={(e) => patch(c.id, { selected: e.target.checked })}
                        />
                        등록
                      </label>

                      <div className="mt-3 space-y-3">
                        <Field htmlFor={`c-term-${c.id}`} label="표제어">
                          <input
                            id={`c-term-${c.id}`}
                            className={fieldClass}
                            maxLength={DICTIONARY_LIMITS.term - 1}
                            value={c.term}
                            onChange={(e) => onTermChange(c.id, e.target.value)}
                          />
                        </Field>

                        <Field
                          htmlFor={`c-slug-${c.id}`}
                          label="slug"
                          hint={`앵커 주소 — /dictionary#${c.slug || '…'} · 영어 원어가 있으면 그것으로 제안됩니다. 만든 뒤에는 바꿀 수 없습니다`}
                        >
                          <input
                            id={`c-slug-${c.id}`}
                            className={`${fieldClass} font-mono`}
                            value={c.slug}
                            onChange={(e) =>
                              patch(c.id, { slug: e.target.value, slugTouched: true })
                            }
                          />
                        </Field>

                        <Field
                          htmlFor={`c-def-${c.id}`}
                          label="정의"
                          hint={`${c.definition.length} / ${DICTIONARY_LIMITS.definition - 1}자`}
                        >
                          <textarea
                            id={`c-def-${c.id}`}
                            rows={3}
                            maxLength={DICTIONARY_LIMITS.definition - 1}
                            className={fieldClass}
                            value={c.definition}
                            onChange={(e) => patch(c.id, { definition: e.target.value })}
                          />
                        </Field>

                        <Field
                          htmlFor={`c-alias-${c.id}`}
                          label="별칭"
                          hint={`쉼표로 구분, 최대 ${DICTIONARY_LIMITS.aliases}개`}
                        >
                          <input
                            id={`c-alias-${c.id}`}
                            className={fieldClass}
                            value={c.aliasInput}
                            onChange={(e) => patch(c.id, { aliasInput: e.target.value })}
                          />
                        </Field>

                        <Field
                          htmlFor={`c-cat-${c.id}`}
                          label="분류"
                          hint="선택 사항 — 비워 두면 나중에 사전 관리에서 지정할 수 있습니다"
                        >
                          <Select
                            id={`c-cat-${c.id}`}
                            value={c.category}
                            onChange={(next) => patch(c.id, { category: next })}
                          >
                            <option value="">분류 없음</option>
                            {(categories ?? []).map((cat) => (
                              <option key={cat.slug} value={cat.slug}>
                                {cat.name}
                              </option>
                            ))}
                          </Select>
                        </Field>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {candidates.length > 0 && (
                <button
                  type="button"
                  className={btnPrimary}
                  disabled={Boolean(busy) || chosen.length === 0}
                  onClick={() => void register()}
                >
                  선택한 {chosen.length}개 등록
                </button>
              )}

              {skipped.length > 0 && (
                <div>
                  <p className={labelClass}>이미 사전에 있음</p>
                  <p className={hintClass}>
                    기존 정의를 덮어쓰지 않습니다 — 고치려면 사전 관리에서 직접 수정하세요.
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {skipped.map((s) => (
                      <li
                        key={`${s.term}-${s.existing}`}
                        className="rounded-md border border-line px-2 py-1 text-[11px] text-ink-dim"
                      >
                        {s.term}
                        <span className="ml-1.5 font-mono opacity-70">{s.existing}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Panel>

          {/* ── 본문 확인 ── */}
          <div className="xl:sticky xl:top-[4.75rem]">
            <Panel>
              <p className={labelClass}>{post.title || '(제목 없음)'}</p>
              <p className={hintClass}>
                /posts/{post.slug} · 용어 링크와 코드 하이라이팅은 발행 후 서버에서 붙습니다
              </p>
              <div className="mt-3 rounded-lg border border-line bg-bg p-5 xl:max-h-[calc(100dvh-14rem)] xl:overflow-y-auto">
                {post.content.trim() ? (
                  // 관리자 본인이 방금 쓴 마크다운을 되비추는 자리다 —
                  // 발행 경로는 서버의 renderMarkdown() 을 따로 탄다.
                  <div className="md" dangerouslySetInnerHTML={{ __html: previewHtml }} />
                ) : (
                  <p className="py-10 text-center text-xs text-ink-dim">본문이 비어 있습니다.</p>
                )}
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </>
  );
}

/** 화면에서 고칠 수 있는 후보 한 건. 표제어를 바꿀 수 있어 `id` 를 따로 둔다 */
interface Candidate {
  id: number;
  selected: boolean;
  term: string;
  slug: string;
  slugTouched: boolean;
  aliasInput: string;
  definition: string;
  category: string;
}

function parseAliases(input: string): string[] {
  // 빈 별칭이 남으면 자동 링크 정규식이 빈 대안을 갖게 되어 본문의 모든 위치에
  // 매칭된다 (lib/dictionary.ts 의 buildDictionaryIndex).
  return [
    ...new Set(
      input
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean),
    ),
  ];
}

/**
 * firestore.rules 의 validDictionaryTerm 과 같은 상한을 화면이 먼저 잡는다.
 * 여기서 안 막으면 규칙에 걸려 `Missing or insufficient permissions.` 원문만 뜨고,
 * 무엇이 잘못됐는지 화면에 남지 않는다 (관리 화면이 쓰는 규약과 같다).
 */
function validate(c: Candidate, taken: ReadonlySet<string>): string | null {
  const term = c.term.trim();
  const definition = c.definition.trim();
  if (!term) return '표제어가 빈 후보가 있습니다.';
  if (!definition) return `"${term}" 의 정의가 비어 있습니다.`;
  if (!c.slug.trim()) {
    return `"${term}" 의 slug 을 만들지 못했습니다 — 로마자로 옮길 글자가 없습니다. 직접 입력하세요.`;
  }
  if (taken.has(c.slug)) return `slug "${c.slug}" 가 후보 안에서 겹칩니다.`;
  // 분류는 선택 사항이다 — 비어 있으면 '분류 없음'으로 등록된다
  if (term.length >= DICTIONARY_LIMITS.term) {
    return `표제어는 ${DICTIONARY_LIMITS.term}자 미만이어야 합니다 ("${term}").`;
  }
  if (definition.length >= DICTIONARY_LIMITS.definition) {
    return `"${term}" 의 정의는 ${DICTIONARY_LIMITS.definition}자 미만이어야 합니다.`;
  }
  if (parseAliases(c.aliasInput).length > DICTIONARY_LIMITS.aliases) {
    return `"${term}" 의 별칭은 최대 ${DICTIONARY_LIMITS.aliases}개입니다.`;
  }
  return null;
}
