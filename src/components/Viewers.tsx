import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
} from "framer-motion";
import { PdfCanvas } from "@/components/PdfCanvas";
import type { PdfDoc } from "@/lib/pdf";
import { cn } from "@/utils/cn";

export function useMeasure<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const r = entry.contentRect;
      setSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { ref, size };
}

const spring = { type: "spring" as const, stiffness: 230, damping: 28, mass: 0.9 };

const variants = {
  enter: (d: number) => ({
    rotateY: d > 0 ? 58 : -58,
    x: d > 0 ? "42%" : "-42%",
    z: -220,
    scale: 0.9,
    opacity: 0,
  }),
  center: { rotateY: 0, x: "0%", z: 0, scale: 1, opacity: 1 },
  exit: (d: number) => ({
    rotateY: d > 0 ? -58 : 58,
    x: d > 0 ? "-42%" : "42%",
    z: -220,
    scale: 0.9,
    opacity: 0,
  }),
};

/* A page pivots from its bound edge, then exposes a softly shaded paper back. */
const singleFoldVariants = {
  enter: (d: number) => ({
    rotateY: d > 0 ? 12 : -12,
    x: d > 0 ? "3%" : "-3%",
    z: -80,
    scale: 0.985,
    opacity: 0.45,
  }),
  center: { rotateY: 0, x: "0%", z: 0, scale: 1, opacity: 1 },
  exit: (d: number) => ({
    rotateY: d > 0 ? -158 : 158,
    x: d > 0 ? "-5%" : "5%",
    z: 35,
    scale: 0.985,
    opacity: [1, 1, 0.65, 0],
  }),
};

type FlipProps = {
  doc: PdfDoc;
  page: number;
  numPages: number;
  direction: number;
  aspect: number;
  rotation: number;
  zoom: number;
  book: boolean;
  onNext: () => void;
  onPrev: () => void;
};

const PaperShell = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "relative h-full overflow-hidden bg-white shadow-[0_30px_80px_-20px_rgba(15,10,45,0.45)] ring-1 ring-black/5 dark:shadow-[0_35px_90px_-25px_rgba(0,0,0,0.9)] dark:ring-white/10",
      className,
    )}
  >
    {children}
  </div>
);

