// 書き出し HTML とプレビューに埋め込むプレイヤー。
// ページ送り・段階表示・アバター用余白調整・メモ表示モードを担当する。

import { layoutSlide, SLIDE_H, SLIDE_W, type SafeArea } from './layout';

interface PlayerConfig {
  safeArea: SafeArea;
  /** ページごとの配信用メモセグメント（HTML）。配信用ページは常にメモ表示モードで表示し、スライドページだけなら null */
  scripts: string[][] | null;
}

/** プレビュー（編集画面）から送られるメッセージ */
interface RenderMessage {
  type: 'vslide:render';
  deckHtml: string;
  template: string;
  theme: string;
  font: string;
  safeArea: SafeArea;
  page: number;
  /** -1 なら全ステップ表示 */
  step: number;
}

/** メモ表示モードでスライドの周囲に設ける余白（px） */
const SCRIPT_MARGIN = 16;
/** メモ表示モードで配信用メモ欄に最低限確保する高さ（px） */
const SCRIPT_PANEL_MIN_H = 240;

const root = document.documentElement;
const isPreview = root.hasAttribute('data-preview');
/** PDF 書き出し用（編集画面が隠し iframe で開き、各ステップを画像にする） */
const isCapture = root.hasAttribute('data-capture');
const stage = document.getElementById('vs-stage') as HTMLElement;
const deck = document.getElementById('vs-deck') as HTMLElement;
const indicator = document.getElementById('vs-safe-indicator') as HTMLElement;
const scriptPanel = document.getElementById('vs-script') as HTMLElement;

const config: PlayerConfig = readConfig();
let slides: HTMLElement[] = [];
let page = 0;
let step = 0;
/** 配信用メモ欄の目次を開いているか */
let tocOpen = false;

function readConfig(): PlayerConfig {
  const el = document.getElementById('vs-config');
  const fallback: PlayerConfig = { safeArea: { width: 0, height: 0 }, scripts: null };
  if (!el?.textContent) return fallback;
  try {
    return { ...fallback, ...JSON.parse(el.textContent) };
  } catch {
    return fallback;
  }
}

function maxStep(i: number): number {
  return Number(slides[i]?.dataset.maxStep || 0);
}

function collectSlides(): void {
  slides = Array.from(deck.querySelectorAll<HTMLElement>(':scope > .slide'));
}

function applySafeVars(): void {
  const { width, height } = config.safeArea;
  stage.style.setProperty('--safe-w', `${(SLIDE_W * width) / 100}px`);
  stage.style.setProperty('--safe-h', `${(SLIDE_H * height) / 100}px`);
}

/** 全スライドのアバター用余白調整を行い、あふれているページ番号を返す */
function layoutAll(): number[] {
  const overflow: number[] = [];
  slides.forEach((slide, i) => {
    const wasCurrent = slide.classList.contains('is-current');
    slide.classList.add('is-current');
    if (layoutSlide(slide, config.safeArea)) overflow.push(i);
    if (!wasCurrent) slide.classList.remove('is-current');
  });
  return overflow;
}

function show(): void {
  slides.forEach((s, i) => s.classList.toggle('is-current', i === page));
  const cur = slides[page];
  cur?.querySelectorAll<HTMLElement>('[data-step]').forEach((el) => {
    el.classList.toggle('is-step-hidden', Number(el.dataset.step) > step);
  });
  renderScript();
  if (!isPreview && !isCapture && slides.length) {
    history.replaceState(null, '', `#${page + 1}`);
  }
}

function next(): void {
  if (step < maxStep(page)) step++;
  else if (page < slides.length - 1) {
    page++;
    step = 0;
  }
  show();
}

function prev(): void {
  if (step > 0) step--;
  else if (page > 0) {
    page--;
    step = maxStep(page);
  }
  show();
}

/** 指定ページの最初のステップへ移動する */
function goTo(i: number): void {
  page = Math.max(0, Math.min(slides.length - 1, i));
  step = 0;
  show();
}

// ---- 拡縮 ----

