// プロジェクト → スライド HTML の生成。プレビューと書き出しの両方でこの関数を使う。

import type { Page, Project } from '../model';
import { escapeHtml } from './escape';
import { parseBody } from './markdown';

export interface RenderOptions {
  /** 画像 ID → src に使う URL（プレビューは blob: URL、書き出しは data: URL） */
  resolveImage: (id: string) => string | undefined;
}

export interface RenderedPage {
  title: string;
  maxStep: number;
  /** ステップごとの配信用メモ（HTML）。長さはステップ数（maxStep + 1）にそろえる */
  notes: string[];
}

export interface RenderedDeck {
  html: string;
  pages: RenderedPage[];
}

export function renderDeck(project: Project, opts: RenderOptions): RenderedDeck {
  const pages: RenderedPage[] = [];
  const html = project.pages
    .map((page, index) => {
      const r =
        page.kind === 'title'
          ? renderTitlePage(page, index)
          : renderContentPage(page, index, page.bodyScale ?? project.settings.bodyScale ?? 1, opts);
      pages.push({ title: page.title, maxStep: r.maxStep, notes: renderNotes(page.notes ?? [], r.maxStep) });
      return r.html;
    })
    .join('\n');
  return { html, pages };
}

/** 配信用メモをステップ数にそろえて HTML にする（ステップが減った分のメモは出力しない） */
function renderNotes(notes: string[], maxStep: number): string[] {
  return Array.from({ length: maxStep + 1 }, (_, i) => escapeHtml((notes[i] ?? '').trim()).replace(/\n/g, '<br>'));
}

function stepAttr(step: number): string {
  return step > 0 ? ` data-step="${step}"` : '';
}

function section(
  kind: string,
  index: number,
  maxStep: number,
  title: string,
  extraClass: string,
  inner: string,
  style = '',
): string {
  return `<section class="slide slide--${kind}${extraClass}" data-index="${index}" data-max-step="${maxStep}" data-title="${escapeHtml(title)}"${style ? ` style="${style}"` : ''}>${inner}</section>`;
}

function renderTitlePage(page: Page, index: number): { html: string; maxStep: number } {
  const subtitle = page.subtitle.trim()
    ? `<p class="slide__subtitle">${escapeHtml(page.subtitle).replace(/\n/g, '<br>')}</p>`
    : '';
  const meta = [
    page.author?.trim() ? `<span class="slide__author">${escapeHtml(page.author.trim())}</span>` : '',
    page.date?.trim() ? `<span class="slide__date">${escapeHtml(page.date.trim())}</span>` : '',
  ].join('');
  const metaHtml = meta ? `<p class="slide__meta">${meta}</p>` : '';
  const inner = `<div class="slide__center"><h1 class="slide__title">${escapeHtml(page.title).replace(/\n/g, '<br>')}</h1>${subtitle}${metaHtml}</div>`;
  return { html: section('title', index, 0, page.title, '', inner), maxStep: 0 };
}

function renderContentPage(page: Page, index: number, bodyScale: number, opts: RenderOptions): { html: string; maxStep: number } {
  const body = parseBody(page.body);
  let maxStep = body.maxStep;

  const image = page.image;
  const src = image ? opts.resolveImage(image.id) : undefined;
  const layout = image && src ? image.layout : 'text';

  let figure = '';
  let overlay = '';
  if (image && src) {
    maxStep = Math.max(maxStep, image.step);
    const img = `<img src="${escapeHtml(src)}" alt="">`;
    const caption = image.caption?.trim()
      ? `<figcaption class="slide__caption">${escapeHtml(image.caption.trim()).replace(/\n/g, '<br>')}</figcaption>`
      : '';
    if (image.layout === 'overlay') {
      overlay = `<figure class="slide__overlay" style="width:${clamp(image.overlaySize, 5, 100)}%"${stepAttr(image.step)}>${img}${caption}</figure>`;
    } else {
      figure = `<figure class="slide__figure"${stepAttr(image.step)}>${img}${caption}</figure>`;
    }
  }

  const bodyHtml = `<div class="slide__body md"><div class="safe-spacer" aria-hidden="true"></div>${body.html}</div>`;
  const main = layout === 'left' || layout === 'large' ? figure + bodyHtml : bodyHtml + figure;
  const inner =
    `<header class="slide__header"><h1 class="slide__title">${escapeHtml(page.title)}</h1></header>` +
    `<div class="slide__main">${main}</div>` +
    overlay +
    `<div class="slide__number">${index + 1}</div>`;
  const style = `--body-scale:${clamp(bodyScale, 0.5, 2)}`;
  return { html: section('content', index, maxStep, page.title, ` layout--${layout}`, inner, style), maxStep };
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(n) ? n : min));
}
