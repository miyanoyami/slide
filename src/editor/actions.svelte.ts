// 配信用ページ（HTML）・スライド（PDF）の書き出しと新規作成。

import { newProject, type Page, type Project } from '../model';
import type { CaptureApi } from '../player/index';
import { buildExportHtml } from '../render/document';
import { renderDeck, type RenderedDeck } from '../render/slide';
import { imageDataUrl } from './images.svelte';
import { buildPdf, type PdfPageImage } from './pdf';
import { app, replaceProject } from './state.svelte';
import { collectGarbage, referencedImageIds } from './storage';

function download(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function baseName(project: Project): string {
  const title = project.pages[0]?.title.trim() || 'slide';
  return title.replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 60);
}

async function imageDataUrls(project: Project): Promise<Record<string, string>> {
  const urls: Record<string, string> = {};
  for (const id of referencedImageIds(project)) {
    const url = await imageDataUrl(id);
    if (url) urls[id] = url;
  }
  return urls;
}

function snapshot(): Project {
  return $state.snapshot(app.project) as Project;
}

async function renderForExport(): Promise<{ project: Project; deck: RenderedDeck }> {
  const project = snapshot();
  const images = await imageDataUrls(project);
  return { project, deck: renderDeck(project, { resolveImage: (id) => images[id] }) };
}

/** 配信用ページ（配信用メモ付きの HTML）を書き出す */
export async function exportStreamHtml(): Promise<void> {
  const { project, deck } = await renderForExport();
  const html = buildExportHtml(project, deck, 'stream');
  download(`${baseName(project)}_配信用.html`, new Blob([html], { type: 'text/html' }));
}

/**
 * スライドを PDF で書き出す。段階表示の各ステップを1ページずつにする。
 * 隠し iframe でスライドを表示し、プレイヤーの capture API で各ステップを JPEG にしてまとめる。
 */
export async function exportPdf(onProgress: (done: number, total: number) => void): Promise<void> {
  const { project, deck } = await renderForExport();
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;left:-10000px;top:0;width:1920px;height:1080px;border:0;';
  const loaded = new Promise<void>((resolve) => iframe.addEventListener('load', () => resolve(), { once: true }));
  iframe.srcdoc = buildExportHtml(project, deck, 'capture');
  document.body.append(iframe);
  try {
    await loaded;
    const api = (iframe.contentWindow as unknown as { vsCapture?: CaptureApi }).vsCapture;
    if (!api) throw new Error('PDF の準備に失敗しました');
    await api.ready;
    const steps = api.maxSteps().flatMap((max, page) => Array.from({ length: max + 1 }, (_, step) => ({ page, step })));
    const images: PdfPageImage[] = [];
    onProgress(0, steps.length);
    for (const [i, { page, step }] of steps.entries()) {
      const blob = await api.capture(page, step);
      images.push({ jpeg: new Uint8Array(await blob.arrayBuffer()), width: 1920, height: 1080 });
      onProgress(i + 1, steps.length);
    }
    download(`${baseName(project)}.pdf`, buildPdf(images));
  } finally {
    iframe.remove();
  }
}

/**
 * 作業中のスライドを破棄して新しく始める。デザイン設定（テンプレート・配色など）は引き継ぐ。
 * pages を渡すと（Markdown からの取り込み）、そのページで始める。
 */
export async function startNewProject(pages?: Page[]): Promise<void> {
  const project = newProject();
  project.settings = snapshot().settings;
  if (pages?.length) project.pages = pages;
  replaceProject(project);
  await collectGarbage(project);
}