function fit(): void {
  const scriptMode = config.scripts !== null && !isPreview;
  let scale: number;
  let left = 0;
  let top = 0;
  if (scriptMode) {
    // メモ表示モード：配信用メモ欄の高さを残してウィンドウに収まる大きさにする。
    // 起点は常に左上の余白位置（OBS のクロップ位置がウィンドウサイズで変わらないように）
    const availW = window.innerWidth - SCRIPT_MARGIN * 2;
    const availH = window.innerHeight - SCRIPT_MARGIN * 2 - SCRIPT_PANEL_MIN_H;
    scale = Math.max(0.1, Math.min(availW / SLIDE_W, availH / SLIDE_H));
    left = SCRIPT_MARGIN;
    top = SCRIPT_MARGIN;
    scriptPanel.style.top = `${SLIDE_H * scale + SCRIPT_MARGIN * 2}px`;
    slideSize = `${Math.round(SLIDE_W * scale)}×${Math.round(SLIDE_H * scale)}`;
  } else {
    scale = Math.min(window.innerWidth / SLIDE_W, window.innerHeight / SLIDE_H);
    left = (window.innerWidth - SLIDE_W * scale) / 2;
    top = (window.innerHeight - SLIDE_H * scale) / 2;
  }
  stage.style.transform = `translate(${left}px, ${top}px) scale(${scale})`;
  scriptPanel.hidden = !scriptMode;
  renderScript();
}

/** メモ表示モードでのスライドの表示サイズ（OBS のクロップ用に配信用メモ欄へ表示する） */
let slideSize = '';

// ---- 配信用メモ ----

function renderScript(): void {
  if (!config.scripts || scriptPanel.hidden) return;
  const notes = config.scripts[page] ?? [];
  const nextTitle = slides[page + 1]?.dataset.title;
  // ステップごとのメモを並べ、現在のステップを強調する。空のステップは現在のときだけ表示する
  const total = maxStep(page) + 1;
  let text = '';
  for (let i = 0; i < total; i++) {
    const note = notes[i] ?? '';
    if (!note && i !== step) continue;
    const label = total > 1 ? `<span class="vs-seg__label">ステップ ${i + 1}</span>` : '';
    const body = note || '<span class="vs-script__empty">（このステップのメモはありません）</span>';
    text += `<div class="vs-seg${i === step ? ' is-current' : ''}">${label}${body}</div>`;
  }
  scriptPanel.innerHTML =
    `<div class="vs-script__bar">` +
    // ステップは利用者向けに 1 始まりで表示する（最初の状態が「ステップ 1 / 1」）
    // ページ番号は直接書き換えて Enter で移動できる
    `<span class="vs-script__page"><input class="vs-page-input" type="number" min="1" max="${slides.length}" value="${page + 1}" aria-label="ページ番号（書き換えて Enter で移動）" title="書き換えて Enter で移動"> / ${slides.length} ページ<small>（ステップ ${step + 1} / ${maxStep(page) + 1}）</small></span>` +
    `<span class="vs-script__next">${nextTitle !== undefined ? `次ページ：${escapeText(nextTitle)}` : '（最後のページ）'}</span>` +
    `<div class="vs-toc"><button type="button" data-act="toc-toggle" aria-expanded="${tocOpen}">目次 ${tocOpen ? '▴' : '▾'}</button>${tocOpen ? `<div class="vs-toc__panel" role="menu">${tocItems()}</div>` : ''}</div>` +
    `<span class="vs-script__size" title="OBS でクロップする範囲（左 ${SCRIPT_MARGIN}・上 ${SCRIPT_MARGIN} から）">表示サイズ ${slideSize}</span>` +
    `<button type="button" data-act="prev"${page <= 0 && step <= 0 ? ' disabled' : ''}>◀ 前へ</button>` +
    `<button type="button" data-act="next"${page >= slides.length - 1 && step >= maxStep(page) ? ' disabled' : ''}>次へ ▶</button>` +
    `</div><div class="vs-script__text">${text}</div>`;
  scriptPanel.querySelector('.vs-seg.is-current')?.scrollIntoView({ block: 'nearest' });
  if (tocOpen) {
    // 目次はウィンドウの下端からはみ出さない高さにし、表示中のページが見えるようにする
    const panel = scriptPanel.querySelector<HTMLElement>('.vs-toc__panel');
    if (panel) {
      panel.style.maxHeight = `${Math.max(120, window.innerHeight - panel.getBoundingClientRect().top - 12)}px`;
      panel.querySelector('.is-current')?.scrollIntoView({ block: 'nearest' });
    }
  }
}

function setTocOpen(open: boolean): void {
  if (tocOpen === open) return;
  tocOpen = open;
  renderScript();
}

