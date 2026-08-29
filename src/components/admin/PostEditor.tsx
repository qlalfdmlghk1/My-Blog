"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ClipboardEvent } from "react";

import { TagChip } from "@/components/TagChip";
import {
  Field,
  Panel,
  StatusPill,
  btnPrimary,
  btnQuiet,
  btnSecondary,
  fieldClass,
  hintClass,
  labelClass,
} from "@/components/admin/ui";
import { normalizeWord, taxonomyWordSet } from "@/lib/categories";
import { listCategories, listSubcategories } from "@/lib/categories.client";
import { renderPreview } from "@/lib/markdown-preview";
import {
  createPost,
  deletePost,
  isSlugTaken,
  revalidatePost,
  suggestPostSlug,
  updatePost,
  uploadImage,
} from "@/lib/posts.client";
import { autoExcerpt, toAsciiSlug } from "@/lib/slug";
import type { Category, Subcategory } from "@/types/category";
import type { Post, PostDraft, PostStatus } from "@/types/post";

/**
 * v1 은 WYSIWYG 를 만들지 않는다 — 툴바·드래그·자동저장까지 가면
 * 블로그가 아니라 에디터를 만드는 프로젝트가 된다.
 * 마크다운 직접 입력 + 실시간 미리보기까지가 범위.
 */
