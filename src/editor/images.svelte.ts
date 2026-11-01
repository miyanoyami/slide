// 画像の取り込み（縮小・圧縮）と、表示用 URL のキャッシュ。

import { newId } from '../model';
import { getImage, putImage } from './storage';

const MAX_SIDE = 1920;

/** 画像 ID → blob: URL（プレビュー表示用） */
export const imageUrls: Record<string, string> = $state({});

/** ファイルを縮小・圧縮して IndexedDB に保存し、画像 ID を返す */
export async function importImage(file: File): Promise<string> {
  const blob = await compress(file);
  const id = newId('img');
  await putImage(id, blob);
  imageUrls[id] = URL.createObjectURL(blob);
  return id;
}

/** IndexedDB から読み込んで URL を用意する（起動時の復元用） */
export async function ensureImageUrls(ids: Iterable<string>): Promise<void> {
  for (const id of ids) {
    if (imageUrls[id]) continue;
    const blob = await getImage(id);
    if (blob) imageUrls[id] = URL.createObjectURL(blob);
  }
}

export async function imageDataUrl(id: string): Promise<string | undefined> {
  const blob = await getImage(id);
  return blob ? blobToDataUrl(blob) : undefined;
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function compress(file: File): Promise<Blob> {
  // SVG は縮小不要。読み込めない形式もそのまま保存する
  if (file.type === 'image/svg+xml') return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  // 透過を含む画像は JPEG にしない（透明部分が塗りつぶされるため）
  const alpha = file.type !== 'image/jpeg' && hasAlpha(ctx, w, h);
  const webp = await toBlob(canvas, 'image/webp', alpha ? 0.92 : 0.85);
  if (webp?.type === 'image/webp') return smaller(webp, file, scale);
  const fallback = alpha ? await toBlob(canvas, 'image/png') : await toBlob(canvas, 'image/jpeg', 0.85);
  return fallback ? smaller(fallback, file, scale) : file;
}

/** 縮小していない画像は、再圧縮で大きくなるなら元のまま使う */
function smaller(blob: Blob, original: File, scale: number): Blob {
  return scale < 1 || blob.size < original.size ? blob : original;
}

function hasAlpha(ctx: CanvasRenderingContext2D, w: number, h: number): boolean {
  const data = ctx.getImageData(0, 0, w, h).data;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) return true;
  }
  return false;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}
