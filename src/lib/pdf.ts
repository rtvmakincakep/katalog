import * as pdfjs from "pdfjs-dist";
// The worker is inlined into the bundle so the app stays a single self-contained file.
import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?worker&inline";

pdfjs.GlobalWorkerOptions.workerPort = new PdfWorker();

const CDN = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38";

export type PdfDoc = pdfjs.PDFDocumentProxy;

export type DocMeta = {
  title: string;
  author: string;
  pages: number;
  sizeLabel: string;
};

export function loadDocument(data: ArrayBuffer | Uint8Array | string) {
  const params: Record<string, unknown> =
    typeof data === "string"
      ? { url: data }
      : { data: data instanceof Uint8Array ? data : new Uint8Array(data) };

  return pdfjs.getDocument({
    ...params,
    cMapUrl: `${CDN}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${CDN}/standard_fonts/`,
    wasmUrl: `${CDN}/wasm/`,
  } as never).promise;
}

export function formatBytes(bytes: number) {
  if (!bytes) return "-";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Render a single page into a canvas element. Returns a cancel handle. */
export async function renderPage(
  doc: PdfDoc,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  cssWidth: number,
  rotation: number,
  maxDpr = 2.25,
) {
  const page = await doc.getPage(pageNumber);
  const base = page.getViewport({ scale: 1, rotation });
  const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
  const scale = (cssWidth * dpr) / base.width;
  const viewport = page.getViewport({ scale, rotation });

  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));

  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return null;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const task = page.render({ canvasContext: ctx, viewport } as never);
  return task;
}

export async function getPageAspect(doc: PdfDoc, pageNumber: number, rotation = 0) {
  const page = await doc.getPage(pageNumber);
  const vp = page.getViewport({ scale: 1, rotation });
  return vp.width / vp.height;
}

export type SearchHit = { page: number; snippet: string };

export async function searchDocument(
  doc: PdfDoc,
  query: string,
  onProgress?: (done: number, total: number) => void,
): Promise<SearchHit[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const hits: SearchHit[] = [];
  const total = doc.numPages;
  for (let i = 1; i <= total; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((it) => ("str" in it ? it.str : ""))
      .join(" ")
      .replace(/\s+/g, " ");
    const idx = text.toLowerCase().indexOf(q);
    if (idx >= 0) {
      const start = Math.max(0, idx - 45);
      hits.push({
        page: i,
        snippet: `${start > 0 ? "..." : ""}${text.slice(start, idx + q.length + 55).trim()}...`,
      });
    }
    onProgress?.(i, total);
    if (hits.length >= 80) break;
  }
  return hits;
}
