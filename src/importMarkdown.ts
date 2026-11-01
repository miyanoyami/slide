// 用意済みの Markdown テキストからページを作る（新規作成を楽にするための取り込み機能）。
//
// - 見出し（# 〜 ######）ごとに1ページ。見出しの文字がページのタイトルになる
// - 見出しの後に本文がなく、すぐ次の見出しが続く（または末尾で終わる）場合はタイトルページ
// - 見出しの後に本文があれば本文ページ。本文はそのまま本文欄に入れる
// - 最初の見出しより前に本文があれば、タイトルなしの本文ページにする
// - コードブロック内の # は見出しとして扱わない

import { newPage, type Page } from './model';

const RE_HEADING = /^#{1,6}\s+(.*?)(?:\s+#+)?\s*$/;
const RE_FENCE = /^\s*(```|~~~)/;

interface Section {
  title: string | null;
  body: string[];
}

export function pagesFromMarkdown(src: string): Page[] {
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  const sections: Section[] = [];
  let current: Section = { title: null, body: [] };
  let inFence = false;

  for (const line of lines) {
    if (RE_FENCE.test(line)) {
      inFence = !inFence;
      current.body.push(line);
      continue;
    }
    const heading = inFence ? null : RE_HEADING.exec(line);
    if (heading) {
      sections.push(current);
      current = { title: heading[1].trim(), body: [] };
      continue;
    }
    current.body.push(line);
  }
  sections.push(current);

  const pages: Page[] = [];
  for (const section of sections) {
    const body = section.body.join('\n').replace(/^\s*\n/, '').trimEnd();
    if (section.title === null) {
      // 最初の見出しより前の文章
      if (body.trim()) pages.push(contentPage('', body));
      continue;
    }
    if (body.trim()) {
      pages.push(contentPage(section.title, body));
    } else {
      const page = newPage('title');
      page.title = section.title;
      pages.push(page);
    }
  }
  return pages;
}

function contentPage(title: string, body: string): Page {
  const page = newPage('content');
  page.title = title;
  page.body = body;
  return page;
}
