import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon, type IconName } from "@/components/icons";
import { PdfCanvas, useInView } from "@/components/PdfCanvas";
import { searchDocument, type PdfDoc, type SearchHit } from "@/lib/pdf";
import { cn } from "@/utils/cn";

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

export function IconButton({
  icon,
  label,
  onClick,
  active,
  disabled,
  className,
}: {
  icon: IconName;
  label: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        "group relative grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-600 transition-all duration-200",
        "hover:bg-slate-900/5 hover:text-slate-900 active:scale-90",
        "dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white",
        active &&
          "bg-brand-500/15 text-brand-600 hover:bg-brand-500/20 dark:bg-brand-500/25 dark:text-brand-400",
        disabled && "pointer-events-none opacity-35",
        className,
      )}
    >
      <Icon name={icon} />
    </button>
  );
}

const Divider = () => <span className="mx-0.5 h-6 w-px bg-slate-900/10 dark:bg-white/10" />;

/* ------------------------------------------------------------------ */
/* Top bar                                                             */
/* ------------------------------------------------------------------ */

export function TopBar({
  hasDoc,
  fileName,
  meta,
  dark,
  sidebarOpen,
  allowDownload,
  onToggleSidebar,
  onToggleTheme,
  onDownload,
  onSearch,
}: {
  hasDoc: boolean;
  fileName: string;
  meta: string;
  dark: boolean;
  sidebarOpen: boolean;
  allowDownload: boolean;
  onToggleSidebar: () => void;
  onToggleTheme: () => void;
  onDownload: () => void;
  onSearch: () => void;
}) {
  return (
    <header className="relative z-40 flex h-14 w-full shrink-0 items-center gap-2 border-b border-slate-900/5 bg-white/75 px-2 backdrop-blur-xl sm:h-16 sm:gap-3 sm:px-4 dark:border-white/10 dark:bg-ink-900/70">
      {hasDoc && (
        <IconButton
          icon="panel"
          label="Panel halaman"
          onClick={onToggleSidebar}
          active={sidebarOpen}
        />
      )}

      <div className="flex min-w-0 items-center gap-2.5">
        <div className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 via-brand-500 to-fuchsia-500 shadow-lg shadow-brand-500/30">
          <Icon name="file" className="h-[18px] w-[18px] text-white" strokeWidth={2} />
        </div>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[13px] font-bold tracking-tight text-slate-900 sm:text-sm dark:text-white">
            {hasDoc ? fileName : "LumenPDF"}
          </p>
          <p className="truncate text-[10px] font-medium text-slate-500 sm:text-[11px] dark:text-slate-400">
            {hasDoc ? meta : "Pembaca PDF modern di browser"}
          </p>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-1 pr-8 sm:gap-1.5 sm:pr-9">
        {hasDoc && <IconButton icon="search" label="Cari teks (S)" onClick={onSearch} />}
        {hasDoc && allowDownload && (
          <IconButton icon="download" label="Unduh dokumen" onClick={onDownload} />
        )}
        <IconButton icon={dark ? "sun" : "moon"} label="Ganti tema (D)" onClick={onToggleTheme} />
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Bottom dock                                                         */
/* ------------------------------------------------------------------ */

export type ViewMode = "single" | "book" | "scroll";

export function Dock({
  page,
  numPages,
  zoom,
  mode,
  fullscreen,
  onPrev,
  onNext,
  onGoto,
  onZoom,
  onResetZoom,
  onRotate,
  onMode,
  onFullscreen,
}: {
  page: number;
  numPages: number;
  zoom: number;
  mode: ViewMode;
  fullscreen: boolean;
  onPrev: () => void;
  onNext: () => void;
  onGoto: (p: number) => void;
  onZoom: (delta: number) => void;
  onResetZoom: () => void;
  onRotate: () => void;
  onMode: (m: ViewMode) => void;
  onFullscreen: () => void;
}) {
  const [draft, setDraft] = useState(String(page));
  useEffect(() => setDraft(String(page)), [page]);

  const commit = () => {
    const n = parseInt(draft, 10);
    if (!Number.isNaN(n)) onGoto(Math.min(numPages, Math.max(1, n)));
    else setDraft(String(page));
  };

  const modes: { id: ViewMode; icon: IconName; label: string; hideSm?: boolean }[] = [
    { id: "single", icon: "page", label: "Satu halaman" },
    { id: "book", icon: "book", label: "Mode buku", hideSm: true },
    { id: "scroll", icon: "scroll", label: "Gulir vertikal" },
  ];

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 26, delay: 0.15 }}
      className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center px-2"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}
    >
      <div className="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl border border-white/60 bg-white/85 p-1.5 shadow-[0_18px_50px_-12px_rgba(20,10,60,0.35)] backdrop-blur-2xl dark:border-white/10 dark:bg-ink-800/85 dark:shadow-[0_18px_50px_-12px_rgba(0,0,0,0.8)]">
        <IconButton icon="first" label="Halaman pertama" onClick={() => onGoto(1)} disabled={page <= 1} />
        <IconButton icon="left" label="Sebelumnya" onClick={onPrev} disabled={page <= 1} />

        <div className="flex items-center gap-1 rounded-xl bg-slate-900/5 px-2 py-1 dark:bg-white/5">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ""))}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            inputMode="numeric"
            aria-label="Nomor halaman"
            className="w-8 bg-transparent text-center text-[13px] font-bold text-slate-900 outline-none dark:text-white"
          />
          <span className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
            / {numPages}
          </span>
        </div>

        <IconButton icon="right" label="Berikutnya" onClick={onNext} disabled={page >= numPages} />
        <IconButton
          icon="last"
          label="Halaman terakhir"
          onClick={() => onGoto(numPages)}
          disabled={page >= numPages}
        />

        <Divider />

        <IconButton icon="zoomOut" label="Perkecil" onClick={() => onZoom(-0.2)} />
        <button
          onClick={onResetZoom}
          title="Kembalikan ke ukuran pas"
          className="h-8 min-w-14 rounded-lg px-2 text-[12px] font-bold tabular-nums text-slate-700 transition hover:bg-slate-900/5 dark:text-slate-200 dark:hover:bg-white/10"
        >
          {Math.round(zoom * 100)}%
        </button>
        <IconButton icon="zoomIn" label="Perbesar" onClick={() => onZoom(0.2)} />

        <Divider />

        <IconButton icon="rotate" label="Putar 90 derajat" onClick={onRotate} className="hidden sm:grid" />

        <div className="flex items-center gap-0.5 rounded-xl bg-slate-900/5 p-0.5 dark:bg-white/5">
          {modes.map((m) => (
            <button
              key={m.id}
              onClick={() => onMode(m.id)}
              title={m.label}
              aria-label={m.label}
              className={cn(
                "relative grid h-8 w-8 place-items-center rounded-[10px] text-slate-600 transition dark:text-slate-300",
                m.hideSm && "hidden lg:grid",
                mode === m.id && "text-white dark:text-white",
              )}
            >
              {mode === m.id && (
                <motion.span
                  layoutId="mode-pill"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  className="absolute inset-0 rounded-[10px] bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-md shadow-violet-600/30"
                />
              )}
              <Icon name={m.icon} className="relative h-[17px] w-[17px]" />
            </button>
          ))}
        </div>

        <IconButton
          icon={fullscreen ? "shrink" : "expand"}
          label="Layar penuh (F)"
          onClick={onFullscreen}
          className="hidden sm:grid"
        />
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Sidebar: thumbnails + search                                        */
/* ------------------------------------------------------------------ */

