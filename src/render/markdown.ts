// 本文用の簡易 Markdown パーサー。
// 対応記法は CLAUDE.md「本文の簡易 Markdown」を参照。`>>` より後ろは次のステップで表示する。

import { escapeHtml } from './escape';
import { highlightCode } from './highlight';

export interface ParsedBody {
  html: string;
  /** 本文中の最大ステップ数（`>>` の数） */
  maxStep: number;
}

interface Ctx {
  step: number;
}


const RE_FENCE = /^```\s*([\w+#.-]*)\s*$/;
const RE_HEADING = /^#{1,3}\s+(.*)$/;
const RE_LIST = /^(\s*)([-*]|\d+[.)])\s+(.*)$/;
const RE_QUOTE = /^>(?!>)\s?(.*)$/;

export function parseBody(src: string): ParsedBody {
  const ctx: Ctx = { step: 0 };
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  const html = parseBlocks(lines, ctx);
  // 最大ステップは「実際に内容が表示されるステップ」で数える。
  // 末尾の `>>` など、後ろに何も続かない区切りで中身のないステップができないようにする
  let maxStep = 0;
  for (const m of html.matchAll(/data-step="(\d+)"/g)) maxStep = Math.max(maxStep, Number(m[1]));
  return { html, maxStep };
}

function stepAttr(step: number): string {
  return step > 0 ? ` data-step="${step}"` : '';
}

function nextStep(ctx: Ctx): void {
  ctx.step++;
}

function isStepLine(t: string): boolean {
  return t === '>>';
}

/** 行頭が `>>` で始まり後ろに文字が続く行（`\>>` は除く） */
function startsWithStep(t: string): boolean {
  return t.startsWith('>>') && t.length > 2;
}

function isBlockStart(line: string): boolean {
  const t = line.trim();
  return (
    t === '' ||
    RE_FENCE.test(t) ||
    t.startsWith('>>') ||
    RE_HEADING.test(t) ||
    RE_LIST.test(line) ||
    RE_QUOTE.test(t) ||
    t.startsWith('※')
  );
}

function parseBlocks(lines: string[], ctx: Ctx): string {
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();

    if (t === '') {
      i++;
      continue;
    }

    if (isStepLine(t)) {
      nextStep(ctx);
      i++;
      continue;
    }

    if (startsWithStep(t)) {
      nextStep(ctx);
      lines[i] = t.slice(2).trimStart();
      continue;
    }

    const fence = RE_FENCE.exec(t);
    if (fence) {
      const code: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== '```') {
        code.push(lines[i]);
        i++;
      }
      i++; // 閉じ ```
      const lang = fence[1];
      out.push(
        `<pre class="md-code"${stepAttr(ctx.step)}><code class="hljs${lang ? ` language-${escapeHtml(lang)}` : ''}">${highlightCode(code.join('\n'), lang)}</code></pre>`,
      );
      continue;
    }

    const heading = RE_HEADING.exec(t);
    if (heading) {
      const start = ctx.step;
      out.push(`<h2 class="md-h"${stepAttr(start)}>${inline(heading[1], ctx)}</h2>`);
      i++;
      continue;
    }

    if (RE_LIST.test(line)) {
      i = parseList(lines, i, ctx, out);
      continue;
    }

    if (RE_QUOTE.test(t)) {
      const start = ctx.step;
      const parts: string[] = [];
      while (i < lines.length && RE_QUOTE.test(lines[i].trim())) {
        parts.push(lineWithStep(RE_QUOTE.exec(lines[i].trim())![1], ctx, start));
        i++;
      }
      out.push(`<blockquote class="md-quote"${stepAttr(start)}>${parts.join('<br>')}</blockquote>`);
      continue;
    }

    if (t.startsWith('※')) {
      const start = ctx.step;
      out.push(`<p class="md-source"${stepAttr(start)}>${inline(t, ctx)}</p>`);
      i++;
      continue;
    }

    // 段落：ブロックの開始でない行が続く間
    const start = ctx.step;
    const parts: string[] = [];
    do {
      parts.push(lineWithStep(lines[i].trim(), ctx, start));
      i++;
    } while (i < lines.length && !isBlockStart(lines[i]));
    out.push(`<p class="md-p"${stepAttr(start)}>${parts.join('<br>')}</p>`);
  }
  return out.join('');
}

