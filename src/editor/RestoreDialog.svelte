<script lang="ts">
  import { app } from './state.svelte';

  let { onresolve }: { onresolve: (load: boolean) => void } = $props();

  let dialog = $state<HTMLDialogElement>();

  $effect(() => {
    if (app.restore && !dialog?.open) dialog?.showModal();
  });

  function choose(load: boolean) {
    dialog?.close();
    onresolve(load);
  }
</script>

<!-- Esc で閉じて未回答のままにならないよう、cancel は無効にする -->
<dialog bind:this={dialog} class="modal" oncancel={(e) => e.preventDefault()}>
  {#if app.restore}
    <div class="modal-box">
      <h2 class="text-lg font-bold">編集途中のデータが見つかりました</h2>
      <p class="mt-3">読み込みますか？</p>
      <p class="mt-2 rounded-box bg-base-200 px-4 py-3 text-sm">
        「{app.restore.title}」（{app.restore.pages} ページ）
      </p>
      <p class="mt-3 text-xs opacity-70">「新しく作る」を選ぶと、編集途中のデータは削除されます。</p>
      <div class="modal-action">
        <button type="button" class="btn" onclick={() => choose(false)}>新しく作る</button>
        <button type="button" class="btn btn-primary" onclick={() => choose(true)}>読み込む</button>
      </div>
    </div>
  {/if}
</dialog>