function Thumb({
  doc,
  page,
  active,
  onClick,
  rotation,
}: {
  doc: PdfDoc;
  page: number;
  active: boolean;
  onClick: () => void;
  rotation: number;
}) {
  const { ref, inView } = useInView<HTMLButtonElement>("400px");
  return (
    <button
      ref={ref}
      onClick={onClick}
      className={cn(
        "group relative w-full overflow-hidden rounded-lg ring-1 transition-all duration-200",
        active
          ? "ring-2 ring-brand-500 shadow-lg shadow-brand-500/25"
          : "ring-black/5 hover:ring-brand-400/60 dark:ring-white/10",
      )}
    >
      <div className="aspect-[1/1.414] w-full bg-white">
        {inView && (
          <PdfCanvas doc={doc} pageNumber={page} width={190} rotation={rotation} quality={1.2} />
        )}
      </div>
      <span
        className={cn(
          "absolute bottom-1 right-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold transition",
          active ? "bg-brand-500 text-white" : "bg-ink-900/70 text-white/85",
        )}
      >
        {page}
      </span>
    </button>
  );
}

export function Sidebar({
  doc,
  numPages,
  page,
  rotation,
  open,
  tab,
  onTab,
  onClose,
  onGoto,
}: {
  doc: PdfDoc | null;
  numPages: number;
  page: number;
  rotation: number;
  open: boolean;
  tab: "pages" | "search";
  onTab: (t: "pages" | "search") => void;
  onClose: () => void;
  onGoto: (p: number) => void;
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && tab === "search") setTimeout(() => inputRef.current?.focus(), 250);
  }, [open, tab]);

  useEffect(() => {
    if (open && tab === "pages")
      activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [page, open, tab]);

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doc || query.trim().length < 2) return;
    setBusy(true);
    setHits(null);
    setProgress(0);
    const res = await searchDocument(doc, query, (d, t) => setProgress(d / t));
    setHits(res);
    setBusy(false);
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 z-30 bg-ink-950/50 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ width: open ? 268 : 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 34 }}
        className="absolute inset-y-0 left-0 z-30 h-full shrink-0 overflow-hidden border-r border-slate-900/5 bg-white/95 backdrop-blur-xl lg:relative lg:z-10 dark:border-white/10 dark:bg-ink-900/95"
      >
        <div className="flex h-full w-[268px] flex-col">
          <div className="flex items-center gap-1 border-b border-slate-900/5 p-2 dark:border-white/10">
            <div className="flex flex-1 gap-0.5 rounded-xl bg-slate-900/5 p-0.5 dark:bg-white/5">
              {(
                [
                  ["pages", "Halaman"],
                  ["search", "Cari"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => onTab(id)}
                  className={cn(
                    "relative flex-1 rounded-[10px] py-1.5 text-[12px] font-semibold transition",
                    tab === id
                      ? "text-white"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white",
                  )}
                >
                  {tab === id && (
                    <motion.span
                      layoutId="tab-pill"
                      className="absolute inset-0 rounded-[10px] bg-gradient-to-r from-violet-600 to-fuchsia-600"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                  <span className="relative">{label}</span>
                </button>
              ))}
            </div>
            <IconButton icon="close" label="Tutup panel" onClick={onClose} className="lg:hidden" />
          </div>

          {tab === "pages" ? (
            <div className="nice-scroll grid flex-1 grid-cols-2 content-start gap-2.5 overflow-y-auto p-3">
              {doc &&
                Array.from({ length: numPages }, (_, i) => i + 1).map((p) => (
                  <div key={p} ref={p === page ? activeRef : undefined}>
                    <Thumb
                      doc={doc}
                      page={p}
                      rotation={rotation}
                      active={p === page}
                      onClick={() => onGoto(p)}
                    />
                  </div>
                ))}
            </div>
          ) : (
            <div className="flex flex-1 flex-col overflow-hidden">
              <form onSubmit={run} className="p-3">
                <div className="flex items-center gap-2 rounded-xl border border-slate-900/10 bg-slate-900/[0.03] px-3 py-2 focus-within:border-brand-500/60 dark:border-white/10 dark:bg-white/5">
                  <Icon name="search" className="h-4 w-4 text-slate-400" />
                  <input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Cari kata di dokumen..."
                    className="w-full bg-transparent text-[13px] text-slate-800 outline-none placeholder:text-slate-400 dark:text-white"
                  />
                </div>
              </form>
              <div className="nice-scroll flex-1 overflow-y-auto px-3 pb-4">
                {busy && (
                  <div className="space-y-2 px-1 py-2">
                    <div className="h-1 w-full overflow-hidden rounded-full bg-slate-900/10 dark:bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all"
                        style={{ width: `${Math.round(progress * 100)}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-500">Memindai halaman...</p>
                  </div>
                )}
                {hits && hits.length === 0 && (
                  <p className="px-1 py-4 text-[12px] text-slate-500">
                    Tidak ada hasil untuk "{query}".
                  </p>
                )}
                <div className="space-y-2">
                  {hits?.map((h, i) => (
                    <button
                      key={`${h.page}-${i}`}
                      onClick={() => onGoto(h.page)}
                      className="w-full rounded-xl border border-slate-900/5 bg-slate-900/[0.02] p-2.5 text-left transition hover:border-brand-400/50 hover:bg-brand-500/5 dark:border-white/10 dark:bg-white/5"
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wide text-brand-600 dark:text-brand-400">
                        Halaman {h.page}
                      </span>
                      <p className="mt-1 line-clamp-3 text-[12px] leading-relaxed text-slate-600 dark:text-slate-300">
                        {h.snippet}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.aside>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Landing / dropzone                                                  */
/* ------------------------------------------------------------------ */

const FEATURES: { icon: IconName; title: string; desc: string }[] = [
  { icon: "book", title: "Animasi balik halaman", desc: "Efek 3D halus seperti buku asli" },
  { icon: "scroll", title: "Tiga mode baca", desc: "Halaman, buku, atau gulir vertikal" },
  { icon: "search", title: "Pencarian teks", desc: "Temukan kata di seluruh dokumen" },
  { icon: "shield", title: "100% privat", desc: "Diproses lokal, tanpa unggah server" },
];

export function Landing({
  onPick,
  onSample,
  dragging,
  loading,
  error,
}: {
  onPick: () => void;
  onSample: () => void;
  dragging: boolean;
  loading: boolean;
  error: string | null;
}) {
  return (
    <div className="nice-scroll relative h-full w-full overflow-y-auto">
      <div className="relative mx-auto flex min-h-full w-full max-w-5xl flex-col items-center justify-center px-5 py-10 text-center sm:py-16">
        <motion.span
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 rounded-full border border-brand-500/25 bg-brand-500/10 px-3 py-1 text-[11px] font-semibold text-brand-600 backdrop-blur sm:text-xs dark:text-brand-400"
        >
          <Icon name="sparkle" className="h-3.5 w-3.5" />
          Pembaca PDF generasi baru
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mt-5 text-balance text-4xl font-extrabold leading-[1.05] tracking-tight text-slate-900 sm:text-6xl dark:text-white"
        >
          Baca PDF dengan{" "}
          <span className="bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400 bg-clip-text text-transparent">
            rasa buku sungguhan
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="mt-4 max-w-xl text-pretty text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-400"
        >
          Seret berkas PDF ke mana saja di halaman ini, atau pilih dari perangkat Anda. Semua
          diproses langsung di browser - cepat, aman, dan tanpa unggahan.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="mt-8 w-full max-w-2xl"
        >
          <button
            onClick={onPick}
            className={cn(
              "group relative flex w-full flex-col items-center gap-3 overflow-hidden rounded-3xl border-2 border-dashed p-8 transition-all duration-300 sm:p-12",
              dragging
                ? "scale-[1.02] border-brand-500 bg-brand-500/10"
                : "border-slate-300 bg-white/60 hover:border-brand-400 hover:bg-white/90 dark:border-white/15 dark:bg-white/5 dark:hover:border-brand-400/70 dark:hover:bg-white/[0.08]",
            )}
          >
            <motion.div
              animate={dragging ? { y: -6, scale: 1.08 } : { y: 0, scale: 1 }}
              className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 via-brand-500 to-fuchsia-500 shadow-xl shadow-brand-500/30"
            >
              {loading ? (
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <Icon name="upload" className="h-7 w-7 text-white" strokeWidth={2.2} />
              )}
            </motion.div>
            <div>
              <p className="text-base font-bold text-slate-900 sm:text-lg dark:text-white">
                {loading ? "Membuka dokumen..." : dragging ? "Lepaskan di sini" : "Letakkan PDF di sini"}
              </p>
              <p className="mt-1 text-xs text-slate-500 sm:text-sm dark:text-slate-400">
                atau klik untuk memilih berkas dari perangkat Anda
              </p>
            </div>
          </button>

          {error && (
            <p className="mt-3 rounded-xl bg-rose-500/10 px-4 py-2 text-[13px] font-medium text-rose-600 dark:text-rose-400">
              {error}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={onSample}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-900/10 bg-white/80 px-4 py-2.5 text-[13px] font-semibold text-slate-700 shadow-sm transition hover:scale-[1.03] hover:bg-white active:scale-95 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
            >
              <Icon name="sparkle" className="h-4 w-4 text-brand-500" />
              Coba dokumen contoh
            </button>
          </div>
        </motion.div>

        <div className="mt-12 grid w-full max-w-3xl grid-cols-2 gap-3 sm:mt-16 sm:grid-cols-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.07 }}
              className="rounded-2xl border border-slate-900/5 bg-white/70 p-4 text-left backdrop-blur transition hover:-translate-y-1 hover:shadow-lg dark:border-white/10 dark:bg-white/5"
            >
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                <Icon name={f.icon} />
              </div>
              <p className="mt-3 text-[13px] font-bold text-slate-900 dark:text-white">{f.title}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                {f.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
