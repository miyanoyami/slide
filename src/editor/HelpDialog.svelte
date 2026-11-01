<script lang="ts">
  let { open = $bindable(false) }: { open: boolean } = $props();

  let dialog = $state<HTMLDialogElement>();

  $effect(() => {
    if (open && !dialog?.open) dialog?.showModal();
    if (!open && dialog?.open) dialog.close();
  });
</script>

{#snippet step(n: number, title: string)}
  <h3 class="flex items-center gap-2 font-bold">
    <span class="badge badge-primary badge-sm">{n}</span>{title}
  </h3>
{/snippet}

<dialog bind:this={dialog} class="modal" onclose={() => (open = false)}>
  <div class="modal-box max-w-xl text-sm leading-relaxed">
    <h2 class="text-lg font-bold">使い方</h2>
    <p class="mt-1 mb-5 opacity-80">それなりに見やすく整ったスライドを、簡単に作れるサービスです。<br />配信用のメモ付きスライドショーも同時に作れます。</p>

    <div class="space-y-5">
      <section>
        {@render step(1, 'スライドを作る')}
        <ul class="mt-1 list-disc space-y-0.5 pl-6">
          <li>左の「＋ ページを追加」でページを増やし、文字や画像を入れます。</li>
          <li>本文に <code>&gt;&gt;</code> と書くと、そこから後ろはクリックで順に出ます。</li>
          <li>見た目は上の「デザイン設定」で変えられます。</li>
        </ul>
      </section>

      <section>
        {@render step(2, '配信で使う')}
        <ul class="mt-1 list-disc space-y-0.5 pl-6">
          <li>「配信用ページを DL」で保存して、ブラウザで開きます。</li>
          <li>スライドの下にメモが出るので、OBS ではスライドの部分だけを切り取って映します。</li>
          <li>ページ送りは <kbd class="kbd kbd-xs">→</kbd> キーかクリック、戻るのは <kbd class="kbd kbd-xs">←</kbd> キーです。</li>
        </ul>
      </section>

      <section>
        {@render step(3, 'スライドを共有する')}
        <ul class="mt-1 list-disc space-y-0.5 pl-6">
          <li>「スライドを PDF で DL」で保存し、メールや SNS など都合のよい方法で渡してください（メモは入りません）。</li>
        </ul>
      </section>
    </div>

    <p class="mt-5">
      作例：<a class="link" href="samples/slidemaker_sample.html" target="_blank" rel="noopener">配信用ページ（HTML）</a> ／
      <a class="link" href="samples/slidemaker_sample.pdf" target="_blank" rel="noopener">PDF</a>
    </p>

    <details class="mt-4 rounded-box bg-base-200 px-4 py-2">
      <summary class="cursor-pointer font-bold">こまかいこと</summary>
      <ul class="mt-2 list-disc space-y-1 pl-5 text-xs">
        <li>「新規」から、用意した Markdown を貼り付けてスライドを作ることもできます（見出しごとに1ページ。画像は入りません）。</li>
        <li>アバターが重なる場合は、デザイン設定の「アバター用余白」に幅と高さを入れると、文字がそこを避けます。</li>
        <li>OBS で切り取る範囲：左から 16・上から 16 の位置から、メモ欄に出る「表示サイズ」の大きさです。ウィンドウの大きさを変えたら切り取り直してください。</li>
        <li>作業中のスライドはこのブラウザに自動で保存されます（1つだけ）。完成したら DL したファイルを保管してください。</li>
      </ul>
    </details>

    <p class="mt-4 text-xs opacity-60">
      作者：<a class="link" href="https://x.com/miyanoyami83" target="_blank" rel="noopener noreferrer">@miyanoyami83</a>
    </p>

    <div class="modal-action">
      <button type="button" class="btn" onclick={() => (open = false)}>閉じる</button>
    </div>
  </div>
  <form method="dialog" class="modal-backdrop"><button>close</button></form>
</dialog>
