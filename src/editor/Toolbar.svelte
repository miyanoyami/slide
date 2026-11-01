<script lang="ts">
  import { BODY_SCALES, FONTS, TEMPLATES, THEMES } from '../catalog';
  import { exportPdf, exportStreamHtml } from './actions.svelte';
  import { app } from './state.svelte';

  let { onhelp }: { onhelp: () => void } = $props();

  let busy = $state(false);
  /** PDF 作成中の進み具合（ボタンに表示する） */
  let pdfProgress = $state<string | null>(null);

  // デザイン設定はボタンの下に重ねて開くポップアップ。プレビューを見ながら変えられるよう、画面は暗くしない
  let settingsOpen = $state(false);
  let settingsBox = $state<HTMLElement>();

  function toggleSettings() {
    settingsOpen = !settingsOpen;
  }

  // サンプルのメニュー
  let samplesOpen = $state(false);
  let samplesBox = $state<HTMLElement>();

  // ポップアップ・メニューの外をクリックするか Esc で閉じる
  $effect(() => {
    if (!settingsOpen && !samplesOpen) return;
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (settingsBox && !settingsBox.contains(target)) settingsOpen = false;
      if (samplesBox && !samplesBox.contains(target)) samplesOpen = false;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        settingsOpen = false;
        samplesOpen = false;
      }
    };
    window.addEventListener('pointerdown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  });

  const settings = $derived(app.project.settings);
  const currentTheme = $derived(THEMES.find((t) => t.id === settings.theme) ?? THEMES[0]);

  /** 折りたたみ時に見せる現在の設定の要約 */
  const summary = $derived(
    [
      TEMPLATES.find((t) => t.id === settings.template)?.label,
      currentTheme.label,
      FONTS.find((f) => f.id === settings.font)?.label.replace(/（.*）/, ''),
      `本文 ${BODY_SCALES.find((s) => s.value === settings.bodyScale)?.label ?? '標準'}`,
      settings.safeArea.width > 0 && settings.safeArea.height > 0
        ? `余白 ${settings.safeArea.width}%×${settings.safeArea.height}%`
        : '余白なし',
    ].join(' ・ '),
  );

  function onPdf() {
    run(async () => {
      try {
        await exportPdf((done, total) => (pdfProgress = `PDF 作成中… ${done} / ${total}`));
      } finally {
        pdfProgress = null;
      }
    });
  }

  async function run(fn: () => Promise<void>) {
    busy = true;
    try {
      await fn();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      busy = false;
    }
  }


  function clampPercent(v: number): number {
    return Math.max(0, Math.min(100, Math.round(Number(v) || 0)));
  }
</script>

{#snippet swatch(colors: [string, string, string], size: string)}
  <span
    class="inline-block flex-none rounded-full border border-base-300 {size}"
    style="background: linear-gradient(135deg, {colors[0]} 0 40%, {colors[1]} 40% 75%, {colors[2]} 75%)"
  ></span>
{/snippet}

<header class="border-b border-base-300 bg-base-200">
  <div class="flex items-center gap-3 px-3 py-2">
    <h1 class="flex-none text-base font-bold">配信スライドメーカー</h1>

    <div class="relative min-w-0" bind:this={settingsBox}>
      <!-- 開閉できることが分かるよう、枠付きのボタンにして矢印と「変更」を添える -->
      <button
        type="button"
        class="btn btn-sm btn-outline min-w-0 justify-start gap-2 bg-base-100 font-normal {settingsOpen ? 'btn-active' : ''}"
        onclick={toggleSettings}
        aria-expanded={settingsOpen}
        aria-controls="design-settings"
        aria-haspopup="dialog"
      >
        <svg
          class="h-4 w-4 flex-none transition-transform {settingsOpen ? 'rotate-180' : ''}"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4z" />
        </svg>
        <span class="font-bold">デザイン設定</span>
        {@render swatch(currentTheme.swatch, 'h-4 w-4')}
        <span class="truncate text-xs opacity-70">{summary}</span>
        <span class="badge badge-primary badge-sm flex-none font-bold">変更</span>
      </button>
      {#if settingsOpen}
        <div
          id="design-settings"
          role="dialog"
          aria-label="デザイン設定"
          class="absolute left-0 top-full z-40 mt-2 flex w-[42rem] max-w-[90vw] flex-wrap items-end gap-x-6 gap-y-4 rounded-box border border-base-300 bg-base-100 p-4 shadow-xl"
        >
          <label class="grid gap-1">
            <span class="text-xs font-bold opacity-70">テンプレート</span>
            <select class="select select-sm w-28" bind:value={settings.template}>
              {#each TEMPLATES as t (t.id)}
                <option value={t.id}>{t.label}</option>
              {/each}
            </select>
          </label>

          <div class="grid gap-1">
            <span class="text-xs font-bold opacity-70">配色：{currentTheme.label}</span>
            <div class="flex h-8 items-center gap-1">
              {#each THEMES as t (t.id)}
                <button
                  type="button"
                  class="rounded-full border-2 p-0.5 {settings.theme === t.id ? 'border-base-content' : 'border-transparent'}"
                  title={t.label}
                  aria-label={t.label}
                  aria-pressed={settings.theme === t.id}
                  onclick={() => (settings.theme = t.id)}
                >
                  {@render swatch(t.swatch, 'h-6 w-6')}
                </button>
              {/each}
            </div>
          </div>

          <label class="grid gap-1">
            <span class="text-xs font-bold opacity-70">フォント</span>
            <select class="select select-sm w-56" bind:value={settings.font}>
              {#each FONTS as f (f.id)}
                <option value={f.id}>{f.label}</option>
              {/each}
            </select>
          </label>

          <label
            class="grid gap-1"
            title="全ページの本文の文字サイズの既定値。ページごとに別のサイズを選んだページは、そのページの設定が優先されます"
          >
            <span class="text-xs font-bold opacity-70">本文サイズの既定値</span>
            <select class="select select-sm w-24" bind:value={settings.bodyScale}>
              {#each BODY_SCALES as s (s.value)}
                <option value={s.value}>{s.label}</option>
              {/each}
            </select>
          </label>

          <div class="grid gap-1" title="アバター（立ち絵）が重なる右下の領域。0% なら余白なし">
            <span class="text-xs font-bold opacity-70">アバター用余白（右下）</span>
            <div class="flex items-center gap-1 text-sm">
              幅
              <input
                type="number"
                class="input input-sm w-16"
                min="0"
                max="100"
                value={settings.safeArea.width}
                onchange={(e) => (settings.safeArea.width = clampPercent(+e.currentTarget.value))}
              />% 高さ
              <input
                type="number"
                class="input input-sm w-16"
                min="0"
                max="100"
                value={settings.safeArea.height}
                onchange={(e) => (settings.safeArea.height = clampPercent(+e.currentTarget.value))}
              />%
            </div>
          </div>
        </div>
      {/if}
    </div>

    <div class="ml-auto flex flex-none items-center gap-2">
      <button type="button" class="btn btn-sm btn-ghost" onclick={onhelp}>使い方</button>
      <!-- 作例。public/samples/ に置いたファイルをそのまま開く -->
      <details class="dropdown dropdown-end" bind:open={samplesOpen} bind:this={samplesBox}>
        <summary class="btn btn-sm btn-ghost">サンプル</summary>
        <ul class="menu dropdown-content z-40 mt-1 w-64 rounded-box border border-base-300 bg-base-100 p-2 shadow-lg">
          <li>
            <a href="samples/slidemaker_sample.html" target="_blank" rel="noopener" onclick={() => (samplesOpen = false)}
              >配信用ページ（HTML）を開く</a
            >
          </li>
          <li>
            <a href="samples/slidemaker_sample.pdf" target="_blank" rel="noopener" onclick={() => (samplesOpen = false)}
              >PDF を開く</a
            >
          </li>
        </ul>
      </details>
      <button
        type="button"
        class="btn btn-sm btn-secondary"
        onclick={() => (app.newDialogOpen = true)}
        disabled={busy}
        title="新しいスライドを作る（空のスライド / Markdown から）">＋ 新規</button
      >
      <button
        type="button"
        class="btn btn-sm btn-primary btn-outline"
        onclick={onPdf}
        disabled={busy}
        title="段階表示の各ステップを1ページずつにした PDF。配信用メモは含みません。スライドの共有用"
        >{pdfProgress ?? 'スライドを PDF で DL'}</button
      >
      <button
        type="button"
        class="btn btn-sm btn-primary"
        onclick={() => run(exportStreamHtml)}
        disabled={busy}
        title="配信用メモを含む HTML。開くとスライドの下に配信用メモが表示されます">配信用ページを DL</button
      >
    </div>
  </div>

</header>
