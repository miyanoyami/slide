import { describe, expect, it } from 'vitest';
import { pagesFromMarkdown } from './importMarkdown';

const summary = (src: string) => pagesFromMarkdown(src).map((p) => [p.kind, p.title, p.body]);

describe('pagesFromMarkdown', () => {
  it('見出しごとにページを作り、本文のない見出しはタイトルページにする', () => {
    expect(summary('## hoge\n### fuga\n本文です\n- 項目')).toEqual([
      ['title', 'hoge', ''],
      ['content', 'fuga', '本文です\n- 項目'],
    ]);
  });

  it('末尾の本文のない見出しもタイトルページ', () => {
    expect(summary('# A\n本文\n# おわり\n')).toEqual([
      ['content', 'A', '本文'],
      ['title', 'おわり', ''],
    ]);
  });

  it('見出しと本文の間の空行は詰め、本文中の空行は残す', () => {
    expect(summary('## A\n\n一段落目\n\n二段落目\n\n')).toEqual([['content', 'A', '一段落目\n\n二段落目']]);
  });

  it('コードブロック内の # は見出しにしない', () => {
    expect(summary('## コード\n```python\n# コメント\nx = 1\n```')).toEqual([
      ['content', 'コード', '```python\n# コメント\nx = 1\n```'],
    ]);
  });

  it('最初の見出しより前の文章はタイトルなしの本文ページにする', () => {
    expect(summary('前書き\n# A\n本文')).toEqual([
      ['content', '', '前書き'],
      ['content', 'A', '本文'],
    ]);
  });

  it('見出しの閉じ記号（## A ##）は取り除く', () => {
    expect(summary('## A ##\n本文')).toEqual([['content', 'A', '本文']]);
  });

  it('# の後に空白がない行は見出しにしない', () => {
    expect(summary('#タグ\n本文')).toEqual([['content', '', '#タグ\n本文']]);
  });

  it('空なら1ページも作らない', () => {
    expect(pagesFromMarkdown('  \n')).toEqual([]);
  });
});
