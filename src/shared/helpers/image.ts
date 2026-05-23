// 画像ヘルパ (ブラウザ Canvas API、Node テスト環境では動かない、E2E + 手動確認)
// 関連: docs/_shared/helpers/001_helpers_SPEC.md §1.2
//
// 注: 本ファイルは browser-only。Node Vitest では skip、Playwright E2E でカバー予定。

export type ToWebPOptions = {
  maxWidth?: number;
  quality?: number;
};

/**
 * File を WebP Blob に変換 (Canvas API、ブラウザ専用)
 */
export async function toWebP(
  file: File,
  opts: ToWebPOptions = {},
): Promise<Blob> {
  if (typeof document === 'undefined') {
    throw new Error('toWebP: browser environment required (Canvas API unavailable in Node)');
  }
  const maxWidth = opts.maxWidth ?? 1920;
  const quality = opts.quality ?? 0.85;

  const img = await loadImage(file);
  const { width, height } = scaleDown(img.naturalWidth, img.naturalHeight, maxWidth);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('toWebP: 2d context unavailable');
  ctx.drawImage(img, 0, 0, width, height);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('toWebP: toBlob failed'))),
      'image/webp',
      quality,
    );
  });
}

/** EXIF 削除 (Canvas 経由で再エンコードすると EXIF は失われる、副作用利用) */
export async function stripExif(blob: Blob): Promise<Blob> {
  if (typeof document === 'undefined') {
    throw new Error('stripExif: browser environment required');
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImageFromUrl(url);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('stripExif: 2d context unavailable');
    ctx.drawImage(img, 0, 0);
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('stripExif: toBlob failed'))),
        blob.type || 'image/webp',
        0.92,
      );
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** サムネイル生成 (デフォルト 320px) */
export async function generateThumbnail(blob: Blob, size = 320): Promise<Blob> {
  if (typeof document === 'undefined') {
    throw new Error('generateThumbnail: browser environment required');
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImageFromUrl(url);
    const { width, height } = scaleDown(img.naturalWidth, img.naturalHeight, size);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('generateThumbnail: 2d context unavailable');
    ctx.drawImage(img, 0, 0, width, height);
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('generateThumbnail: toBlob failed'))),
        'image/webp',
        0.8,
      );
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function getImageDimensions(
  blob: Blob,
): Promise<{ width: number; height: number }> {
  if (typeof document === 'undefined') {
    throw new Error('getImageDimensions: browser environment required');
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImageFromUrl(url);
    return { width: img.naturalWidth, height: img.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// --- helpers ---

function loadImage(file: File): Promise<HTMLImageElement> {
  return loadImageFromUrl(URL.createObjectURL(file));
}

function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('loadImage: failed'));
    img.src = url;
  });
}

function scaleDown(
  w: number,
  h: number,
  max: number,
): { width: number; height: number } {
  if (w <= max && h <= max) return { width: w, height: h };
  const ratio = w > h ? max / w : max / h;
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
}
