<script lang="ts">
  import { tick } from 'svelte';
  import { BODY_SCALES, IMAGE_LAYOUTS } from '../catalog';
  import { parseBody } from '../render/markdown';
  import { importImage, imageUrls } from './images.svelte';
  import { app } from './state.svelte';

  const page = $derived(app.project.pages[app.selected]);
  const globalScale = $derived(app.project.settings.bodyScale);

  /**
   * 画像を表示するステップの選択肢（内部値は 0 始まり、表示は 1 始まり）。
   * 本文のステップすべてと、本文を出し切った後の「次のクリック」を選べるようにする
   */
  const imageStepOptions = $derived.by(() => {
    const bodySteps = parseBody(page?.body ?? '').maxStep + 1;
    const count = Math.max(bodySteps + 1, (page?.image?.step ?? 0) + 1);
    return Array.from({ length: count }, (_, i) => ({
      value: i,
      label:
        i === 0
          ? 'ステップ 1（最初から表示）'
          : i >= bodySteps
            ? `ステップ ${i + 1}（本文をすべて出した後のクリック）`
            : `ステップ ${i + 1}`,
    }));
  });

  /** 全体の設定と同じサイズを選んだら null（全体に合わせる）として保存する */
  function setPageScale(value: number) {
    page.bodyScale = value === globalScale ? null : value;
  }

  let bodyArea = $state<HTMLTextAreaElement>();
  let imageInput = $state<HTMLInputElement>();
  let imageError = $state<string | null>(null);

  /** カーソル位置にテキストを挿入する。lineStart なら行頭に入れる */
  async function insert(text: string, opts: { lineStart?: boolean; wrap?: [string, string] } = {}) {
    const el = bodyArea;
    if (!el) return;
    const value = page.body;
    let start = el.selectionStart;
    let end = el.selectionEnd;
    let insertText = text;
    if (opts.wrap) {
      insertText = opts.wrap[0] + value.slice(start, end) + opts.wrap[1];
    } else if (opts.lineStart) {
      start = end = value.lastIndexOf('\n', start - 1) + 1;
    }
    page.body = value.slice(0, start) + insertText + value.slice(end);
    await tick();
    el.focus();
    const cursor = opts.wrap && start === end ? start + opts.wrap[0].length : start + insertText.length;
    el.setSelectionRange(cursor, cursor);
  }

  function setToday() {
    const d = new Date();
    page.date = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  }

  function insertStep() {
    const el = bodyArea;
    if (!el) return;
    const before = page.body.slice(0, el.selectionStart);
    const atLineStart = before === '' || before.endsWith('\n');
    insert(atLineStart ? '>>\n' : ' >> ');
  }

  async function onImageFile(file: File | undefined) {
    if (!file) return;
    imageError = null;
    try {
      const id = await importImage(file);
      page.image = page.image
        ? { ...page.image, id }
        : { id, layout: 'left', step: 0, overlaySize: 40, caption: '' };
    } catch (e) {
      imageError = `画像を読み込めませんでした（${e instanceof Error ? e.message : String(e)}）`;
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    onImageFile(e.dataTransfer?.files[0]);
  }
</script>

<section class="min-h-0 overflow-y-auto border-r border-base-300 p-4">
  {#if page}
    <div class="mb-3 flex items-center gap-3">
      <span class="text-sm font-bold">{app.selected + 1} ページ目</span>
      <div class="join">
        <button
          type="button"
          class="btn join-item btn-sm {page.kind === 'content' ? 'btn-active btn-primary' : ''}"
          onclick={() => (page.kind = 'content')}>本文ページ</button
        >
        <button
          type="button"
          class="btn join-item btn-sm {page.kind === 'title' ? 'btn-active btn-primary' : ''}"
          onclick={() => (page.kind = 'title')}>タイトルページ</button
        >
      </div>
    </div>

    <fieldset class="fieldset">
      <legend class="fieldset-legend">タイトル</legend>
      <input class="input w-full" bind:value={page.title} placeholder="ページのタイトル" />
    </fieldset>

    {#if page.kind === 'title'}
      <fieldset class="fieldset">
        <legend class="fieldset-legend">サブタイトル（任意）</legend>
        <input class="input w-full" bind:value={page.subtitle} />
      </fieldset>
      <div class="grid grid-cols-2 gap-3">
        <fieldset class="fieldset">
          <legend class="fieldset-legend">作者名（任意）</legend>
          <input class="input w-full" bind:value={page.author} placeholder="例：宮乃やみ" />
        </fieldset>
        <fieldset class="fieldset">
          <legend class="fieldset-legend">日付（任意）</legend>
          <div class="join w-full">
            <input class="input join-item w-full" bind:value={page.date} placeholder="例：2026年10月31日" />
            <button type="button" class="btn join-item" onclick={setToday}>今日</button>
          </div>
        </fieldset>
      </div>
    {:else}
      <fieldset class="fieldset">
        <legend class="fieldset-legend flex w-full items-center justify-between">
          本文
          <label
            class="flex items-center gap-1 text-xs font-normal"
            title="このページだけ本文の文字サイズを変える。「既定値」の付いたサイズを選ぶと、上部の「本文サイズの既定値」に合わせます"
          >
            文字サイズ
            <select
              class="select select-xs w-36"
              value={page.bodyScale ?? globalScale}
              onchange={(e) => setPageScale(Number(e.currentTarget.value))}
            >
              {#each BODY_SCALES as s (s.value)}
                <option value={s.value}>{s.label}{s.value === globalScale ? '（既定値）' : ''}</option>
              {/each}
            </select>
          </label>
        </legend>
        <div class="flex flex-wrap gap-1">
          <button type="button" class="btn btn-xs btn-accent" onclick={insertStep} title="ここから後ろをクリックで表示（>> が入ります）"
            >▶ クリックで表示</button
          >
          <button type="button" class="btn btn-xs" onclick={() => insert('## ', { lineStart: true })}>小見出し</button>
          <button type="button" class="btn btn-xs" onclick={() => insert('- ', { lineStart: true })}>箇条書き</button>
          <button type="button" class="btn btn-xs" onclick={() => insert('1. ', { lineStart: true })}>番号</button>
          <button type="button" class="btn btn-xs" onclick={() => insert('', { wrap: ['**', '**'] })}>太字</button>
          <button type="button" class="btn btn-xs" onclick={() => insert('> ', { lineStart: true })}>引用</button>
          <button type="button" class="btn btn-xs" onclick={() => insert('```python\n\n```\n', { lineStart: true })}>コード</button>
          <button type="button" class="btn btn-xs" onclick={() => insert('※ 出典：', { lineStart: true })}>出典</button>
        </div>
        <textarea
          bind:this={bodyArea}
          class="textarea h-64 w-full font-mono text-sm leading-relaxed"
          bind:value={page.body}
          spellcheck="false"
        ></textarea>
        <details class="text-xs">
          <summary class="cursor-pointer opacity-80">書き方の説明</summary>
          <p class="mt-1 opacity-80">上のボタンを押しても入れられます。</p>
          <table class="mt-1">
            <tbody>
              <tr><td class="pr-4 font-mono">- りんご</td><td>箇条書き</td></tr>
              <tr><td class="pr-4 font-mono">## 見出し</td><td>小見出し</td></tr>
              <tr><td class="pr-4 font-mono">**大事**</td><td>太字</td></tr>
              <tr><td class="pr-4 font-mono">&gt;&gt;</td><td>ここから後ろは、クリックで表示</td></tr>
            </tbody>
          </table>
        </details>
      </fieldset>

      <fieldset class="fieldset">
        <legend class="fieldset-legend">画像（任意）</legend>
        {#if page.image}
          {@const image = page.image}
          <div class="flex gap-3">
            <div class="flex h-28 w-40 flex-none items-center justify-center rounded-box bg-base-200 bg-[repeating-conic-gradient(#0000000d_0_25%,transparent_0_50%)] bg-[length:16px_16px]">
              {#if imageUrls[image.id]}
                <img src={imageUrls[image.id]} alt="" class="max-h-full max-w-full object-contain" />
              {:else}
                <span class="text-xs opacity-60">読み込み中…</span>
              {/if}
            </div>
            <div class="grid flex-1 content-start gap-2 text-sm">
              <label class="flex items-center gap-2">
                <span class="w-20 flex-none">キャプション</span>
                <input class="input input-sm flex-1" bind:value={image.caption} placeholder="画像の下に出す説明（任意）" />
              </label>
              <label class="flex items-center gap-2">
                <span class="w-20 flex-none">配置</span>
                <select class="select select-sm" bind:value={image.layout}>
                  {#each IMAGE_LAYOUTS as l (l.id)}
                    <option value={l.id}>{l.label}</option>
                  {/each}
                </select>
              </label>
              <label
                class="flex items-center gap-2"
                title="どのステップで画像を表示するか。ステップの数え方はプレビュー下の「ステップ n / m」と同じです"
              >
                <span class="w-20 flex-none">表示タイミング</span>
                <select class="select select-sm" bind:value={image.step}>
                  {#each imageStepOptions as o (o.value)}
                    <option value={o.value}>{o.label}</option>
                  {/each}
                </select>
              </label>
              {#if image.layout === 'overlay'}
                <label class="flex items-center gap-2" title="スライドの幅に対する画像の幅（5〜100%）">
                  <span class="w-20 flex-none">大きさ</span>
                  <input
                    type="number"
                    class="input input-sm w-20"
                    min="5"
                    max="100"
                    value={image.overlaySize}
                    onchange={(e) => (image.overlaySize = Math.max(5, Math.min(100, Math.round(+e.currentTarget.value) || 40)))}
                  />
                  <span>%</span>
                </label>
              {/if}
              <div class="flex gap-2">
                <button type="button" class="btn btn-xs" onclick={() => imageInput?.click()}>画像を変更</button>
                <button type="button" class="btn btn-xs btn-ghost text-error" onclick={() => (page.image = null)}>画像を外す</button>
              </div>
            </div>
          </div>
        {:else}
          <button
            type="button"
            class="flex h-24 w-full cursor-pointer items-center justify-center rounded-box border-2 border-dashed border-base-300 text-sm opacity-70 hover:opacity-100"
            onclick={() => imageInput?.click()}
            ondragover={(e) => e.preventDefault()}
            ondrop={onDrop}
          >
            クリックまたはドロップで画像を追加（透過 PNG も可）
          </button>
        {/if}
        <input
          bind:this={imageInput}
          type="file"
          accept="image/*"
          class="hidden"
          onchange={(e) => {
            onImageFile(e.currentTarget.files?.[0]);
            e.currentTarget.value = '';
          }}
        />
        {#if imageError}<p class="text-sm text-error">{imageError}</p>{/if}
      </fieldset>

    {/if}
  {/if}
</section>
