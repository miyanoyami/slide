<script lang="ts">
  import { addPage, app, deletePage, duplicatePage, movePage, selectPage } from './state.svelte';

  function onDelete(i: number) {
    if (confirm(`${i + 1} ページ目を削除しますか？`)) deletePage(i);
  }
</script>

<aside class="flex min-h-0 flex-col border-r border-base-300 bg-base-200">
  <ol class="flex-1 space-y-1 overflow-y-auto p-2">
    {#each app.project.pages as page, i (page.id)}
      {@const selected = i === app.selected}
      <li>
        <div
          class="rounded-box border p-2 text-left {selected
            ? 'border-primary bg-base-100 shadow-sm'
            : 'border-transparent hover:bg-base-100/60'}"
        >
          <button type="button" class="block w-full cursor-pointer text-left" onclick={() => selectPage(i)}>
            <span class="flex items-center gap-2 text-xs">
              <span class="opacity-60">{i + 1}</span>
              <span class="badge badge-xs {page.kind === 'title' ? 'badge-secondary' : 'badge-ghost'}">
                {page.kind === 'title' ? 'タイトル' : '本文'}
              </span>
              {#if page.image}<span class="badge badge-xs badge-outline">画像</span>{/if}
              {#if app.overflow.includes(i)}<span class="text-warning" title="内容が収まっていません">⚠</span>{/if}
            </span>
            <span class="mt-1 block truncate text-sm font-medium">{page.title || '（無題）'}</span>
          </button>
          {#if selected}
            <div class="mt-2 flex gap-1">
              <button type="button" class="btn btn-xs" onclick={() => movePage(i, -1)} disabled={i === 0} aria-label="上へ">↑</button>
              <button
                type="button"
                class="btn btn-xs"
                onclick={() => movePage(i, 1)}
                disabled={i === app.project.pages.length - 1}
                aria-label="下へ">↓</button
              >
              <button type="button" class="btn btn-xs" onclick={() => duplicatePage(i)}>複製</button>
              <button
                type="button"
                class="btn btn-xs btn-ghost text-error"
                onclick={() => onDelete(i)}
                disabled={app.project.pages.length <= 1}>削除</button
              >
            </div>
          {/if}
        </div>
      </li>
    {/each}
  </ol>
  <div class="border-t border-base-300 bg-base-200 p-3">
    <button
      type="button"
      class="btn btn-primary w-full text-base shadow-md"
      onclick={() => addPage()}
      title="選択中のページの後ろに本文ページを追加します。タイトルページにしたい場合は、追加後に右の入力欄で切り替えてください"
      >＋ ページを追加</button
    >
  </div>
</aside>
