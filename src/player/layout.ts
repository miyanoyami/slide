// アバター用余白（右下）を避けるレイアウト調整。スライドが表示されている状態で呼ぶこと。

export const SLIDE_W = 1920;
export const SLIDE_H = 1080;

export interface SafeArea {
  width: number;
  height: number;
}

interface Rect {
  l: number;
  t: number;
  r: number;
  b: number;
}

/** 調整をリセットしてからアバター用余白に合わせて配置し、あふれているかを返す */
export function layoutSlide(slide: HTMLElement, safe: SafeArea): boolean {
  reset(slide);
  if (safe.width > 0 && safe.height > 0) {
    const sx = SLIDE_W * (1 - safe.width / 100);
    const sy = SLIDE_H * (1 - safe.height / 100);
    const base = slide.getBoundingClientRect();
    const k = base.width / SLIDE_W || 1;
    const rel = (el: Element): Rect => {
      const r = el.getBoundingClientRect();
      return {
        l: (r.left - base.left) / k,
        t: (r.top - base.top) / k,
        r: (r.right - base.left) / k,
        b: (r.bottom - base.top) / k,
      };
    };
    const hits = (r: Rect) => r.r > sx && r.b > sy;

    // 見出し：アバター用余白にかかる分だけ右側を空ける
    slide.querySelectorAll<HTMLElement>('.slide__header').forEach((el) => {
      const r = rel(el);
      if (hits(r)) adjust(el, 'paddingRight', `${r.r - sx}px`);
    });

    // 図：高さ（またはそれが無理なら幅）を縮めてアバター用余白から外す
    slide.querySelectorAll<HTMLElement>('.slide__figure').forEach((el) => {
      const r = rel(el);
      if (!hits(r)) return;
      if (sy - r.t > 120) adjust(el, 'maxHeight', `${sy - r.t}px`);
      else adjust(el, 'maxWidth', `${Math.max(0, sx - r.l)}px`);
    });

    // 本文：右端のスペーサーを float させ、下部だけ shape-outside で文字を避ける
    slide.querySelectorAll<HTMLElement>('.slide__body').forEach((body) => {
      const spacer = body.querySelector<HTMLElement>(':scope > .safe-spacer');
      if (!spacer) return;
      const r = rel(body);
      const ox = r.r - sx;
      const oy = r.b - sy;
      if (ox <= 0 || oy <= 0) return;
      const h = body.clientHeight;
      spacer.style.width = `${Math.min(ox, r.r - r.l)}px`;
      spacer.style.height = `${h}px`;
      spacer.style.shapeOutside = `inset(${Math.max(0, h - oy)}px 0 0 0)`;

      // 背景を持つブロック（コード・引用）は文字の回り込みでは避けられないので幅を詰める
      for (let pass = 0; pass < 3; pass++) {
        let changed = false;
        body.querySelectorAll<HTMLElement>(':scope > .md-code, :scope > .md-quote').forEach((el) => {
          const er = rel(el);
          if (hits(er)) {
            const current = parseFloat(el.style.marginRight || '0');
            adjust(el, 'marginRight', `${current + (er.r - sx)}px`);
            changed = true;
          }
        });
        if (!changed) break;
      }
    });
  }
  return isOverflowing(slide);
}

function adjust(el: HTMLElement, prop: 'paddingRight' | 'maxHeight' | 'maxWidth' | 'marginRight', value: string): void {
  el.style[prop] = value;
  el.dataset.safeAdjusted = '';
}

function reset(slide: HTMLElement): void {
  slide.querySelectorAll<HTMLElement>('.safe-spacer').forEach((sp) => {
    sp.style.width = '';
    sp.style.height = '';
    sp.style.shapeOutside = '';
  });
  slide.querySelectorAll<HTMLElement>('[data-safe-adjusted]').forEach((el) => {
    el.style.paddingRight = '';
    el.style.maxHeight = '';
    el.style.maxWidth = '';
    el.style.marginRight = '';
    delete el.dataset.safeAdjusted;
  });
}

function isOverflowing(slide: HTMLElement): boolean {
  // 本文はスクロール量で判定する
  for (const el of slide.querySelectorAll<HTMLElement>('.slide__body')) {
    if (el.scrollHeight > el.clientHeight + 2 || el.scrollWidth > el.clientWidth + 2) return true;
  }
  // タイトルページは中央のまとまりが余白（padding）の内側に収まっているかで判定する。
  // slide 自体の scrollHeight はテンプレートの装飾（はみ出す丸など）も含むので使わない
  const center = slide.querySelector<HTMLElement>('.slide__center');
  if (center) {
    const base = slide.getBoundingClientRect();
    const k = base.width / SLIDE_W || 1;
    const r = center.getBoundingClientRect();
    const style = getComputedStyle(slide);
    const top = (r.top - base.top) / k;
    const bottom = (r.bottom - base.top) / k;
    const left = (r.left - base.left) / k;
    const right = (r.right - base.left) / k;
    const tol = 2;
    if (
      top < parseFloat(style.paddingTop) - tol ||
      bottom > SLIDE_H - parseFloat(style.paddingBottom) + tol ||
      left < parseFloat(style.paddingLeft) - tol ||
      right > SLIDE_W - parseFloat(style.paddingRight) + tol
    ) {
      return true;
    }
  }
  return false;
}
