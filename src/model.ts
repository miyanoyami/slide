// プロジェクト（作業データ）の型定義。localStorage に JSON として保存される。

export const SCHEMA_VERSION = 5;

export type TemplateId = 'simple' | 'card' | 'bubble' | 'square' | 'letter';
export type ThemeId =
  | 'sakura'
  | 'sora'
  | 'wakaba'
  | 'mikan'
  | 'fuji'
  | 'lemon'
  | 'yuki'
  | 'yoru'
  | 'kokuban'
  | 'sumi';
export type FontId = 'standard' | 'gothic' | 'pop' | 'other';

export type PageKind = 'content' | 'title';
export type ImageLayout = 'left' | 'right' | 'large' | 'overlay';

export interface PageImage {
  /** IndexedDB 上の画像 ID */
  id: string;
  layout: ImageLayout;
  /** 何ステップ目で表示するか（0 = 最初から） */
  step: number;
  /** 重ね表示の幅（スライド幅に対する %） */
  overlaySize: number;
  /** 画像の下に出す説明文（任意） */
  caption: string;
}

export interface Page {
  id: string;
  kind: PageKind;
  title: string;
  subtitle: string;
  /** タイトルページの作者名（任意） */
  author: string;
  /** タイトルページの日付（任意。入力された文字列をそのまま表示する） */
  date: string;
  body: string;
  /** 配信用メモ（ステップごと。notes[0] がステップ 1 のメモ） */
  notes: string[];
  image: PageImage | null;
  /** このページだけの本文の文字サイズ倍率。null なら全体の設定に合わせる */
  bodyScale: number | null;
}

export interface SafeArea {
  /** スライド幅に対する % */
  width: number;
  /** スライド高さに対する % */
  height: number;
}

export interface Settings {
  template: TemplateId;
  theme: ThemeId;
  font: FontId;
  safeArea: SafeArea;
  /** 本文の文字サイズ倍率（1 = 46px） */
  bodyScale: number;
}

export interface Project {
  version: number;
  settings: Settings;
  pages: Page[];
}

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function newPage(kind: PageKind): Page {
  return {
    id: newId('page'),
    kind,
    title: '',
    subtitle: '',
    author: '',
    date: '',
    body: '',
    notes: [],
    image: null,
    bodyScale: null,
  };
}

export function newProject(): Project {
  const cover = newPage('title');
  cover.title = 'タイトル';
  cover.subtitle = 'サブタイトル';
  const first = newPage('content');
  first.title = '見出し';
  first.body = '- ここに本文を書きます\n>>\n- `>>` の後ろはクリックで表示されます';
  return {
    version: SCHEMA_VERSION,
    settings: {
      template: 'simple',
      theme: 'sora',
      font: 'standard',
      safeArea: { width: 0, height: 0 },
      bodyScale: 1,
    },
    pages: [cover, first],
  };
}
