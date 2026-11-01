// 出力 HTML に埋め込む素材（プレイヤー JS・フォント）を文字列として本体に取り込むための Vite プラグイン。

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { rolldown } from 'rolldown';
import type { Plugin } from 'vite';

const require = createRequire(import.meta.url);

function virtualModule(name: string, load: (ctx: { addWatchFile: (id: string) => void }) => Promise<string> | string): Plugin {
  const id = `virtual:${name}`;
  const resolved = `\0${id}`;
  return {
    name: `vtuber-slide:${name}`,
    resolveId(source) {
      return source === id ? resolved : null;
    },
    load(source) {
      return source === resolved ? load(this) : null;
    },
  };
}

/** `virtual:player` … src/player を IIFE にバンドルした JS 文字列 */
export function playerPlugin(): Plugin {
  const entry = resolve(import.meta.dirname, '../src/player/index.ts');
  const plugin = virtualModule('player', async (ctx) => {
    const bundle = await rolldown({ input: entry, logLevel: 'silent' });
    const { output } = await bundle.generate({ format: 'iife', minify: true });
    await bundle.close();
    const chunk = output[0];
    for (const id of chunk.moduleIds) ctx.addWatchFile(id);
    return `export default ${JSON.stringify(chunk.code)};`;
  });
  return {
    ...plugin,
    handleHotUpdate({ file, server }) {
      if (file.includes('/src/player/')) {
        const mod = server.moduleGraph.getModuleById('\0virtual:player');
        if (mod) server.moduleGraph.invalidateModule(mod);
      }
    },
  };
}

interface FontSource {
  pkg: string;
  weights: number[];
}

/** 本文用フォント（FontId → fontsource パッケージ）。CLAUDE.md「フォント」を参照 */
const BODY_FONTS: Record<string, FontSource> = {
  standard: { pkg: 'biz-udpgothic', weights: [400, 700] },
  gothic: { pkg: 'noto-sans-jp', weights: [400, 700] },
  pop: { pkg: 'm-plus-rounded-1c', weights: [400, 700] },
  other: { pkg: 'klee-one', weights: [400, 600] },
};
const MONO_FONT: FontSource = { pkg: 'm-plus-1-code', weights: [400, 700] };

/** 日本語の配信で使わない文字セットのブロックは除外する */
const SKIP_SUBSETS = /cyrillic|greek|vietnamese|hebrew/;

function buildFontCss(src: FontSource): string {
  const dir = dirname(require.resolve(`@fontsource/${src.pkg}/package.json`));
  let css = '';
  for (const w of src.weights) {
    const text = readFileSync(join(dir, `${w}.css`), 'utf8');
    for (const block of text.split('/* ').slice(1)) {
      const name = block.slice(0, block.indexOf('*/'));
      if (SKIP_SUBSETS.test(name)) continue;
      const face = block.slice(block.indexOf('@font-face'));
      css += face.replace(/src:[^;]+;/, (decl) => {
        const file = /url\(\.\/files\/([^)]+\.woff2)\)/.exec(decl)?.[1];
        if (!file) return decl;
        const data = readFileSync(join(dir, 'files', file)).toString('base64');
        return `src: url(data:font/woff2;base64,${data}) format('woff2');`;
      });
    }
  }
  return css.replace(/\s*\n\s*/g, '');
}

function readLicense(pkg: string): string {
  const dir = dirname(require.resolve(`${pkg}/package.json`));
  for (const name of ['LICENSE', 'LICENSE.md', 'LICENSE.txt']) {
    try {
      return readFileSync(join(dir, name), 'utf8').trim();
    } catch {
      // 次の候補を探す
    }
  }
  throw new Error(`${pkg} のライセンスファイルが見つかりません`);
}

/**
 * `virtual:licenses` … 同梱しているフォント・ライブラリのライセンス文。
 * ツール本体の「ライセンス」表示と、書き出し HTML への著作権表示に使う
 */
export function licensesPlugin(): Plugin {
  return virtualModule('licenses', () => {
    const own = readFileSync(resolve(import.meta.dirname, '../LICENSE'), 'utf8').trim();
    const fonts: Record<string, { name: string; text: string }> = {};
    for (const [id, src] of Object.entries({ ...BODY_FONTS, mono: MONO_FONT })) {
      fonts[id] = { name: src.pkg, text: readLicense(`@fontsource/${src.pkg}`) };
    }
    const libraries = [
      { name: 'Tailwind CSS', pkg: 'tailwindcss' },
      { name: 'daisyUI', pkg: 'daisyui' },
      { name: 'Svelte', pkg: 'svelte' },
      { name: 'highlight.js', pkg: 'highlight.js' },
    ].map((l) => ({ name: l.name, text: readLicense(l.pkg) }));
    return [
      `export const ownLicense = ${JSON.stringify(own)};`,
      `export const fontLicenses = ${JSON.stringify(fonts)};`,
      `export const libraryLicenses = ${JSON.stringify(libraries)};`,
    ].join('\n');
  });
}

/** `virtual:fonts` … フォントファイルを data: URL で埋め込んだ @font-face CSS 文字列 */
export function fontsPlugin(): Plugin {
  let cache: string | null = null;
  return virtualModule('fonts', () => {
    if (cache) return cache;
    const body: Record<string, string> = {};
    for (const [id, src] of Object.entries(BODY_FONTS)) body[id] = buildFontCss(src);
    cache = `export const bodyFontCss = ${JSON.stringify(body)};\nexport const monoFontCss = ${JSON.stringify(buildFontCss(MONO_FONT))};`;
    return cache;
  });
}
