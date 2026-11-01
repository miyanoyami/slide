// テンプレート・カラースキーム・フォントの一覧（編集画面の選択肢）。

import type { FontId, ImageLayout, TemplateId, ThemeId } from './model';

export const TEMPLATES: { id: TemplateId; label: string }[] = [
  { id: 'simple', label: 'しんぷる' },
  { id: 'card', label: 'かーど' },
  { id: 'bubble', label: 'まる' },
  { id: 'square', label: 'しかく' },
  { id: 'letter', label: 'びんせん' },
];

/** swatch は配色の見本（背景・メイン・アクセント）。src/themes/themes.css の値と一致させること */
export const THEMES: { id: ThemeId; label: string; swatch: [string, string, string] }[] = [
  { id: 'sakura', label: 'さくら', swatch: ['#fff7fa', '#c93a6f', '#ffb3cb'] },
  { id: 'sora', label: 'そら', swatch: ['#f4f9ff', '#2467c2', '#ffc94d'] },
  { id: 'wakaba', label: 'わかば', swatch: ['#f5fbf3', '#237a45', '#ffd166'] },
  { id: 'mikan', label: 'みかん', swatch: ['#fff8ee', '#cc5a0c', '#ffb02e'] },
  { id: 'fuji', label: 'ふじ', swatch: ['#f8f6ff', '#6145cc', '#ffa8cf'] },
  { id: 'lemon', label: 'れもん', swatch: ['#fffef2', '#8a6700', '#ffe14d'] },
  { id: 'yuki', label: 'ゆき', swatch: ['#fbfcfe', '#43679c', '#a9dcf2'] },
  { id: 'yoru', label: 'よる', swatch: ['#1b2033', '#7aa7ff', '#ffc857'] },
  { id: 'kokuban', label: 'こくばん', swatch: ['#1f3a33', '#ffd36b', '#ff9e9e'] },
  { id: 'sumi', label: 'すみ', swatch: ['#1f1f21', '#ff8a65', '#f2c94c'] },
];

export const FONTS: { id: FontId; label: string; family: string }[] = [
  { id: 'standard', label: '標準（BIZ UDPゴシック）', family: 'BIZ UDPGothic' },
  { id: 'gothic', label: 'ゴシック（Noto Sans JP）', family: 'Noto Sans JP' },
  { id: 'pop', label: 'ポップ（M PLUS Rounded 1c）', family: 'M PLUS Rounded 1c' },
  { id: 'other', label: '手書き風（Klee One）', family: 'Klee One' },
];

/** 本文の文字サイズ（倍率。1 = 46px）。読みやすさのため 0.85（約 39px）未満は用意しない */
export const BODY_SCALES: { value: number; label: string }[] = [
  { value: 0.85, label: '小' },
  { value: 1, label: '標準' },
  { value: 1.15, label: '大' },
  { value: 1.3, label: '特大' },
];

export const IMAGE_LAYOUTS: { id: ImageLayout; label: string }[] = [
  { id: 'right', label: '本文の右に表示' },
  { id: 'left', label: '本文の左に表示' },
  { id: 'large', label: '中央に表示' },
  { id: 'overlay', label: '本文に重ねて表示' },
];
