import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION } from '../model';
import { migrate } from './storage';

describe('migrate', () => {
  it('v1 のデータに文字サイズ設定を補う', () => {
    const v1 = {
      version: 1,
      settings: { template: 'simple', theme: 'sora', font: 'standard', safeArea: { width: 0, height: 0 } },
      pages: [{ id: 'p', kind: 'content', title: '', subtitle: '', body: '', script: '', image: null }],
    };
    const p = migrate(v1);
    expect(p.version).toBe(SCHEMA_VERSION);
    expect(p.settings.bodyScale).toBe(1);
    expect(p.pages[0].bodyScale).toBeNull();
  });

  it('v2 のデータに作者名・日付を補う', () => {
    const v2 = {
      version: 2,
      settings: { template: 'simple', theme: 'sora', font: 'standard', safeArea: { width: 0, height: 0 }, bodyScale: 1 },
      pages: [{ id: 'p', kind: 'title', title: '', subtitle: '', body: '', script: '', image: null, bodyScale: null }],
    };
    const p = migrate(v2);
    expect(p.pages[0].author).toBe('');
    expect(p.pages[0].date).toBe('');
  });

  it('v3 の台本（>> 区切り）をステップごとのメモに変換する', () => {
    const p = migrate({
      version: 3,
      settings: { template: 'simple', theme: 'sora', font: 'standard', safeArea: { width: 0, height: 0 }, bodyScale: 1 },
      pages: [
        {
          id: 'p',
          kind: 'content',
          title: '',
          subtitle: '',
          author: '',
          date: '',
          body: '',
          script: '最初\n>>\n次 \\>> 記号',
          image: null,
          bodyScale: null,
        },
      ],
    });
    expect(p.pages[0].notes).toEqual(['最初', '次 >> 記号']);
    expect('script' in p.pages[0]).toBe(false);
  });

  it('v4 の画像にキャプションを補う', () => {
    const p = migrate({
      version: 4,
      settings: { template: 'simple', theme: 'sora', font: 'standard', safeArea: { width: 0, height: 0 }, bodyScale: 1 },
      pages: [
        {
          id: 'p', kind: 'content', title: '', subtitle: '', author: '', date: '', body: '', notes: [],
          image: { id: 'i', layout: 'left', step: 0, overlaySize: 40 }, bodyScale: null,
        },
      ],
    });
    expect(p.pages[0].image?.caption).toBe('');
  });

  it('ページの構造が壊れていれば読み込まない', () => {
    const broken = {
      version: 3,
      settings: { template: 'simple', theme: 'sora', font: 'standard', safeArea: { width: 0, height: 0 }, bodyScale: 1 },
      pages: [{ id: 'p', kind: 'content', title: 1 }],
    };
    expect(() => migrate(broken)).toThrow();
  });

  it('設定がなければ読み込まない', () => {
    expect(() => migrate({ version: 3, pages: [] })).toThrow();
  });

  it('選択肢にないテンプレート名などは既定値に戻す', () => {
    const p = migrate({
      version: 3,
      settings: { template: 'unknown', theme: 'unknown', font: 'unknown', safeArea: { width: 0, height: 0 }, bodyScale: 1 },
      pages: [
        { id: 'p', kind: 'title', title: '', subtitle: '', author: '', date: '', body: '', script: '', image: null, bodyScale: null },
      ],
    });
    expect(p.settings.template).toBe('simple');
    expect(p.settings.theme).toBe('sora');
    expect(p.settings.font).toBe('standard');
  });

  it('新しいバージョンのデータは読み込まない', () => {
    expect(() => migrate({ version: SCHEMA_VERSION + 1, settings: {}, pages: [] })).toThrow();
  });
});
