/// <reference types="svelte" />
/// <reference types="vite/client" />

declare module 'virtual:player' {
  /** 出力 HTML に埋め込むプレイヤー（IIFE の JS 文字列） */
  const code: string;
  export default code;
}

declare module 'virtual:licenses' {
  /** このツール自体のライセンス（MIT） */
  export const ownLicense: string;
  /** FontId（と 'mono'）→ フォントのパッケージ名とライセンス文（SIL OFL 1.1） */
  export const fontLicenses: Record<string, { name: string; text: string }>;
  /** 同梱しているライブラリのライセンス文 */
  export const libraryLicenses: { name: string; text: string }[];
}

declare module 'virtual:fonts' {
  /** FontId → @font-face CSS（フォントは data: URL で埋め込み済み） */
  export const bodyFontCss: Record<string, string>;
  /** コード用等幅フォントの @font-face CSS */
  export const monoFontCss: string;
}