export function PostEditor({ existing }: { existing?: Post }) {
  const router = useRouter();
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const [title, setTitle] = useState(existing?.title ?? "");
  const [slug, setSlug] = useState(existing?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(Boolean(existing));
  const [content, setContent] = useState(existing?.content ?? "");
  const [excerpt, setExcerpt] = useState(existing?.excerpt ?? "");
  const [category, setCategory] = useState<string>(existing?.category ?? "");
  const [subcategory, setSubcategory] = useState<string>(existing?.subcategory ?? "");

  const [tagInput, setTagInput] = useState(existing?.tags.join(", ") ?? "");
  const [coverImage, setCoverImage] = useState(existing?.coverImage ?? "");

  const [busy, setBusy] = useState<null | string>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * 카테고리는 관리 화면에서 만드는 값이라 Firestore 에서 읽어 온다.
   * 새 글에서 아직 아무것도 안 골랐으면 목록의 첫 항목을 기본값으로 채운다 —
   * 저장 직전에야 "카테고리를 고르세요"가 뜨는 것보다 낫다.
   */
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listCategories(), listSubcategories()])
      .then(([cats, subs]) => {
        if (cancelled) return;
        setCategories(cats);
        setSubcategories(subs);
        setCategory((current) => current || cats[0]?.slug || "");
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "분류를 불러오지 못했습니다."));
    return () => {
      cancelled = true;
    };
  }, []);

  /** 지금 고른 카테고리에 속한 소분류만 — 소분류는 카테고리를 넘나들지 않는다 */
  const subOptions = useMemo(() => subcategories.filter((s) => s.category === category), [subcategories, category]);

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
          .split(",")
          .map((t) => t.trim().replace(/^#+/, "").trim())
          .filter(Boolean),
      ),
    ],
    [tagInput],
  );

  /**
   * 카테고리 이름을 되풀이하는 태그.
   *
   * 막지는 않고 알리기만 한다 — 저장을 막으면 규칙을 모르는 상태에서 글이 잠기고,
   * 정작 고쳐야 할 이유는 화면에 안 남는다. 이유를 보여주고 한 번에 지울 수단을 준다.
   */
  const echoedTags = useMemo(() => {
    if (!categories) return [];
    const words = taxonomyWordSet(categories, subcategories);
    return tags.filter((t) => words.has(normalizeWord(t)));
  }, [tags, categories, subcategories]);

  /**
   * 커버 썸네일용 주소.
   *
   * `background-image: url("…")` 에 값을 그대로 꽂으면 따옴표·역슬래시가 든 문자열이
   * 선언을 빠져나갈 수 있다. 업로드가 아니라 직접 붙여넣은 주소도 들어올 수 있으므로
   * 걸러둔다. http(s) 가 아니면 썸네일을 그리지 않는다 (주소는 아래에 텍스트로 남는다).
   */
  const coverPreview = useMemo(() => {
    const url = coverImage.trim();
    if (!/^https?:\/\//i.test(url)) return null;
    return url.replace(/["\\]/g, (c) => encodeURIComponent(c));
  }, [coverImage]);

  const activeHint = categories?.find((c) => c.slug === category)?.hint;

  function onTitleChange(next: string) {
    setTitle(next);
    // slug 를 손대지 않았다면 제목에서 따라간다 (한글 제목은 로마자로)
    if (!slugEdited) setSlug(toAsciiSlug(next));
  }

  /**
   * 제목을 영어 slug 으로 옮겨 받는다.
   *
   * 자동으로 부르지 않는다 — 제목을 한 글자 칠 때마다 모델을 부르게 되고, 그 비용과
   * 대기가 글쓰기 흐름에 얹힌다. 받은 값은 `slugEdited` 로 잠가 제목을 더 고쳐도
   * 로마자로 되돌아가지 않게 한다 (되돌리려면 '제목에서 다시 만들기').
   */
  async function suggestSlug() {
    if (!title.trim()) {
      setError("제목을 먼저 입력하세요.");
      return;
    }
    setBusy("slug 을 지어보는 중…");
    setError(null);
    try {
      setSlug(await suggestPostSlug(title, content));
      setSlugEdited(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "slug 제안에 실패했습니다.");
    } finally {
      setBusy(null);
    }
  }

  /** 붙여넣기로 이미지가 들어오면 업로드하고 커서 위치에 마크다운을 삽입한다 */
  async function onPaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    const file = [...e.clipboardData.items].find((i) => i.kind === "file" && i.type.startsWith("image/"))?.getAsFile();
    if (!file) return;

    e.preventDefault();
    setBusy("이미지 업로드 중…");
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
      setError(err instanceof Error ? err.message : "이미지 업로드에 실패했습니다.");
    } finally {
      setBusy(null);
    }
  }

  async function onCoverPick(file: File | undefined) {
    if (!file) return;
    setBusy("커버 업로드 중…");
    setError(null);
    try {
      setCoverImage(await uploadImage(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "커버 업로드에 실패했습니다.");
    } finally {
      setBusy(null);
    }
  }

  function validate(status: PostStatus): string | null {
    if (!title.trim()) return "제목을 입력하세요.";
    if (!slug.trim()) {
      // 원인을 제목으로 되짚는다. 위에서 빈 제목을 이미 걸러냈으므로 "제목이 있는가"로
      // 갈라서는 안 된다 — 그러면 사용자가 slug 을 직접 지운 경우에도 "옮길 글자가 없다"는
      // 사실과 반대되는 안내가 나간다. 제목에서 실제로 만들어지는지를 다시 계산해 가른다.
      return toAsciiSlug(title)
        ? "slug 를 입력하세요."
        : "제목에서 slug 을 만들지 못했습니다 — 로마자로 옮길 글자가 없습니다. 직접 입력하세요.";
    }
    if (!category) return "카테고리를 고르세요.";
    if (!subcategory) return "소분류를 고르세요.";
    // 목록에 없는 카테고리를 가리키는 기존 글. 라디오는 아무것도 선택되지 않은 것처럼
    // 보이지만 category 값 자체는 남아 있어, 이 검사가 없으면 그대로 통과한 뒤
    // firestore.rules 의 categoryExists() 에 걸려 permissions 원문 에러만 뜬다.
    if (categories && !categories.some((c) => c.slug === category)) {
      return `이 글은 목록에 없는 카테고리 "${category}" 를 가리킵니다. 아래에서 다시 고르거나 카테고리 화면에서 그 slug 로 만드세요.`;
    }
    // 소분류도 같은 이유로 미리 잡는다 — 규칙의 subcategoryExists() 에 걸리면
    // permissions 원문 에러만 뜨고 무엇이 잘못됐는지 화면에 안 남는다.
    if (categories && !subOptions.some((s) => s.slug === subcategory)) {
      return `이 글은 "${category}" 에 없는 소분류 "${subcategory}" 를 가리킵니다. 아래에서 다시 고르세요.`;
    }
    if (status === "published" && !content.trim()) return "본문이 비어 있습니다.";
    return null;
  }

  /**
   * 저장 공통부 — 성공하면 문서 ID 를 돌려준다.
   *
   * ID 를 돌려주는 이유는 발행 확인 화면 때문이다. 새 글은 저장하기 전에 ID 가
   * 없고, 확인 화면은 본문을 넘겨받는 대신 ID 로 다시 읽는다(그래야 새로고침에도
   * 같은 화면이 나온다). 저장이 끝난 자리에서만 알 수 있는 값이라 여기서 돌려준다.
   *
   * @param validateAs 검사에 쓸 상태. 확인 화면으로 넘길 때는 임시저장으로 쓰면서도
   *   발행 기준(본문이 비어 있지 않은가)으로 미리 걸러야 한다 — 확인 화면까지 갔다가
   *   거기서 막히면 되돌아와야 할 이유를 늦게 알게 된다.
   */
  async function persist(status: PostStatus, label: string, validateAs: PostStatus = status): Promise<string | null> {
    const invalid = validate(validateAs);
    if (invalid) {
      setError(invalid);
      return null;
    }
    setBusy(label);
    setError(null);
    try {
      // 검사와 저장이 같은 값을 봐야 한다 — trim 전 값으로 조회하면
      // 뒤에 공백이 붙은 slug 가 검사를 통과하고 trim 된 값으로 저장돼 중복이 생긴다.
      // getPostBySlug 는 limit(1) 이라 그 경우 한쪽 글이 영구히 접근 불가가 된다.
      const normalizedSlug = slug.trim();

      if (await isSlugTaken(normalizedSlug, existing?.id)) {
        setError(`slug "${normalizedSlug}" 는 이미 사용 중입니다.`);
        return null;
      }

      const draft: PostDraft = {
        slug: normalizedSlug,
        title: title.trim(),
        content,
        excerpt: excerpt.trim() || excerptHint,
        category,
        subcategory,
        tags,
        coverImage: coverImage.trim() || null,
        status,
      };

      let id: string;
      if (existing) {
        await updatePost(existing.id, draft, existing.status === "published");
        id = existing.id;
      } else {
        id = await createPost(draft);
      }

      // draft 로 되돌린 경우에도 기존 정적 페이지를 걷어내야 하므로 항상 재생성한다.
      // 카테고리는 서버가 전체 목록을 돌리므로 여기서 넘기지 않는다.
      const affected = [...new Set([...tags, ...(existing?.tags ?? [])])];
      await revalidatePost(draft.slug, affected);

      return id;
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function save(status: PostStatus) {
    const id = await persist(status, status === "published" ? "발행 중…" : "저장 중…");
    if (!id) return;
    router.push("/admin");
    router.refresh();
  }

  /**
   * 발행 버튼 — 바로 내보내지 않고 **확인 화면으로 넘긴다.**
   *
   * 상태는 올리지 않는다. 새 글은 임시저장인 채로 저장하고, 이미 발행된 글은
   * 발행인 채로 둔다 — 수정 중이던 발행 글이 확인 화면을 여는 동안 블로그에서
   * 내려가면 안 되기 때문이다. 상태를 published 로 바꾸는 것은 확인 화면의
   * 확정 버튼 하나뿐이다.
   */
  async function saveForReview() {
    const status: PostStatus = existing?.status === "published" ? "published" : "draft";
    const id = await persist(status, "저장 중…", "published");
    if (!id) return;
    router.push(`/admin/publish/${id}`);
  }

  async function remove() {
    if (!existing) return;
    if (!window.confirm(`"${existing.title}" 를 삭제합니다. 되돌릴 수 없습니다.`)) return;
    setBusy("삭제 중…");
    setError(null);
    try {
      await deletePost(existing.id);
      await revalidatePost(existing.slug, existing.tags);
      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "삭제에 실패했습니다.");
    } finally {
      setBusy(null);
    }
  }

  // 이미 발행된 글에 "임시저장"을 누르면 블로그에서 내려간다.
  // 동작은 같아도 결과가 정반대라 라벨을 결과대로 쓴다.
  const draftLabel = existing?.status === "published" ? "비공개로 내리기" : "임시저장";

  return (
    <>
      {/* 본문이 길어져도 저장 수단이 화면 밖으로 밀려나지 않게 고정한다 */}
      <div className="sticky top-0 z-20 border-b border-line bg-bg">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3">
          <Link href="/admin" className="text-xs font-medium text-ink-dim hover:text-ink">
            ← 목록
          </Link>
          <h1 className="text-base font-bold tracking-tight">{existing ? "글 수정" : "새 글"}</h1>
          {existing && <StatusPill status={existing.status} />}

          <div className="ml-auto flex flex-wrap items-center gap-2">
            {/* 진행 문구는 스크린리더에도 전달한다 — 버튼이 잠긴 이유가 여기에 있다 */}
            <span aria-live="polite" className="text-xs text-ink-dim">
              {busy}
            </span>
            <button type="button" className={btnSecondary} disabled={Boolean(busy)} onClick={() => void save("draft")}>
              {draftLabel}
            </button>
            <button type="button" className={btnPrimary} disabled={Boolean(busy)} onClick={() => void saveForReview()}>
              발행 확인
            </button>
            {existing && (
              <button
                type="button"
                className={`${btnQuiet} ml-1 border-l border-line pl-3`}
                disabled={Boolean(busy)}
                onClick={() => void remove()}
              >
                삭제
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1500px] px-5 py-6">
        {error && (
          <p
            role="alert"
            className="mb-5 rounded-lg border border-line px-3.5 py-3 text-sm"
            style={{ backgroundColor: "var(--danger-bg)", color: "var(--danger-fg)" }}
          >
            {error}
          </p>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="글 정보">
            <div className="space-y-4">
              <Field htmlFor="f-title" label="제목">
                <input
                  id="f-title"
                  className={fieldClass}
                  value={title}
                  onChange={(e) => onTitleChange(e.target.value)}
                />
              </Field>

              <Field
                htmlFor="f-slug"
                label="slug"
                hint={
                  slugEdited
                    ? `발행 주소 — /posts/${slug || "…"}`
                    : `발행 주소 — /posts/${slug || "…"} · 한글 제목은 로마자 발음으로 옮깁니다. 영어 주소를 원하면 'AI 추천'을 누르거나 직접 고치세요.`
                }
                aside={
                  <span className="flex items-center gap-2.5">
                    <button
                      type="button"
                      className="text-[11px] font-medium text-ink-dim hover:text-ink disabled:opacity-50"
                      disabled={Boolean(busy)}
                      onClick={() => void suggestSlug()}
                    >
                      AI 추천
                    </button>
                    {slugEdited && (
                      <button
                        type="button"
                        className="text-[11px] font-medium text-ink-dim hover:text-ink"
                        onClick={() => {
                          setSlugEdited(false);
                          setSlug(toAsciiSlug(title));
                        }}
                      >
                        제목에서 다시 만들기
                      </button>
                    )}
                  </span>
                }
              >
                <input
                  id="f-slug"
                  className={`${fieldClass} font-mono`}
                  value={slug}
                  onChange={(e) => {
                    setSlugEdited(true);
                    setSlug(e.target.value);
                  }}
                />
              </Field>
            </div>
          </Panel>

          <Panel title="분류">
            <div className="space-y-4">
              <fieldset>
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <legend className={labelClass}>카테고리 — 정확히 1개</legend>
                  <Link href="/admin/categories" className="text-[11px] font-medium text-ink-dim hover:text-ink">
                    카테고리 관리
                  </Link>
                </div>
                {/* 6개 고정이라는 사실 자체가 이 블로그의 설계라 여섯 개를 전부 펼쳐 둔다.
                    select 로 접으면 색과 개수가 화면에서 사라진다. */}
                {!categories ? (
                  <p className="text-xs text-ink-dim">카테고리를 불러오는 중…</p>
                ) : categories.length === 0 ? (
                  <p className="text-xs text-ink-dim">
                    카테고리가 없습니다.{" "}
                    <Link href="/admin/categories" className="font-semibold underline">
                      먼저 하나 만드세요
                    </Link>
                    .
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                    {categories.map((c) => (
                      <label key={c.slug} className="cursor-pointer" title={c.hint || undefined}>
                        <input
                          type="radio"
                          name="category"
                          value={c.slug}
                          checked={category === c.slug}
                          onChange={() => {
                            setCategory(c.slug);
                            // 소분류는 카테고리에 종속이다 — 카테고리가 바뀌면
                            // 이전 소분류는 더 이상 유효하지 않으므로 비운다.
                            setSubcategory(c.slug === existing?.category ? existing.subcategory : "");
                            // 직전 저장에서 뜬 오류를 함께 지운다 — 안 지우면 카테고리를
                            // 고쳐도 "목록에 없는 카테고리" 경고가 그대로 남아, 고친 게
                            // 반영되지 않은 것처럼 보인다.
                            setError(null);
                          }}
                          className="peer sr-only"
                        />
                        <span className="flex items-center gap-2 rounded-lg border border-line bg-bg px-2.5 py-2 text-sm transition-colors hover:border-ink-dim peer-checked:border-ink peer-checked:font-semibold peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[color:var(--text)]">
                          <span
                            aria-hidden
                            className="size-2 shrink-0 rounded-full"
                            style={{ backgroundColor: `var(--pal-${c.palette}-fg)` }}
                          />
                          <span className="truncate">{c.name}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                {activeHint && <p className={hintClass}>{activeHint}</p>}
              </fieldset>

              <fieldset>
                <legend className={`${labelClass} mb-1.5`}>소분류 — 정확히 1개</legend>
                {!categories ? (
                  <p className="text-xs text-ink-dim">불러오는 중…</p>
                ) : !category ? (
                  <p className="text-xs text-ink-dim">카테고리를 먼저 고르세요.</p>
                ) : subOptions.length === 0 ? (
                  <p className="text-xs leading-relaxed text-ink-dim">
                    이 카테고리에 소분류가 없습니다.{" "}
                    <Link href="/admin/categories" className="font-semibold underline">
                      카테고리 관리
                    </Link>
                    에서 먼저 만드세요.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                    {subOptions.map((s) => (
                      <label key={s.slug} className="cursor-pointer">
                        <input
                          type="radio"
                          name="subcategory"
                          value={s.slug}
                          checked={subcategory === s.slug}
                          onChange={() => {
                            setSubcategory(s.slug);
                            setError(null);
                          }}
                          className="peer sr-only"
                        />
                        <span className="flex items-center gap-2 rounded-lg border border-line bg-bg px-2.5 py-2 text-sm transition-colors hover:border-ink-dim peer-checked:border-ink peer-checked:font-semibold peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[color:var(--text)]">
                          <span className="truncate">{s.name}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </fieldset>

              <Field htmlFor="f-tags" label="태그 — 기술 · 도구 이름만">
                <input
                  id="f-tags"
                  className={fieldClass}
                  value={tagInput}
                  placeholder="Next.js, Firestore, ISR"
                  onChange={(e) => setTagInput(e.target.value)}
                />
                <p className={hintClass}>
                  쉼표로 구분 · 색 없음. 카테고리가 &ldquo;무슨 성격의 글인가&rdquo;라면 태그는 &ldquo;무엇이
                  나오는가&rdquo;입니다.
                </p>

                {tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {tags.map((t) => (
                      <TagChip key={t} tag={t} />
                    ))}
                  </div>
                )}

                {echoedTags.length > 0 && (
                  <div role="status" className="mt-2.5 rounded-lg border border-ink-dim p-3">
                    <p className="text-[11px] font-bold">카테고리 이름을 태그로 다시 붙였습니다</p>
                    <p className={hintClass}>
                      <span className="font-mono">{echoedTags.join(", ")}</span> 은(는) 카테고리가 이미 말하고 있어,
                      태그로 두면 두 축이 같은 걸 가리킵니다.
                    </p>
                    <button
                      type="button"
                      className="mt-2 text-[11px] font-semibold underline underline-offset-2"
                      onClick={() => setTagInput(tags.filter((t) => !echoedTags.includes(t)).join(", "))}
                    >
                      {echoedTags.length}개 제거
                    </button>
                  </div>
                )}
              </Field>
            </div>
          </Panel>

          <Panel title="요약" hint="목록 카드 · 검색 결과 · OG 카드에 실립니다">
            <Field
              htmlFor="f-excerpt"
              label="발췌문 — 비우면 본문에서 자동 생성"
              aside={<span className="text-[11px] tabular-nums text-ink-dim">{(excerpt || excerptHint).length}자</span>}
            >
              <textarea
                id="f-excerpt"
                className={`${fieldClass} h-24 resize-y leading-relaxed`}
                value={excerpt}
                placeholder={excerptHint || "본문을 쓰면 자동 생성 미리보기가 표시됩니다"}
                onChange={(e) => setExcerpt(e.target.value)}
              />
            </Field>
          </Panel>

          <Panel title="커버 이미지" hint="선택 사항 — 없으면 카테고리 색 OG 카드가 쓰입니다">
            <Field htmlFor="f-cover" label="파일 선택">
              <input
                id="f-cover"
                type="file"
                accept="image/*"
                className="block w-full text-xs text-ink-dim file:mr-3 file:cursor-pointer file:rounded-lg file:border file:border-line file:bg-bg file:px-3 file:py-2 file:text-xs file:font-semibold file:text-ink hover:file:bg-surface"
                onChange={(e) => void onCoverPick(e.target.files?.[0])}
              />
            </Field>

            {coverImage && (
              <div className="mt-3 flex items-start gap-3">
                {coverPreview && (
                  <span
                    role="img"
                    aria-label="커버 이미지 미리보기"
                    className="h-16 w-28 shrink-0 rounded-lg border border-line bg-surface bg-cover bg-center"
                    style={{ backgroundImage: `url("${coverPreview}")` }}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="break-all font-mono text-[11px] leading-relaxed text-ink-dim">{coverImage}</p>
                  <button
                    type="button"
                    className="mt-1.5 text-[11px] font-medium text-ink-dim hover:text-ink"
                    onClick={() => setCoverImage("")}
                  >
                    커버 제거
                  </button>
                </div>
              </div>
            )}
          </Panel>
        </div>

        {/* ── 본문 · 미리보기 ── */}
        <div className="mt-4 grid gap-4 xl:grid-cols-2 xl:items-start">
          <Panel>
            <Field
              htmlFor="f-body"
              label="본문 (마크다운)"
              hint="이미지는 붙여넣기하면 업로드 후 커서 위치에 삽입됩니다"
              aside={
                <span className="text-[11px] tabular-nums text-ink-dim">
                  {content.length.toLocaleString("ko-KR")}자
                </span>
              }
            >
              <textarea
                id="f-body"
                ref={bodyRef}
                className={`${fieldClass} h-[34rem] resize-y font-mono text-[13px] leading-relaxed`}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onPaste={(e) => void onPaste(e)}
              />
            </Field>
          </Panel>

          {/* 본문을 내려도 미리보기가 따라오게 붙여둔다 (넓은 화면에서만) */}
          <div className="xl:sticky xl:top-[4.75rem]">
            <Panel>
              <p className={labelClass}>미리보기</p>
              <p className={hintClass}>코드 하이라이팅은 발행 후 서버에서 적용됩니다</p>
              <div className="mt-3 rounded-lg border border-line bg-bg p-5 xl:max-h-[calc(100dvh-14rem)] xl:overflow-y-auto">
                {content.trim() ? (
                  // 관리자 본인이 방금 입력한 마크다운을 그대로 되비추는 자리다.
                  // 외부 입력이 아니며, 발행 경로는 서버의 renderMarkdown() 을 따로 탄다.
                  <div className="md" dangerouslySetInnerHTML={{ __html: previewHtml }} />
                ) : (
                  <p className="py-10 text-center text-xs text-ink-dim">본문을 쓰면 여기에 그대로 나타납니다.</p>
                )}
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </>
  );
}