export function FlipViewer({
  doc,
  page,
  numPages,
  direction,
  aspect,
  rotation,
  zoom,
  book,
  onNext,
  onPrev,
}: FlipProps) {
  const { ref, size } = useMeasure<HTMLDivElement>();
  const dragX = useMotionValue(0);
  const dragRotate = useTransform(dragX, [-500, 0, 500], [-42, 0, 42]);
  const dragShade = useTransform(dragX, [-260, 0, 260], [0.58, 0, 0.58]);
  const dragHighlight = useTransform(dragX, [-300, 0, 300], ["15%", "50%", "85%"]);
  const [foldSide, setFoldSide] = useState<-1 | 1>(-1);
  const pad = size.w < 640 ? 16 : 40;
  const availW = Math.max(120, size.w - pad * 2);
  const availH = Math.max(160, size.h - pad * 2);

  const fitW = book
    ? Math.min(availW / 2, availH * aspect)
    : Math.min(availW, availH * aspect);
  const pageW = Math.max(80, fitW * zoom);
  const pageH = pageW / aspect;

  const left = book ? (page % 2 === 1 ? page : page - 1) : page;
  const right = left + 1 <= numPages ? left + 1 : null;
  const key = book ? `b${left}` : `s${page}`;

  const onDragEnd = (_e: unknown, info: PanInfo) => {
    const power = info.offset.x + info.velocity.x * 0.18;
    if (power < -90) onNext();
    else if (power > 90) onPrev();
    if (!book) void animate(dragX, 0, { type: "spring", stiffness: 360, damping: 30 });
  };

  return (
    <div
      ref={ref}
      className="nice-scroll relative h-full w-full overflow-auto overscroll-contain"
    >
      <div
        className="flex min-h-full min-w-full items-center justify-center"
        style={{ padding: pad }}
      >
        <motion.div
          drag={book && zoom <= 1.05 ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.16}
          dragMomentum={false}
          onDragEnd={onDragEnd}
          className="relative shrink-0 cursor-grab touch-pan-y active:cursor-grabbing"
          style={{
            width: book ? pageW * 2 : pageW,
            height: pageH,
            perspective: 2400,
          }}
        >
          {/* soft floor shadow */}
          <div
            className="pointer-events-none absolute -bottom-8 left-1/2 h-10 w-[86%] -translate-x-1/2 rounded-[50%] bg-black/25 blur-2xl dark:bg-black/60"
            aria-hidden
          />
          <AnimatePresence custom={direction} initial={false}>
            <motion.div
              key={key}
              custom={direction}
              variants={book ? variants : singleFoldVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={
                book
                  ? spring
                  : { type: "spring", stiffness: 125, damping: 21, mass: 0.82 }
              }
              className="preserve-3d absolute inset-0"
              style={{
                transformOrigin: book
                  ? "center center"
                  : direction > 0
                    ? "left center"
                    : "right center",
              }}
            >
              <motion.div
                className="preserve-3d backface-hidden absolute inset-0 flex"
                style={
                  book
                    ? undefined
                    : {
                        rotateY: dragRotate,
                        transformOrigin: foldSide < 0 ? "left center" : "right center",
                      }
                }
              >
              {book ? (
                <PaperShell className="flex w-full rounded-xl">
                  <div className="relative h-full" style={{ width: pageW }}>
                    <PdfCanvas doc={doc} pageNumber={left} width={pageW} rotation={rotation} />
                    <div className="pointer-events-none absolute inset-y-0 right-0 w-14 bg-gradient-to-l from-black/20 to-transparent" />
                  </div>
                  <div className="relative h-full" style={{ width: pageW }}>
                    {right ? (
                      <PdfCanvas doc={doc} pageNumber={right} width={pageW} rotation={rotation} />
                    ) : (
                      <div className="h-full w-full bg-slate-50 dark:bg-slate-100" />
                    )}
                    <div className="pointer-events-none absolute inset-y-0 left-0 w-14 bg-gradient-to-r from-black/20 to-transparent" />
                  </div>
                </PaperShell>
              ) : (
                <PaperShell className="w-full rounded-xl">
                  <PdfCanvas doc={doc} pageNumber={page} width={pageW} rotation={rotation} />
                </PaperShell>
              )}

                {/* Moving light makes the curved paper edge readable. */}
                <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
                  <div className="animate-sheen absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/60 to-transparent" />
                  {!book && (
                    <div
                      className={cn(
                        "absolute inset-y-0 w-1/3 blur-md",
                        direction > 0
                          ? "right-0 bg-gradient-to-l from-black/45 via-black/12 to-transparent"
                          : "left-0 bg-gradient-to-r from-black/45 via-black/12 to-transparent",
                      )}
                    />
                  )}
                </div>
              </motion.div>

              {!book && (
                <div
                  className="backface-hidden pointer-events-none absolute inset-0 overflow-hidden rounded-xl bg-[#f6f2e9] shadow-[inset_0_0_70px_rgba(72,54,35,0.16)] ring-1 ring-black/10"
                  style={{ transform: "rotateY(180deg)" }}
                >
                  <div className="absolute inset-0 opacity-50 [background-image:repeating-linear-gradient(0deg,transparent,transparent_3px,rgba(80,60,40,0.025)_4px)]" />
                  <div
                    className={cn(
                      "absolute inset-y-0 w-1/2",
                      direction > 0
                        ? "left-0 bg-gradient-to-r from-black/25 to-transparent"
                        : "right-0 bg-gradient-to-l from-black/25 to-transparent",
                    )}
                  />
                  <div className="absolute inset-y-0 left-1/2 w-20 -translate-x-1/2 bg-gradient-to-r from-transparent via-white/50 to-transparent blur-lg" />
                  <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-semibold tracking-widest text-stone-400">
                    {page}
                  </span>
                </div>
              )}

              {!book && (
                <>
                  <motion.div
                    className={cn(
                      "pointer-events-none absolute inset-y-0 z-20 w-[38%] blur-sm",
                      foldSide < 0
                        ? "right-0 bg-gradient-to-l from-black/65 via-black/20 to-transparent"
                        : "left-0 bg-gradient-to-r from-black/65 via-black/20 to-transparent",
                    )}
                    style={{ opacity: dragShade }}
                  />
                  <motion.div
                    className="pointer-events-none absolute inset-y-0 z-20 w-20 -translate-x-1/2 bg-gradient-to-r from-transparent via-white/70 to-transparent blur-md"
                    style={{ left: dragHighlight, opacity: dragShade }}
                  />
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {!book && zoom <= 1.05 && (
            <motion.div
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.24}
              dragMomentum={false}
              style={{ x: dragX }}
              onDrag={(_e, info) => setFoldSide(info.offset.x < 0 ? -1 : 1)}
              onDragEnd={onDragEnd}
              className="absolute inset-0 z-30 cursor-grab touch-pan-y active:cursor-grabbing"
              aria-label="Geser halaman"
            >
              <div className="h-full w-full opacity-0" />
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* invisible click zones for desktop paging */}
      <button
        onClick={onPrev}
        aria-label="Halaman sebelumnya"
        className="absolute inset-y-0 left-0 hidden w-[14%] cursor-w-resize lg:block"
      />
      <button
        onClick={onNext}
        aria-label="Halaman berikutnya"
        className="absolute inset-y-0 right-0 hidden w-[14%] cursor-e-resize lg:block"
      />
    </div>
  );
}

type ScrollProps = {
  doc: PdfDoc;
  page: number;
  numPages: number;
  aspect: number;
  rotation: number;
  zoom: number;
  onPageChange: (p: number) => void;
};

export function ScrollViewer({
  doc,
  page,
  numPages,
  aspect,
  rotation,
  zoom,
  onPageChange,
}: ScrollProps) {
  const { ref, size } = useMeasure<HTMLDivElement>();
  const items = useRef<Record<number, HTMLDivElement | null>>({});
  const current = useRef(page);

  const pad = size.w < 640 ? 12 : 32;
  const fitW = Math.min(size.w - pad * 2, 980);
  const pageW = Math.max(120, fitW * zoom);
  const pageH = pageW / aspect;

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        let best: { p: number; ratio: number } | null = null;
        for (const e of entries) {
          const p = Number((e.target as HTMLElement).dataset.page);
          if (!p) continue;
          if (e.isIntersecting && (!best || e.intersectionRatio > best.ratio))
            best = { p, ratio: e.intersectionRatio };
        }
        if (best && best.p !== current.current) {
          current.current = best.p;
          onPageChange(best.p);
        }
      },
      { root, threshold: [0.15, 0.4, 0.75] },
    );
    Object.values(items.current).forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [numPages, ref, onPageChange]);

  useEffect(() => {
    if (page === current.current) return;
    current.current = page;
    items.current[page]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [page]);

  return (
    <div ref={ref} className="nice-scroll h-full w-full overflow-y-auto overflow-x-hidden overscroll-contain">
      <div className="flex flex-col items-center gap-5 py-6 sm:gap-8 sm:py-10">
        {Array.from({ length: numPages }, (_, i) => i + 1).map((p) => (
          <motion.div
            key={p}
            custom={p % 2 === 0 ? 1 : -1}
            data-page={p}
            ref={(el) => {
              items.current[p] = el;
            }}
            variants={{
              hidden: (side: number) => ({
                opacity: 0.18,
                x: side * 58,
                y: 70,
                scale: 0.91,
                rotateY: side * -7,
                rotateZ: side * 0.75,
                filter: "blur(7px)",
              }),
              visible: {
                opacity: 1,
                x: 0,
                y: 0,
                scale: 1,
                rotateY: 0,
                rotateZ: 0,
                filter: "blur(0px)",
              },
            }}
            initial="hidden"
            whileInView="visible"
            viewport={{ amount: 0.16, margin: "-4% 0px -4% 0px" }}
            transition={{
              type: "spring",
              stiffness: 105,
              damping: 21,
              mass: 0.9,
              opacity: { duration: 0.55 },
              filter: { duration: 0.5 },
            }}
            className="pdf-scroll-page relative shrink-0 scroll-mt-4"
            style={{ width: pageW, height: pageH }}
          >
            <motion.div
              variants={{
                hidden: { opacity: 0, scale: 0.86 },
                visible: { opacity: [0, 0.75, 0], scale: [0.86, 1.04, 1.08] },
              }}
              transition={{ duration: 1.1, times: [0, 0.35, 1], ease: "easeOut" }}
              className="pointer-events-none absolute -inset-3 rounded-xl bg-gradient-to-br from-violet-500/65 via-fuchsia-500/40 to-cyan-400/55 blur-xl"
            />
            <div className="relative h-full w-full overflow-hidden rounded-lg bg-white shadow-[0_26px_70px_-24px_rgba(15,10,45,0.62)] ring-1 ring-black/5 dark:shadow-[0_30px_80px_-24px_rgba(0,0,0,0.95)] dark:ring-white/10">
              <PdfCanvas
                doc={doc}
                pageNumber={p}
                width={pageW}
                rotation={rotation}
                eager={false}
                quality={1.75}
              />
              <motion.div
                variants={{
                  hidden: { x: "-130%", opacity: 0 },
                  visible: { x: "230%", opacity: [0, 0.5, 0] },
                }}
                transition={{ duration: 1.05, delay: 0.16, ease: "easeOut" }}
                className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-16deg] bg-gradient-to-r from-transparent via-white/75 to-transparent"
              />
              <span className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-ink-900/70 px-2 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur">
                {p}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
