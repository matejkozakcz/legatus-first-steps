/**
 * Resize an image file to a JPEG blob, preserving aspect ratio.
 * - If both dimensions are <= maxPx, skips resize but still re-encodes as JPEG.
 * - Uses an in-memory canvas (never attached to the DOM).
 */
export async function resizeImageToJpeg(
  file: File,
  maxPx: number,
  quality: number,
): Promise<Blob> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Failed to load image"));
    i.src = dataUrl;
  });

  const { width: w, height: h } = img;
  let targetW = w;
  let targetH = h;

  if (w > maxPx || h > maxPx) {
    const scale = Math.min(maxPx / w, maxPx / h);
    targetW = Math.round(w * scale);
    targetH = Math.round(h * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(img, 0, 0, targetW, targetH);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to encode JPEG"));
      },
      "image/jpeg",
      quality,
    );
  });
}
