<script lang="ts">
  import { onMount } from 'svelte';
  import type { Project } from '../model';
  import { buildPreviewShell } from '../render/document';
  import { renderDeck } from '../render/slide';
  import { imageUrls } from './images.svelte';
  import { app } from './state.svelte';

  // フォントを含む大きな HTML なので一度だけ作る。中身は postMessage で差し替える
  const srcdoc = buildPreviewShell();

  let iframe = $state<HTMLIFrameElement>();
  let ready = $state(false);

  onMount(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== iframe?.contentWindow) return;
      if (e.data?.type === 'vslide:ready') ready = true;
      if (e.data?.type === 'vslide:layout') {
        app.overflow = e.data.overflow;
        app.previewMaxStep = e.data.maxStep;
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  });

  $effect(() => {
    if (!ready) return;
    // JSON 化でプロジェクト全体の変更を追跡する
    const project = JSON.parse(JSON.stringify(app.project)) as Project;
    const urls = { ...imageUrls };
    const message = {
      type: 'vslide:render',
      template: project.settings.template,
      theme: project.settings.theme,
      font: project.settings.font,
      safeArea: project.settings.safeArea,
      page: app.selected,
      step: app.previewStep,
    };
    const timer = setTimeout(() => {
      const deck = renderDeck(project, { resolveImage: (id) => urls[id] });
      iframe?.contentWindow?.postMessage({ ...message, deckHtml: deck.html }, '*');
    }, 120);
    return () => clearTimeout(timer);
  });

  const safeArea = $derived(app.project.settings.safeArea);
  const hasSafeArea = $derived(safeArea.width > 0 && safeArea.height > 0);

  const page = $derived(app.project.pages[app.selected]);

  /** 表示中のステップのメモを書き換える（配列が短ければ空文字で埋める） */
  function setNote(value: string) {
    const notes = page.notes;
    while (notes.length <= shownStep) notes.push('');
    notes[shownStep] = value;
  }

  const shownStep = $derived(app.previewStep < 0 ? app.previewMaxStep : Math.min(app.previewStep, app.previewMaxStep));

  function setStep(s: number) {
    app.previewStep = s >= app.previewMaxStep ? -1 : Math.max(0, s);
  }
</script>

<section class="flex min-h-0 flex-col gap-3 overflow-y-auto bg-base-300/40 p-4">
  <div class="aspect-video w-full overflow-hidden rounded-box bg-black shadow">
    <iframe bind:this={iframe} title="プレビュー" {srcdoc} class="h-full w-full border-0"></iframe>
  </div>

  <div class="flex flex-wrap items-center gap-3 text-sm">
    <div class="join">
      <button type="button" class="btn join-item btn-sm" onclick={() => setStep(shownStep - 1)} disabled={shownStep <= 0}>◀</button>
      <span class="join-item flex items-center bg-base-100 px-3">ステップ {shownStep + 1} / {app.previewMaxStep + 1}</span>
      <button
        type="button"
        class="btn join-item btn-sm"
        onclick={() => setStep(shownStep + 1)}
        disabled={shownStep >= app.previewMaxStep}>▶</button
      >
    </div>
  </div>

  {#if page}
    <fieldset class="fieldset rounded-box border border-base-300 bg-base-100 px-4 pb-3">
      <legend class="fieldset-legend">
        配信用メモ
        <span class="badge badge-primary badge-sm">
          {app.selected + 1} ページ目・ステップ {shownStep + 1} / {app.previewMaxStep + 1}
        </span>
      </legend>
      <textarea
        class="textarea h-28 w-full"
        value={page.notes[shownStep] ?? ''}
        oninput={(e) => setNote(e.currentTarget.value)}
        placeholder="上のプレビューに表示しているステップで話す内容のメモ。◀ ▶ でステップを切り替えると、そのステップのメモを書けます。「配信用ページを DL」したページで、スライドの下に表示されます（配信には映りません）。"
      ></textarea>
    </fieldset>
  {/if}

  {#if hasSafeArea}
    <p class="flex items-start gap-2 text-xs opacity-80">
      <span class="mt-0.5 inline-block h-3 w-4 flex-none border-2 border-dashed border-red-500 bg-red-500/15"></span>
      <span>
        赤い点線の枠はアバター用余白（右下 幅 {safeArea.width}%・高さ {safeArea.height}%）です。プレビューでの目安として表示しているだけで、DL したページには表示されません。タイトルページには適用されません。
      </span>
    </p>
  {/if}

  {#if app.overflow.includes(app.selected)}
    <div role="alert" class="alert alert-warning py-2 text-sm">
      このページは内容が収まりきっていません。文章を減らすか、ページを分けてください。
    </div>
  {/if}
  {#if app.overflow.length}
    <p class="text-xs opacity-70">収まっていないページ：{app.overflow.map((i) => i + 1).join('、')}</p>
  {/if}
</section>
