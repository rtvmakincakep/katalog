import { useEffect, useRef, useState } from "react";
import { renderPage, type PdfDoc } from "@/lib/pdf";
import { cn } from "@/utils/cn";

export function useInView<T extends HTMLElement>(rootMargin = "600px") {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setInView(true);
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [inView, rootMargin]);

  return { ref, inView };
}

type Props = {
  doc: PdfDoc;
  pageNumber: number;
  width: number;
  rotation?: number;
  className?: string;
  quality?: number;
  eager?: boolean;
};

/** Renders one PDF page onto a canvas, keeping the canvas crisp for the given css width. */
export function PdfCanvas({
  doc,
  pageNumber,
  width,
  rotation = 0,
  className,
  quality = 2.25,
  eager = true,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const { ref: wrapRef, inView } = useInView<HTMLDivElement>("500px");
  const shouldRender = eager || inView;
  const w = Math.max(80, Math.round(width / 8) * 8);

  useEffect(() => {
    if (!shouldRender) return;
    let cancelled = false;
    let task: { cancel: () => void } | null = null;

    (async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      try {
        const t = await renderPage(doc, pageNumber, canvas, w, rotation, quality);
        if (!t) return;
        if (cancelled) {
          t.cancel();
          return;
        }
        task = t;
        await t.promise;
        if (!cancelled) setReady(true);
      } catch {
        /* render cancelled or failed */
      }
    })();

    return () => {
      cancelled = true;
      try {
        task?.cancel();
      } catch {
        /* noop */
      }
    };
  }, [doc, pageNumber, w, rotation, quality, shouldRender]);

  return (
    <div ref={wrapRef} className={cn("relative h-full w-full overflow-hidden", className)}>
      <canvas
        ref={canvasRef}
        className={cn(
          "block h-full w-full transition-opacity duration-500",
          ready ? "opacity-100" : "opacity-0",
        )}
      />
      {!ready && (
        <div className="shimmer absolute inset-0 overflow-hidden bg-slate-100 dark:bg-ink-700">
          <div className="absolute inset-0 grid place-items-center">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-brand-500/30 border-t-brand-500" />
          </div>
        </div>
      )}
    </div>
  );
}
