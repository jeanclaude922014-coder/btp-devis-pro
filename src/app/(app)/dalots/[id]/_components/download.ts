"use client";

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function downloadText(text: string, filename: string, type: string) {
  downloadBlob(new Blob([text], { type }), filename);
}

export function slug(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 60) || "dalot";
}

/** Rastérise un SVG (chaîne) en PNG pour l'insérer dans la note Word. */
export async function svgToPng(svg: string, width: number): Promise<{ data: Uint8Array; width: number; height: number }> {
  const vb = /viewBox="([\d.\-\s]+)"/.exec(svg)?.[1].split(/\s+/).map(Number) ?? [0, 0, 4, 3];
  const ratio = vb[3] / vb[2];
  const height = Math.round(width * ratio);
  const sized = svg.replace(/width="100%"/, `width="${width}" height="${height}"`);
  const url = URL.createObjectURL(new Blob([sized], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Image SVG illisible"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG"))), "image/png"));
    return { data: new Uint8Array(await blob.arrayBuffer()), width, height };
  } finally {
    URL.revokeObjectURL(url);
  }
}
