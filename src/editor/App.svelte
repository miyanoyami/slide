<script lang="ts">
  import { onMount } from 'svelte';
  import AboutDialog from './AboutDialog.svelte';
  import HelpDialog from './HelpDialog.svelte';
  import { ensureImageUrls } from './images.svelte';
  import PageForm from './PageForm.svelte';
  import PageList from './PageList.svelte';
  import Preview from './Preview.svelte';
  import NewProjectDialog from './NewProjectDialog.svelte';
  import RestoreDialog from './RestoreDialog.svelte';
  import { app, persist, resolveRestore } from './state.svelte';
  import { collectGarbage, referencedImageIds } from './storage';
  import Toolbar from './Toolbar.svelte';

  let helpOpen = $state(false);
  let aboutOpen = $state(false);
  let storageWarning = $state<string | null>(null);

  // 編集のたびに自動保存（記述途中の喪失対策）。起動時の確認が済むまでは保存しない
  $effect(() => {
    const json = JSON.stringify(app.project);
    if (!app.ready) return;
    const timer = setTimeout(() => persist(json), 300);
    return () => clearTimeout(timer);
  });

  /** 画像の表示用 URL を用意し、使われなくなった画像を掃除する */
  async function prepareImages() {
    try {
      await ensureImageUrls(referencedImageIds(app.project));
      await collectGarbage($state.snapshot(app.project));
    } catch {
      storageWarning = 'このブラウザでは画像を保存できません（IndexedDB が使えません）。画像は再読み込みすると消えます。';
    }
  }

  function onResolve(load: boolean) {
    resolveRestore(load);
    prepareImages();
  }

  onMount(() => {
    if (app.ready) prepareImages();
  });
</script>

<div class="flex h-screen flex-col bg-base-100 text-base-content">
  <Toolbar onhelp={() => (helpOpen = true)} />
  {#if app.saveError}
    <div role="alert" class="alert alert-error rounded-none py-2 text-sm">{app.saveError}</div>
  {/if}
  {#if storageWarning}
    <div role="alert" class="alert alert-warning rounded-none py-2 text-sm">{storageWarning}</div>
  {/if}
  <div class="grid min-h-0 flex-1 grid-cols-[12rem_minmax(24rem,1.1fr)_minmax(0,1.15fr)]">
    <PageList />
    <PageForm />
    <Preview />
  </div>
  <footer class="flex flex-none items-center justify-end gap-4 border-t border-base-300 bg-base-200 px-3 py-1 text-xs">
    <button type="button" class="link link-hover opacity-70" onclick={() => (aboutOpen = true)}>ご利用にあたって・ライセンス</button>
    <span><span class="opacity-70">作者：</span>
    <a class="link link-hover opacity-70" href="https://x.com/miyanoyami83" target="_blank" rel="noopener noreferrer"
      >@miyanoyami83</a
    ></span>
  </footer>
</div>

<HelpDialog bind:open={helpOpen} />
<AboutDialog bind:open={aboutOpen} />
<RestoreDialog onresolve={onResolve} />
<NewProjectDialog bind:open={app.newDialogOpen} afterDiscard={app.newDialogAfterDiscard} />
