<script lang="ts">
  import { fontLicenses, libraryLicenses, ownLicense } from 'virtual:licenses';
  import { FONTS } from '../catalog';

  let { open = $bindable(false) }: { open: boolean } = $props();

  let dialog = $state<HTMLDialogElement>();

  $effect(() => {
    if (open && !dialog?.open) dialog?.showModal();
    if (!open && dialog?.open) dialog.close();
  });

  const fontLabel = (id: string) => (id === 'mono' ? 'コード用（M PLUS 1 Code）' : (FONTS.find((f) => f.id === id)?.label ?? id));
</script>

<dialog bind:this={dialog} class="modal" onclose={() => (open = false)}>
  <div class="modal-box max-w-2xl text-sm leading-relaxed">
    <h2 class="mb-3 text-lg font-bold">ご利用にあたって</h2>
    <ul class="list-disc space-y-1 pl-5">
      <li>入力した文章や画像は、どこにも送信されません。すべてこのブラウザの中だけで処理されます。</li>
      <li>スライドに入れる画像や文章の権利（著作権など）は、利用する方ご自身で確認してください。</li>
      <li>このツールは無保証です。利用によって生じた損害について、作者は責任を負いません。</li>
    </ul>

    <h2 class="mt-6 mb-2 text-lg font-bold">ライセンス</h2>
    <p>このツールは MIT ライセンスで公開しています。</p>
    <details class="mt-2 rounded-box bg-base-200 px-3 py-2">
      <summary class="cursor-pointer font-bold">配信スライドメーカー（MIT）</summary>
      <pre class="mt-2 text-xs whitespace-pre-wrap">{ownLicense}</pre>
    </details>

    <p class="mt-4">次のフォント・ソフトウェアを使用しています。</p>
    <div class="mt-2 space-y-2">
      {#each Object.entries(fontLicenses) as [id, f] (id)}
        <details class="rounded-box bg-base-200 px-3 py-2">
          <summary class="cursor-pointer font-bold">フォント：{fontLabel(id)}（SIL Open Font License 1.1）</summary>
          <pre class="mt-2 text-xs whitespace-pre-wrap">{f.text}</pre>
        </details>
      {/each}
      {#each libraryLicenses as l (l.name)}
        <details class="rounded-box bg-base-200 px-3 py-2">
          <summary class="cursor-pointer font-bold">{l.name}</summary>
          <pre class="mt-2 text-xs whitespace-pre-wrap">{l.text}</pre>
        </details>
      {/each}
    </div>

    <div class="modal-action">
      <button type="button" class="btn" onclick={() => (open = false)}>閉じる</button>
    </div>
  </div>
  <form method="dialog" class="modal-backdrop"><button>close</button></form>
</dialog>
