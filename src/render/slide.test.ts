import { describe, expect, it } from 'vitest';
import { newPage, newProject } from '../model';
import { renderDeck } from './slide';

const opts = { resolveImage: () => undefined };

describe('renderDeck', () => {
  it('本文の文字サイズは全体の設定を使う', () => {
    const project = newProject();
    project.settings.bodyScale = 1.15;
    expect(renderDeck(project, opts).html).toContain('style="--body-scale:1.15"');
  });

  it('ページごとの文字サイズが全体の設定より優先される', () => {
    const project = newProject();
    const page = newPage('content');
    page.bodyScale = 0.85;
    project.pages = [page];
    expect(renderDeck(project, opts).html).toContain('style="--body-scale:0.85"');
  });

  it('タイトルページに作者名と日付を表示する', () => {
    const project = newProject();
    const page = newPage('title');
    page.author = '<b>作者</b>';
    page.date = '2026年10月31日';
    project.pages = [page];
    const html = renderDeck(project, opts).html;
    expect(html).toContain('<p class="slide__meta"><span class="slide__author">&lt;b&gt;作者&lt;/b&gt;</span><span class="slide__date">2026年10月31日</span></p>');
  });

  it('作者名・日付が空なら表示しない', () => {
    const project = newProject();
    project.pages = [newPage('title')];
    expect(renderDeck(project, opts).html).not.toContain('slide__meta');
  });

  it('配信用メモはステップ数にそろえてエスケープする', () => {
    const project = newProject();
    const page = newPage('content');
    page.body = 'A\n>>\nB';
    page.notes = ['<b>一</b>\n行', '', '余分なメモ'];
    project.pages = [page];
    expect(renderDeck(project, opts).pages[0].notes).toEqual(['&lt;b&gt;一&lt;/b&gt;<br>行', '']);
  });

  it('画像のキャプションを図の下に出す', () => {
    const project = newProject();
    const page = newPage('content');
    page.image = { id: 'i', layout: 'left', step: 0, overlaySize: 40, caption: '図1 <干渉縞>' };
    project.pages = [page];
    const html = renderDeck(project, { resolveImage: () => 'x.png' }).html;
    expect(html).toContain('<figcaption class="slide__caption">図1 &lt;干渉縞&gt;</figcaption>');
  });

  it('タイトルページには文字サイズを付けない', () => {
    const project = newProject();
    project.pages = [newPage('title')];
    expect(renderDeck(project, opts).html).not.toContain('--body-scale');
  });
});
