// 作業データの保存。目的は記述途中の予期せぬ喪失への対策で、管理機能は持たない。
// プロジェクト（JSON）は localStorage、画像の実体は IndexedDB に保存する。

import { FONTS, TEMPLATES, THEMES } from '../catalog';
import { newProject, SCHEMA_VERSION, type Project } from '../model';

const PROJECT_KEY = 'vtuber-slide:project';
const DB_NAME = 'vtuber-slide';
const STORE = 'images';

/** 保存されている作業データを読み込む。読めない・壊れているデータは破棄して null を返す */
export function loadProject(): Project | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(PROJECT_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    return migrate(JSON.parse(raw));
  } catch {
    removeProject();
    return null;
  }
}

/** プロジェクトの JSON 文字列を保存する。失敗したらエラーメッセージを返す */
export function saveProjectJson(json: string): string | null {
  try {
    localStorage.setItem(PROJECT_KEY, json);
    return null;
  } catch (e) {
    return `作業データを保存できませんでした（${e instanceof Error ? e.message : String(e)}）。ブラウザの保存容量を確認してください。`;
  }
}

/** 保存されている作業データを削除する（画像は次回起動時の掃除で消える） */
export function removeProject(): void {
  try {
    localStorage.removeItem(PROJECT_KEY);
  } catch {
    // ストレージが使えない環境では何もしない
  }
}

/** 古い形式のデータを現在の形式に変換する。読めない形式なら例外を投げる */
export function migrate(data: unknown): Project {
  const p = data as Project;
  if (!p || typeof p !== 'object' || !Array.isArray(p.pages) || typeof p.version !== 'number') {
    throw new Error('プロジェクトの形式が正しくありません');
  }
  if (p.version > SCHEMA_VERSION) {
    throw new Error('新しいバージョンのツールで作られたデータです');
  }
  if (p.version < 2) {
    // v2：本文の文字サイズ設定を追加
    p.settings.bodyScale ??= 1;
    for (const page of p.pages) page.bodyScale ??= null;
  }
  if (p.version < 3) {
    // v3：タイトルページの作者名・日付を追加
    for (const page of p.pages) {
      page.author ??= '';
      page.date ??= '';
    }
  }
  if (p.version < 4) {
    // v4：配信用メモを `>>` 区切りの文字列から、ステップごとの配列に変更
    for (const page of p.pages as (Project['pages'][number] & { script?: string })[]) {
      page.notes ??= splitLegacyScript(page.script ?? '');
      delete page.script;
    }
  }
  if (p.version < 5) {
    // v5：画像のキャプションを追加
    for (const page of p.pages) if (page.image) page.image.caption ??= '';
  }
  p.version = SCHEMA_VERSION;
  validate(p);
  return p;
}

/** 旧形式（v3 まで）の台本：`>>` で区切ってステップごとにする（`\>>` は記号の >>） */
function splitLegacyScript(src: string): string[] {
  const text = src.replace(/\r\n?/g, '\n').trim();
  if (!text) return [];
  return text
    .replace(/\\>>/g, '\u0001')
    .split('>>')
    .map((s) => s.trim().replace(/\u0001/g, '>>'));
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isString = (v: unknown): v is string => typeof v === 'string';

/** 構造が壊れていれば例外を投げる。選択肢にない値（テンプレート名など）は既定値に戻す */
function validate(p: Project): void {
  const fail = () => {
    throw new Error('プロジェクトの形式が正しくありません');
  };
  const s = p.settings as unknown;
  if (!isObject(s) || !isObject(s.safeArea)) fail();
  const defaults = newProject().settings;
  const settings = p.settings;
  // 「ほわほわ」は「まる」に統合した
  if ((settings.template as string) === 'bokeh') settings.template = 'bubble';
  if (!TEMPLATES.some((t) => t.id === settings.template)) settings.template = defaults.template;
  if (!THEMES.some((t) => t.id === settings.theme)) settings.theme = defaults.theme;
  if (!FONTS.some((f) => f.id === settings.font)) settings.font = defaults.font;
  if (typeof settings.bodyScale !== 'number') settings.bodyScale = defaults.bodyScale;
  if (typeof settings.safeArea.width !== 'number') settings.safeArea.width = 0;
  if (typeof settings.safeArea.height !== 'number') settings.safeArea.height = 0;

  if (p.pages.length === 0) fail();
  for (const page of p.pages as unknown[]) {
    if (!isObject(page)) fail();
    const pg = page as Record<string, unknown>;
    if (!isString(pg.id) || (pg.kind !== 'content' && pg.kind !== 'title')) fail();
    for (const key of ['title', 'subtitle', 'author', 'date', 'body']) {
      if (!isString(pg[key])) fail();
    }
    if (!Array.isArray(pg.notes) || !pg.notes.every(isString)) fail();
    if (pg.image !== null && (!isObject(pg.image) || !isString(pg.image.id))) fail();
    if (isObject(pg.image) && !isString(pg.image.caption)) pg.image.caption = '';
  }
}

// ---- IndexedDB（画像） ----

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const req = fn(db.transaction(STORE, mode).objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

export function putImage(id: string, blob: Blob): Promise<IDBValidKey> {
  return tx('readwrite', (s) => s.put(blob, id));
}

export function getImage(id: string): Promise<Blob | undefined> {
  return tx('readonly', (s) => s.get(id) as IDBRequest<Blob | undefined>);
}

export function deleteImage(id: string): Promise<undefined> {
  return tx('readwrite', (s) => s.delete(id));
}

export function listImageIds(): Promise<string[]> {
  return tx('readonly', (s) => s.getAllKeys()).then((keys) => keys.map(String));
}

export function referencedImageIds(project: Project): Set<string> {
  return new Set(project.pages.flatMap((p) => (p.image ? [p.image.id] : [])));
}

/** プロジェクトから参照されなくなった画像を削除する */
export async function collectGarbage(project: Project): Promise<void> {
  const used = referencedImageIds(project);
  for (const id of await listImageIds()) {
    if (!used.has(id)) await deleteImage(id);
  }
}