/** 複数行ブロック内の1行。行の開始時点でブロックより後のステップなら行全体を包む */
function lineWithStep(text: string, ctx: Ctx, blockStep: number): string {
  const lineStep = ctx.step;
  const html = inline(text, ctx);
  return lineStep > blockStep ? `<span data-step="${lineStep}">${html}</span>` : html;
}

interface ListItem {
  indent: number;
  ordered: boolean;
  html: string;
  step: number;
}

function parseList(lines: string[], i: number, ctx: Ctx, out: string[]): number {
  const items: ListItem[] = [];
  while (i < lines.length) {
    const m = RE_LIST.exec(lines[i]);
    if (m) {
      const step = ctx.step;
      items.push({
        indent: m[1].replace(/\t/g, '  ').length,
        ordered: /\d/.test(m[2]),
        html: inline(m[3], ctx),
        step,
      });
      i++;
      continue;
    }
    // `>>` 行や空行を挟んでも、次の内容行がリスト項目なら同じリストとして続ける
    let j = i;
    let steps = 0;
    while (j < lines.length && (lines[j].trim() === '' || isStepLine(lines[j].trim()))) {
      if (isStepLine(lines[j].trim())) steps++;
      j++;
    }
    if (j < lines.length && j > i && RE_LIST.test(lines[j])) {
      for (let k = 0; k < steps; k++) nextStep(ctx);
      i = j;
      continue;
    }
    break;
  }
  let k = 0;
  while (k < items.length) {
    const r = renderList(items, k);
    out.push(r.html);
    k = r.next;
  }
  return i;
}

function renderList(items: ListItem[], start: number): { html: string; next: number } {
  const { indent, ordered } = items[start];
  const tag = ordered ? 'ol' : 'ul';
  let html = `<${tag} class="md-list">`;
  let i = start;
  while (i < items.length && items[i].indent === indent) {
    const it = items[i];
    i++;
    let li = `<li${stepAttr(it.step)}>${it.html}`;
    if (i < items.length && items[i].indent > indent) {
      const r = renderList(items, i);
      li += r.html;
      i = r.next;
    }
    html += `${li}</li>`;
  }
  return { html: `${html}</${tag}>`, next: i };
}

const ESCAPED_STEP = '\u0001';

/**
 * インライン記法（**太字**、`コード`、行中の `>>`）を HTML にする。
 * 行中の `>>` の後ろは `<span data-step>` で包み、ctx.step を進める。
 */
function inline(src: string, ctx: Ctx): string {
  // コード部分とテキスト部分に分ける
  const pieces: { code: boolean; text: string }[] = [];
  const re = /`([^`]+)`/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    if (m.index > last) pieces.push({ code: false, text: src.slice(last, m.index) });
    pieces.push({ code: true, text: m[1] });
    last = re.lastIndex;
  }
  if (last < src.length) pieces.push({ code: false, text: src.slice(last) });

  // `>>` でセグメントに分割（コード内は対象外）
  const segments: { code: boolean; text: string }[][] = [[]];
  for (const p of pieces) {
    if (p.code) {
      segments[segments.length - 1].push(p);
      continue;
    }
    const parts = p.text.replace(/\\>>/g, ESCAPED_STEP).split('>>');
    parts.forEach((part, idx) => {
      if (idx > 0) segments.push([]);
      if (part) segments[segments.length - 1].push({ code: false, text: part });
    });
  }

  let html = '';
  segments.forEach((seg, idx) => {
    if (idx > 0) nextStep(ctx);
    const body = renderSegment(seg);
    if (idx === 0) html += body;
    else if (body) html += `<span data-step="${ctx.step}">${body}</span>`;
  });
  return html;
}

function renderSegment(seg: { code: boolean; text: string }[]): string {
  // コードをプレースホルダに退避してから太字を処理する
  const codes: string[] = [];
  let text = '';
  for (const p of seg) {
    if (p.code) {
      codes.push(`<code class="md-inline-code">${escapeHtml(p.text)}</code>`);
      text += `\u0002${codes.length - 1}\u0003`;
    } else {
      text += p.text;
    }
  }
  let html = escapeHtml(text).replace(new RegExp(ESCAPED_STEP, 'g'), '&gt;&gt;');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="md-strong">$1</strong>');
  return html.replace(/\u0002(\d+)\u0003/g, (_, n: string) => codes[Number(n)]);
}
