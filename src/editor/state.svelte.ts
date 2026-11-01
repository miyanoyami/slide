// 編集画面の状態とページ操作。

import { newId, newPage, newProject, type PageKind, type Project } from '../model';
import { loadProject, saveProjectJson } from './storage';

/** 起動時に見つかった編集途中のデータ（読み込むかどうかをユーザーに確認する） */
let pendingRestore: Project | null = loadProject();
/** 最後に保存した JSON（同じ内容を何度も保存しないため） */
let lastSavedJson = '';

export const app = $state({
  project: newProject(),
  /** 編集途中のデータを読み込むか確認中なら、その概要 */
  restore: pendingRestore
    ? { title: pendingRestore.pages[0]?.title || '（無題）', pages: pendingRestore.pages.length }
    : null,
  /** 保存を始めてよい状態か（確認が済むまでは保存済みデータを上書きしない） */
  ready: pendingRestore === null,
  /** 選択中のページ番号 */
  selected: 0,
  /** プレビューで表示するステップ（-1 = 全ステップ表示） */
  previewStep: -1,
  /** プレビューで表示中のページの最大ステップ */
  previewMaxStep: 0,
  /** 内容があふれているページ番号 */
  overflow: [] as number[],
  saveError: null as string | null,
  /** 新規作成ダイアログを開いているか（ツールバーの「新規」と、起動時の「新しく作る」から開く） */
  newDialogOpen: false,
  /** 新規作成ダイアログを、起動時の「新しく作る」から開いたか（作業中データはもう破棄済み） */
  newDialogAfterDiscard: false,
});

/** 作業データを保存する。確認前や内容が変わっていないときは何もしない */
export function persist(json = JSON.stringify(app.project)): void {
  if (!app.ready || json === lastSavedJson) return;
  app.saveError = saveProjectJson(json);
  if (!app.saveError) lastSavedJson = json;
}

/** すぐに保存する（ページの追加・削除など、構成が変わる操作の直後に呼ぶ） */
export function saveNow(): void {
  persist();
}

/** 起動時の確認への回答。load = true なら編集途中のデータを読み込む */
export function resolveRestore(load: boolean): void {
  if (load && pendingRestore) {
    app.project = pendingRestore;
    lastSavedJson = JSON.stringify(app.project);
  } else if (pendingRestore) {
    // 「新しく作る」はツールバーの「新規」と同じく、デザイン設定を引き継いで新規作成ダイアログを開く
    app.project.settings = pendingRestore.settings;
    app.newDialogAfterDiscard = true;
    app.newDialogOpen = true;
  }
  pendingRestore = null;
  app.restore = null;
  app.ready = true;
  selectPage(0);
  persist();
}

export function selectPage(i: number): void {
  app.selected = Math.max(0, Math.min(app.project.pages.length - 1, i));
  app.previewStep = -1;
}

/** 選択中のページの後ろにページを追加する（既定は本文ページ） */
export function addPage(kind: PageKind = 'content'): void {
  const pages = app.project.pages;
  pages.splice(app.selected + 1, 0, newPage(kind));
  selectPage(app.selected + 1);
  saveNow();
}

export function duplicatePage(i: number): void {
  const pages = app.project.pages;
  const copy = structuredClone($state.snapshot(pages[i]));
  copy.id = newId('page');
  pages.splice(i + 1, 0, copy);
  selectPage(i + 1);
  saveNow();
}

export function deletePage(i: number): void {
  const pages = app.project.pages;
  if (pages.length <= 1) return;
  pages.splice(i, 1);
  selectPage(Math.min(app.selected, pages.length - 1));
  saveNow();
}

export function movePage(i: number, dir: -1 | 1): void {
  const pages = app.project.pages;
  const j = i + dir;
  if (j < 0 || j >= pages.length) return;
  [pages[i], pages[j]] = [pages[j], pages[i]];
  if (app.selected === i) app.selected = j;
  else if (app.selected === j) app.selected = i;
  saveNow();
}

export function replaceProject(project: Project): void {
  app.project = project;
  selectPage(0);
  saveNow();
}
