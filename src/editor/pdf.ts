// JPEG 画像を1ページずつ並べた PDF を組み立てる（外部ライブラリを使わない最小限の実装）。

export interface PdfPageImage {
  /** JPEG のバイト列 */
  jpeg: Uint8Array;
  width: number;
  height: number;
}

/**
 * 各ページに画像を全面に貼った PDF を作る。
 * ページの大きさは 16:9 のワイド画面（960×540 pt = 13.333×7.5 インチ）。
 */
export function buildPdf(images: PdfPageImage[], pageWidth = 960, pageHeight = 540): Blob {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;

  const push = (data: string | Uint8Array) => {
    const bytes = typeof data === 'string' ? enc.encode(data) : data;
    chunks.push(bytes);
    length += bytes.length;
  };
  const startObject = (id: number) => {
    offsets[id] = length;
    push(`${id} 0 obj\n`);
  };

  // 2行目はバイナリを含むことを示すコメント（PDF の慣例。0x80 以上のバイトであればよい）
  push('%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n');

  const pageIds = images.map((_, i) => 3 + i * 3);

  startObject(1);
  push('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  startObject(2);
  push(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${images.length} >>\nendobj\n`);

  images.forEach((img, i) => {
    const pageId = 3 + i * 3;
    const contentId = pageId + 1;
    const imageId = pageId + 2;

    startObject(pageId);
    push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
        `/Resources << /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>\nendobj\n`,
    );

    const content = `q ${pageWidth} 0 0 ${pageHeight} 0 0 cm /Im0 Do Q\n`;
    startObject(contentId);
    push(`<< /Length ${enc.encode(content).length} >>\nstream\n${content}endstream\nendobj\n`);

    startObject(imageId);
    push(
      `<< /Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.jpeg.length} >>\nstream\n`,
    );
    push(img.jpeg);
    push('\nendstream\nendobj\n');
  });

  const objectCount = 3 + images.length * 3;
  const xrefOffset = length;
  let xref = `xref\n0 ${objectCount}\n0000000000 65535 f \n`;
  for (let id = 1; id < objectCount; id++) {
    xref += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  }
  push(xref);
  push(`trailer\n<< /Size ${objectCount} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

  return new Blob(chunks as BlobPart[], { type: 'application/pdf' });
}
