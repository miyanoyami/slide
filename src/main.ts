import { mount } from 'svelte';
import { bodyFontCss } from 'virtual:fonts';
import './app.css';
import App from './editor/App.svelte';

// 編集画面の文字も、スライドの標準フォント（BIZ UDPゴシック）で表示する。
// フォントはプレビュー用に同梱済みのものを使うので、新たな読み込みは発生しない
const fontStyle = document.createElement('style');
fontStyle.textContent = bodyFontCss.standard ?? '';
document.head.append(fontStyle);

mount(App, { target: document.getElementById('app')! });
