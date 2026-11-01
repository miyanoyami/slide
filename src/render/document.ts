// 書き出し用の自己完結 HTML と、プレビュー用 iframe の HTML を組み立てる。

import { bodyFontCss, monoFontCss } from 'virtual:fonts';
import { fontLicenses, libraryLicenses, ownLicense } from 'virtual:licenses';
import playerJs from 'virtual:player';
import type { Project } from '../model';
import slideCss from '../templates/slide.css?inline';
import { escapeHtml, jsonForScript } from './escape';
import type { RenderedDeck } from './slide';

/** 書き出し HTML に入れる著作権表示（埋め込んだフォントと CSS・プレイヤーのライセンス文） */
function licenseComment(fontIds: string[]): string {
  const sections = [
    `配信スライドメーカー（プレイヤー部分）\n${ownLicense}`,
    ...fontIds.map((id) => `フォント：${fontLicenses[id].name}\n${fontLicenses[id].text}`),
    ...libraryLicenses
      .filter((l) => l.name === 'Tailwind CSS' || l.name === 'daisyUI')
      .map((l) => `${l.name}\n${l.text}`),
  ];
  // コメントを閉じる "--" が本文に含まれないようにする
  const body = sections.join('\n\n================\n\n').replace(/-(?=-)/g, '- ');
  return `<!--\nこのファイルには以下のソフトウェア・フォントが含まれています。\n\n${body}\n-->`;
}

function shell(opts: {
  attrs: string;
  title: string;
  fontCss: string;
  deckHtml: string;
  configJson: string;
  licenseFonts: string[];
}): string {
  // `</script` が JS 文字列内に現れても閉じられないようにする
  const js = playerJs.replace(/<\/script/gi, '<\\/script');
  return `<!doctype html>
${licenseComment(opts.licenseFonts)}
<html lang="ja" ${opts.attrs}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(opts.title)}</title>
<style>${opts.fontCss}</style>
<style>${slideCss}</style>
</head>
<body class="vs-body">
<div id="vs-stage" class="vs-stage"><div id="vs-deck" class="deck">${opts.deckHtml}</div><div id="vs-safe-indicator" class="vs-safe-indicator"></div></div>
<div id="vs-script" class="vs-script" hidden></div>
<script type="application/json" id="vs-config">${opts.configJson}</script>
<script>${js}</script>
</body>
</html>`;
}

/**
 * stream  … 配信用ページ（配信用メモを含み、常にスライドの下に配信用メモを表示する）
 * capture … PDF 書き出し用（配信用メモを含まない。編集画面が隠し iframe で開いて各ステップを画像にする）
 */
export type ExportKind = 'stream' | 'capture';

export function buildExportHtml(project: Project, deck: RenderedDeck, kind: ExportKind): string {
  const { template, theme, font, safeArea } = project.settings;
  const stream = kind === 'stream';
  const config = {
    safeArea,
    scripts: stream ? deck.pages.map((p) => p.notes) : null,
  };
  // コードを使っていなければ等幅フォントは埋め込まない（PDF 書き出しを軽くするため）
  const usesMono = deck.html.includes('md-code') || deck.html.includes('md-inline-code');
  return shell({
    attrs: `data-template="${template}" data-theme="${theme}" data-font="${font}"${stream ? '' : ' data-capture'}`,
    title: project.pages[0]?.title || 'スライド',
    fontCss: (bodyFontCss[font] ?? '') + (usesMono ? monoFontCss : ''),
    deckHtml: deck.html,
    configJson: jsonForScript(config),
    licenseFonts: usesMono ? [font, 'mono'] : [font],
  });
}

/** プレビュー用：全フォントを読み込んだ空のプレイヤー。中身は postMessage で差し替える */
export function buildPreviewShell(): string {
  return shell({
    attrs: 'data-preview',
    title: 'preview',
    fontCss: Object.values(bodyFontCss).join('') + monoFontCss,
    deckHtml: '',
    configJson: '{}',
    licenseFonts: [],
  });
}
