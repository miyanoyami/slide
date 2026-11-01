import { describe, expect, it } from 'vitest';
import { parseBody } from './markdown';

describe('parseBody', () => {
  it('段落内の改行は <br> になる', () => {
    expect(parseBody('一行目\n二行目').html).toBe('<p class="md-p">一行目<br>二行目</p>');
  });

  it('HTML はエスケープされる', () => {
    expect(parseBody('<script>alert(1)</script>').html).toBe(
      '<p class="md-p">&lt;script&gt;alert(1)&lt;/script&gt;</p>',
    );
  });

  it('太字とインラインコード', () => {
    expect(parseBody('**強調** と `a**b**`').html).toBe(
      '<p class="md-p"><strong class="md-strong">強調</strong> と <code class="md-inline-code">a**b**</code></p>',
    );
  });

  it('>> だけの行で以降のブロックが次のステップになる', () => {
    const r = parseBody('## 問い\n>>\n答え');
    expect(r.maxStep).toBe(1);
    expect(r.html).toBe('<h2 class="md-h">問い</h2><p class="md-p" data-step="1">答え</p>');
  });

  it('行中の >> は残りを次のステップで表示する', () => {
    const r = parseBody('光は波なのだろうか？ >> いや、そうではない');
    expect(r.maxStep).toBe(1);
    expect(r.html).toBe('<p class="md-p">光は波なのだろうか？ <span data-step="1"> いや、そうではない</span></p>');
  });

  it('行頭の >> の後ろに文字が続く場合', () => {
    const r = parseBody('A\n\n>> B');
    expect(r.html).toBe('<p class="md-p">A</p><p class="md-p" data-step="1">B</p>');
  });

  it('末尾の >> 行は中身のないステップを作らない', () => {
    const r = parseBody('A\n>>\nB\n>>\n');
    expect(r.maxStep).toBe(1);
  });

  it('行末の >> は中身のないステップを作らない', () => {
    const r = parseBody('A >>');
    expect(r.maxStep).toBe(0);
    expect(r.html).toBe('<p class="md-p">A </p>');
  });

  it('\\>> は記号として表示する', () => {
    const r = parseBody('a \\>> b');
    expect(r.maxStep).toBe(0);
    expect(r.html).toBe('<p class="md-p">a &gt;&gt; b</p>');
  });

  it('>> を挟んでもリストは1つのまま続く', () => {
    const r = parseBody('- a\n>>\n- b\n  - c');
    expect(r.maxStep).toBe(1);
    expect(r.html).toBe(
      '<ul class="md-list"><li>a</li><li data-step="1">b<ul class="md-list"><li data-step="1">c</li></ul></li></ul>',
    );
  });

  it('番号付きリスト', () => {
    expect(parseBody('1. a\n2. b').html).toBe('<ol class="md-list"><li>a</li><li>b</li></ol>');
  });

  it('コードブロック内の >> は区切りにならない', () => {
    const r = parseBody('```\na >> b\n```');
    expect(r.maxStep).toBe(0);
    expect(r.html).toContain('a &gt;&gt; b');
  });

  it('言語指定ありのコードブロックはハイライトされる', () => {
    const r = parseBody('```python\ndef f():\n    return 1\n```');
    expect(r.html).toContain('<span class="hljs-keyword">def</span>');
  });

  it('Ruby・Perl もハイライトされる', () => {
    expect(parseBody('```rb\ndef hello\nend\n```').html).toContain('<span class="hljs-keyword">def</span>');
    expect(parseBody('```pl\nmy $x = 1;\n```').html).toContain('<span class="hljs-keyword">my</span>');
  });

  it('Go・Rust・Kotlin もハイライトされる', () => {
    expect(parseBody('```go\nfunc main() {}\n```').html).toContain('<span class="hljs-keyword">func</span>');
    expect(parseBody('```rs\nfn main() {}\n```').html).toContain('<span class="hljs-keyword">fn</span>');
    expect(parseBody('```kt\nfun main() {}\n```').html).toContain('<span class="hljs-keyword">fun</span>');
  });

  it('引用と出典', () => {
    expect(parseBody('> 引用文\n\n※ 出典：教科書').html).toBe(
      '<blockquote class="md-quote">引用文</blockquote><p class="md-source">※ 出典：教科書</p>',
    );
  });
});