/** 目次の項目。字下げはせず、タイトルページだけ太字にする */
function tocItems(): string {
  return slides
    .map((s, i) => {
      const isTitle = s.classList.contains('slide--title');
      const cls = ['vs-toc__item', isTitle ? 'is-title' : '', i === page ? 'is-current' : '']
        .filter(Boolean)
        .join(' ');
      const title = s.dataset.title?.trim() || '（無題）';
      return `<button type="button" role="menuitem" class="${cls}" data-page="${i}"><span class="vs-toc__num">${i + 1}</span>${escapeText(title)}</button>`;
    })
    .join('');
}

/** ページ番号・目次からの移動。移動先のページは最初のステップから表示する */
function jumpTo(i: number): void {
  if (!Number.isInteger(i) || i < 0 || i >= slides.length) return;
  tocOpen = false;
  goTo(i);
  // 入力欄にフォーカスが残るとキー操作でページ送りできないので外す
  (document.activeElement as HTMLElement | null)?.blur();
}

function escapeText(s: string): string {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

// ---- 初期化 ----

function relayout(): number[] {
  const overflow = layoutAll();
  show();
  return overflow;
}

/** 画像・フォントの読み込みでレイアウトが変わるので、読み込み後にもう一度調整する */
function relayoutWhenReady(onDone?: (overflow: number[]) => void): void {
  const imgs = Array.from(deck.querySelectorAll('img')).filter((img) => !img.complete);
  const waits: Promise<unknown>[] = imgs.map(
    (img) =>
      new Promise((res) => {
        img.addEventListener('load', res, { once: true });
        img.addEventListener('error', res, { once: true });
      }),
  );
  if (document.fonts) waits.push(document.fonts.ready);
  Promise.all(waits).then(() => {
    const overflow = relayout();
    onDone?.(overflow);
  });
}

function initExport(): void {
  collectSlides();
  applySafeVars();
  fit();
  const hash = Number(location.hash.slice(1));
  page = Number.isInteger(hash) && hash >= 1 ? Math.min(hash, slides.length) - 1 : 0;
  step = 0;
  relayout();
  relayoutWhenReady();

  window.addEventListener('resize', fit);
  window.addEventListener('keydown', onKey);
  // 目次を開いているときにスライドをクリックしたら、ページ送りせずに目次を閉じるだけにする
  stage.addEventListener('click', () => (tocOpen ? setTocOpen(false) : next()));
  // ボタンにフォーカスが残ると Space キーでボタンも押されてしまうため、フォーカスさせない
  scriptPanel.addEventListener('mousedown', (e) => {
    if ((e.target as HTMLElement).closest('button')) e.preventDefault();
  });
  scriptPanel.addEventListener('keydown', (e) => {
    const el = e.target as HTMLElement;
    if (!el.classList.contains('vs-page-input')) return;
    const input = el as HTMLInputElement;
    if (e.key === 'Enter') {
      const n = Number(input.value);
      if (Number.isInteger(n) && n >= 1 && n <= slides.length) jumpTo(n - 1);
      else input.value = String(page + 1); // 範囲外の番号は元に戻す
    } else if (e.key === 'Escape') {
      input.value = String(page + 1);
      input.blur();
    }
  });
  scriptPanel.addEventListener('focusout', (e) => {
    // Enter を押さずに入力欄から離れたら、表示を現在のページ番号に戻す
    const el = e.target as HTMLInputElement;
    if (el.classList.contains('vs-page-input')) el.value = String(page + 1);
  });
  scriptPanel.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('button');
    if (btn?.dataset.page !== undefined) {
      jumpTo(Number(btn.dataset.page));
      return;
    }
    if (btn?.dataset.act === 'toc-toggle') {
      setTocOpen(!tocOpen);
      return;
    }
    // 目次の外をクリックしたら閉じる
    if (tocOpen && !(e.target as HTMLElement).closest('.vs-toc')) setTocOpen(false);
    const act = btn?.dataset.act;
    // キー操作と同じくステップ単位で進む・戻る
    if (act === 'prev') prev();
    if (act === 'next') next();
  });

  // 一定時間マウスを動かさなければカーソルを隠す（配信に映らないように）
  let timer = 0;
  window.addEventListener('mousemove', () => {
    document.body.classList.remove('vs-hide-cursor');
    clearTimeout(timer);
    timer = window.setTimeout(() => document.body.classList.add('vs-hide-cursor'), 2000);
  });
}

