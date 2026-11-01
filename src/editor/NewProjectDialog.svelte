<script lang="ts">
  import { pagesFromMarkdown } from '../importMarkdown';
  import { startNewProject } from './actions.svelte';
  import { app } from './state.svelte';

  let { open = $bindable(false), afterDiscard = false }: { open: boolean; afterDiscard?: boolean } = $props();

  let dialog = $state<HTMLDialogElement>();
  let fileInput = $state<HTMLInputElement>();
  let mode = $state<'blank' | 'markdown'>('blank');
  let markdown = $state('');
  let busy = $state(false);

  const pages = $derived(mode === 'markdown' ? pagesFromMarkdown(markdown) : []);
  const titleCount = $derived(pages.filter((p) => p.kind === 'title').length);

  $effect(() => {
    if (open && !dialog?.open) dialog?.showModal();
    if (!open && dialog?.open) dialog.close();
  });

  /** 起動時の「新しく作る」の流れが終わったら通常の「新規」に戻す */
  function afterDiscardDone() {
    app.newDialogAfterDiscard = false;
  }

  async function onFile(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) markdown = await file.text();
  }

  async function create() {
    busy = true;
    try {
      await startNewProject(mode === 'markdown' ? pages : undefined);
      markdown = '';
      mode = 'blank';
      open = false;
    } finally {
      busy = false;
    }
  }
</script>

<dialog
  bind:this={dialog}
  class="modal"
  onclose={() => {
    open = false;
    afterDiscardDone();
  }}
>
  <div class="modal-box flex max-h-[90vh] max-w-3xl flex-col">
    <h2 class="text-lg font-bold">新しいスライドを作る</h2>

    <div role="tablist" class="tabs tabs-box mt-4 w-fit">
      <button type="button" role="tab" class="tab {mode === 'blank' ? 'tab-active' : ''}" onclick={() => (mode = 'blank')}
        >空のスライドから</button
      >
      <button
        type="button"
        role="tab"
        class="tab {mode === 'markdown' ? 'tab-active' : ''}"
        onclick={() => (mode = 'markdown')}>Markdown から作る</button
      >
    </div>

    <div class="mt-4 min-h-0 flex-1 overflow-y-auto">
      {#if mode === 'blank'}
        <p class="text-sm">タイトルページと本文ページが1枚ずつのスライドから始めます。</p>
      {:else}
        <p class="text-sm">
          用意しておいた Markdown を貼り付けるか、ファイルを開いてください。見出し（<code>#</code> 〜 <code>######</code>）ごとに1ページになります。
        </p>
        <ul class="mt-1 list-disc pl-5 text-xs opacity-80">
          <li>見出しの文字がページのタイトルに、その下の文章が本文になります。</li>
          <li>本文を持たずに次の見出しが続く見出しは、タイトルページになります。</li>
          <li>本文は、このツールの書き方（箇条書き・太字・コード・<code>&gt;&gt;</code> など）でそのまま使えます。</li>
          <li class="font-bold">画像（<code>![](…)</code>）は取り込まれません。文字のまま本文に残るので、作成後に各ページで画像を追加してください。</li>
        </ul>
        <div class="mt-3 flex items-center gap-2">
          <button type="button" class="btn btn-sm" onclick={() => fileInput?.click()}>ファイルを開く（.md / .txt）</button>
          <input bind:this={fileInput} type="file" accept=".md,.markdown,.txt,text/markdown,text/plain" class="hidden" onchange={onFile} />
        </div>
        <textarea
          class="textarea mt-2 h-56 w-full font-mono text-sm"
          bind:value={markdown}
          spellcheck="false"
          placeholder={'## 光の正体をさぐる\n### 光は波なのだろうか？\n- 干渉・回折が起きる\n>>\n- しかし光電効果は波では説明できない'}
        ></textarea>

        {#if pages.length}
          <p class="mt-3 text-sm font-bold">
            {pages.length} ページを作ります（タイトルページ {titleCount}・本文ページ {pages.length - titleCount}）
          </p>
          <ol class="mt-1 max-h-40 overflow-y-auto rounded-box bg-base-200 p-2 text-sm">
            {#each pages as page, i (page.id)}
              <li class="flex items-center gap-2 py-0.5">
                <span class="w-6 text-right text-xs opacity-60">{i + 1}</span>
                <span class="badge badge-xs {page.kind === 'title' ? 'badge-secondary' : 'badge-ghost'}">
                  {page.kind === 'title' ? 'タイトル' : '本文'}
                </span>
                <span class="truncate">{page.title || '（無題）'}</span>
              </li>
            {/each}
          </ol>
        {:else if markdown.trim()}
          <p class="mt-3 text-sm text-warning">ページを作れる内容がありません。</p>
        {/if}
      {/if}
    </div>

    {#if !afterDiscard}
      <p class="mt-4 text-xs opacity-70">作業中のスライドは破棄されます（元に戻せません）。</p>
    {/if}
    <div class="modal-action mt-3">
      <!-- 起動時の「新しく作る」から開いた場合は作業中データがもうないので、閉じると空のスライドで始まる -->
      <button type="button" class="btn" onclick={() => (open = false)}>{afterDiscard ? '閉じる（空のスライドで始める）' : 'キャンセル'}</button>
      <button
        type="button"
        class="btn btn-primary"
        onclick={create}
        disabled={busy || (mode === 'markdown' && pages.length === 0)}
      >
        {mode === 'markdown' ? `${pages.length} ページで作成する` : '作成する'}
      </button>
    </div>
  </div>
  <form method="dialog" class="modal-backdrop"><button>close</button></form>
</dialog>
