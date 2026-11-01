import { describe, expect, it } from 'vitest';
import { buildPdf } from './pdf';

describe('buildPdf', () => {
  it('ページ数・画像・相互参照表が正しい PDF を作る', async () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
    const blob = buildPdf([
      { jpeg, width: 1920, height: 1080 },
      { jpeg, width: 1920, height: 1080 },
    ]);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const text = new TextDecoder('latin1').decode(bytes);
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text).toContain('/Count 2');
    expect(text.match(/\/Subtype \/Image/g)).toHaveLength(2);
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true);

    // xref に書かれた各オブジェクトの位置に、実際に「n 0 obj」がある
    const startxref = Number(/startxref\n(\d+)/.exec(text)![1]);
    expect(text.slice(startxref, startxref + 4)).toBe('xref');
    const entries = text.slice(startxref).split('\n').slice(3, 3 + 8);
    entries.forEach((line, i) => {
      const offset = Number(line.slice(0, 10));
      expect(text.slice(offset).startsWith(`${i + 1} 0 obj`)).toBe(true);
    });
  });
});