function onKey(e: KeyboardEvent): void {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  // ページ番号の入力中などは、ページ送りのキーとして扱わない
  if ((e.target as HTMLElement).closest?.('input, select, textarea')) return;
  if (tocOpen && e.key === 'Escape') {
    setTocOpen(false);
    e.preventDefault();
    return;
  }
  switch (e.key) {
    case 'ArrowRight':
    case 'ArrowDown':
    case 'PageDown':
    case ' ':
    case 'Enter':
      next();
      break;
    case 'ArrowLeft':
    case 'ArrowUp':
    case 'PageUp':
    case 'Backspace':
      prev();
      break;
    default:
      return;
  }
  e.preventDefault();
}

function initPreview(): void {
  fit();
  window.addEventListener('resize', fit);
  window.addEventListener('message', (e: MessageEvent) => {
    const d = e.data as RenderMessage;
    if (!d || d.type !== 'vslide:render') return;
    root.dataset.template = d.template;
    root.dataset.theme = d.theme;
    root.dataset.font = d.font;
    config.safeArea = d.safeArea;
    deck.innerHTML = d.deckHtml;
    collectSlides();
    applySafeVars();
    indicator.classList.toggle('is-on', d.safeArea.width > 0 && d.safeArea.height > 0);
    page = Math.max(0, Math.min(slides.length - 1, d.page));
    step = d.step < 0 ? maxStep(page) : Math.min(d.step, maxStep(page));
    const report = (overflow: number[]) =>
      parent.postMessage({ type: 'vslide:layout', overflow, maxStep: maxStep(page) }, '*');
    report(relayout());
    relayoutWhenReady(report);
  });
  parent.postMessage({ type: 'vslide:ready' }, '*');
}

/** PDF 書き出し用の API。編集画面から iframe の contentWindow.vsCapture として呼ぶ */
export interface CaptureApi {
  /** レイアウト調整まで済んだら解決する */
  ready: Promise<void>;
  /** ページごとの最大ステップ（0 始まり） */
  maxSteps: () => number[];
  /** 指定したページ・ステップを 1920×1080 の JPEG にする */
  capture: (page: number, step: number) => Promise<Blob>;
}

function initCapture(): void {
  collectSlides();
  applySafeVars();
  stage.style.transform = 'none';
  scriptPanel.hidden = true;

  const ready = (async () => {
    // 全スライドを一度レイアウトしてフォントの読み込みを始め、読み込み後にもう一度調整する
    layoutAll();
    await Promise.all([
      document.fonts?.ready,
      ...Array.from(deck.querySelectorAll('img')).map((img) => img.decode().catch(() => undefined)),
    ]);
    layoutAll();
  })();

  // SVG に埋め込む CSS（フォントを含む）とルート属性は全ページ共通なので一度だけ作る
  const css = Array.from(document.querySelectorAll('style'))
    .map((s) => s.textContent ?? '')
    .join('\n')
    .replace(/]]>/g, ']]]]><![CDATA[>');
  const attrs = ['data-template', 'data-theme', 'data-font']
    .map((name) => `${name}="${root.getAttribute(name) ?? ''}"`)
    .join(' ');
  const stageStyle = `--safe-w:${stage.style.getPropertyValue('--safe-w')};--safe-h:${stage.style.getPropertyValue('--safe-h')}`;
  const head = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SLIDE_W}" height="${SLIDE_H}">` +
      `<foreignObject x="0" y="0" width="${SLIDE_W}" height="${SLIDE_H}">` +
      `<html xmlns="http://www.w3.org/1999/xhtml" ${attrs}><head><style><![CDATA[${css}]]></style></head>` +
      `<body style="margin:0"><div class="vs-stage" style="${stageStyle};position:static"><div class="deck">`,
  );
  const tail = encodeURIComponent('</div></div></body></html></foreignObject></svg>');
  const serializer = new XMLSerializer();

  const api: CaptureApi = {
    ready,
    maxSteps: () => slides.map((_, i) => maxStep(i)),
    async capture(p, s) {
      page = p;
      step = s;
      show();
      // 現在のスライドを XHTML として SVG（foreignObject）に入れ、画像として描画する
      const body = encodeURIComponent(serializer.serializeToString(slides[p]));
      const img = new Image();
      img.src = `data:image/svg+xml;charset=utf-8,${head}${body}${tail}`;
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = SLIDE_W;
      canvas.height = SLIDE_H;
      canvas.getContext('2d')!.drawImage(img, 0, 0, SLIDE_W, SLIDE_H);
      return new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('画像を作れませんでした'))), 'image/jpeg', 0.92),
      );
    },
  };
  (window as unknown as { vsCapture: CaptureApi }).vsCapture = api;
}

if (isPreview) initPreview();
else if (isCapture) initCapture();
else initExport();
