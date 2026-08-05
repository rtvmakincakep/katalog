import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AdminOverlay, LockTrigger } from "@/components/Admin";
import { Dock, Sidebar, TopBar, type ViewMode } from "@/components/Chrome";
import { Icon } from "@/components/icons";
import { FlipViewer, ScrollViewer } from "@/components/Viewers";
import {
  FIREBASE_CONNECTION,
  hasFirebase,
  sha256,
  type Connection,
} from "@/lib/config";
import {
  connect,
  deletePdfFromFirestore,
  fetchPdfFromFirestore,
  savePublication,
  testFirestore,
  uploadPdfToFirestore,
  verifyFirestoreFile,
  watchPublication,
  EMPTY_PUBLICATION,
  type Publication,
} from "@/lib/firebase";
import { formatBytes, getPageAspect, loadDocument, type PdfDoc } from "@/lib/pdf";
import type { Firestore } from "firebase/firestore";

function Ambient({ dark }: { dark: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="animate-floaty absolute -left-32 -top-40 h-[520px] w-[520px] rounded-full blur-[120px]"
        style={{ background: dark ? "rgba(124,58,237,0.30)" : "rgba(139,92,246,0.22)" }}
      />
      <div
        className="animate-floaty absolute -right-40 top-1/4 h-[480px] w-[480px] rounded-full blur-[120px] [animation-delay:-5s]"
        style={{ background: dark ? "rgba(217,70,239,0.22)" : "rgba(236,72,153,0.16)" }}
      />
      <div
        className="animate-floaty absolute bottom-[-180px] left-1/3 h-[440px] w-[440px] rounded-full blur-[120px] [animation-delay:-9s]"
        style={{ background: dark ? "rgba(6,182,212,0.18)" : "rgba(14,165,233,0.14)" }}
      />
      <div
        className="absolute inset-0 opacity-[0.35] dark:opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(100,100,140,.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(100,100,140,.18) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse at 50% 40%, black 20%, transparent 78%)",
          WebkitMaskImage: "radial-gradient(ellipse at 50% 40%, black 20%, transparent 78%)",
        }}
      />
    </div>
  );
}

function Splash({ label }: { label: string }) {
  return (
    <motion.div
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="absolute inset-0 z-[90] grid place-items-center bg-ink-950"
    >
      <div className="flex flex-col items-center gap-5">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 via-brand-500 to-fuchsia-500 shadow-2xl shadow-brand-500/40"
        >
          <Icon name="file" className="h-7 w-7 text-white" strokeWidth={2} />
        </motion.div>
        <div className="h-1 w-40 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full w-1/3 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
            animate={{ x: ["-120%", "320%"] }}
            transition={{ repeat: Infinity, duration: 1.1, ease: "easeInOut" }}
          />
        </div>
        <p className="text-[12px] font-medium tracking-wide text-white/50">{label}</p>
      </div>
    </motion.div>
  );
}

export default function App() {
  const rootRef = useRef<HTMLDivElement>(null);
  const bytesRef = useRef<Uint8Array | null>(null);
  const wheelLock = useRef(0);
  const pageRef = useRef(1);
  const loadedKey = useRef<string>("");
  const patchTimer = useRef<number | undefined>(undefined);
  const lastLocalEdit = useRef(0);

  /* ---------------- backend ---------------- */
  const [conn, setConn] = useState<Connection>(() => FIREBASE_CONNECTION);
  const [db, setDb] = useState<Firestore | null>(null);
  const [connectionRevision, setConnectionRevision] = useState(0);
  const [live, setLive] = useState(false);
  const [pub, setPub] = useState<Publication>(() => ({ ...EMPTY_PUBLICATION }));
  const connRef = useRef(conn);
  const pubRef = useRef(pub);
  useEffect(() => {
    connRef.current = conn;
  }, [conn]);
  useEffect(() => {
    pubRef.current = pub;
  }, [pub]);

  /* ---------------- viewer ---------------- */
  const [doc, setDoc] = useState<PdfDoc | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [direction, setDirection] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [mode, setMode] = useState<ViewMode>("single");
  const [aspect, setAspect] = useState(1 / 1.414);
  const [dark, setDark] = useState(true);
  const [sidebar, setSidebar] = useState(false);
  const [tab, setTab] = useState<"pages" | "search">("pages");
  const [fullscreen, setFullscreen] = useState(false);
  const [hint, setHint] = useState(false);

  const [booting, setBooting] = useState(true);
  const [bootLabel, setBootLabel] = useState("Menyiapkan dokumen...");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [adminOpen, setAdminOpen] = useState(false);
  const [authed, setAuthed] = useState(false);

  /* ---------------- helpers ---------------- */
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2800);
  }, []);

  const fail = useCallback((msg: string) => {
    setError(msg);
    window.setTimeout(() => setError(null), 4200);
  }, []);

  const applyDoc = useCallback(async (bytes: Uint8Array) => {
    const next = await loadDocument(bytes.slice());
    bytesRef.current = bytes;
    setDoc((prev) => {
      prev?.destroy?.();
      return next;
    });
    setNumPages(next.numPages);
    pageRef.current = 1;
    setPage(1);
    setZoom(1);
    setRotation(0);
    setDirection(1);
    setAspect(await getPageAspect(next, 1, 0));
    return next;
  }, []);

  /** Ambil seluruh potongan file langsung dari Firestore. */
  const resolveBytes = useCallback(async (p: Publication): Promise<Uint8Array | null> => {
    if (!p.path) return null;
    const database = connect(connRef.current);
    if (!database) throw new Error("Firebase belum dikonfigurasi.");
    return fetchPdfFromFirestore(database, p.path);
  }, []);

  /** Terapkan publikasi realtime dari Firestore ke tampilan. */
  const applyPublication = useCallback(
    async (p: Publication, opts: { silent?: boolean } = {}) => {
      setPub(p);
      setDark(p.dark);
      setMode(p.mode === "book" && window.innerWidth < 1024 ? "single" : p.mode);

      const key = p.path;
      if (key && key === loadedKey.current) return;

      try {
        if (!opts.silent) setBootLabel(key ? "Mengunduh dokumen..." : "Menyiapkan dokumen...");
        const bytes = await resolveBytes(p);
        if (bytes) {
          await applyDoc(bytes);
          loadedKey.current = key;
        } else {
          setDoc(null);
          setNumPages(0);
          loadedKey.current = "";
        }
      } catch (e) {
        console.error(e);
        setDoc(null);
        setNumPages(0);
        fail("Dokumen gagal diunduh langsung dari Firestore.");
      }
    },
    [applyDoc, resolveBytes, fail],
  );

  /* ---------------- boot + realtime ---------------- */
  useEffect(() => {
    let unsub: (() => void) | undefined;
    let alive = true;

    (async () => {
      const c = connRef.current;
      setConn(c);
      const database = hasFirebase(c) ? connect(c) : null;
      setDb(database);

      if (database) {
        setBootLabel("Menghubungkan ke Firestore...");
        let first = true;
        unsub = watchPublication(
          database,
          (remote) => {
            if (!alive) return;
            setLive(true);
            const merged = { ...EMPTY_PUBLICATION, ...(remote ?? {}) };
            /* jangan timpa form admin yang sedang diketik */
            if (!first && Date.now() - lastLocalEdit.current < 3000) return;
            void applyPublication(merged, { silent: !first }).finally(() => {
              if (first) {
                first = false;
                setBooting(false);
              }
            });
          },
          () => {
            if (!alive) return;
            setLive(false);
            fail("Tidak bisa membaca data dari Firestore.");
            setBooting(false);
          },
        );
      } else {
        fail("Konfigurasi Firebase belum tersedia di environment aplikasi.");
        if (alive) setBooting(false);
      }

      if (alive) {
        setSidebar(window.innerWidth >= 1280);
        setHint(true);
        window.setTimeout(() => setHint(false), 4600);
      }
    })();

    return () => {
      alive = false;
      unsub?.();
    };
    // Reconnect only after the admin explicitly saves a new Firebase config.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionRevision]);

  /* ---------------- persist publication ---------------- */
  const persist = useCallback(
    async (next: Publication) => {
      if (!db) throw new Error("Firestore belum tersambung.");
      try {
        const { ...data } = next;
        await savePublication(db, data);
      } catch (e) {
        console.error(e);
        fail("Gagal menyimpan ke Firestore. Periksa aturan keamanan.");
      }
    },
    [db, fail],
  );

  const patch = useCallback(
    (partial: Partial<Publication>) => {
      const next = { ...pubRef.current, ...partial };
      setPub(next);
      pubRef.current = next;
      lastLocalEdit.current = Date.now();
      if (partial.dark !== undefined) setDark(partial.dark);
      if (partial.mode !== undefined)
        setMode(partial.mode === "book" && window.innerWidth < 1024 ? "single" : partial.mode);
      window.clearTimeout(patchTimer.current);
      patchTimer.current = window.setTimeout(() => void persist(next), 500);
    },
    [persist],
  );

  /* ---------------- publish ---------------- */
  const publish = useCallback(
    async (file: File) => {
      if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") {
        fail("Format tidak didukung. Pilih berkas PDF.");
        return;
      }
      const c = connRef.current;
      const previous = pubRef.current;
      setBusy("Membaca berkas...");
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const fileName = file.name.replace(/\.pdf$/i, "");

        setBusy("Memeriksa dokumen...");
        const inspected = await loadDocument(bytes.slice());
        const inspectedPages = inspected.numPages;
        await inspected.destroy();

        if (!hasFirebase(c) || !db)
          throw new Error("Hubungkan Firebase terlebih dahulu melalui tab Koneksi.");
        setBusy("Menyimpan PDF ke Firestore... 0%");
        const up = await uploadPdfToFirestore(db, bytes, file.name, (percent: number) =>
          setBusy(`Menyimpan PDF ke Firestore... ${Math.round(percent)}%`),
        );
        const path = up.path;

        /* Biarkan listener realtime mengambil ulang PDF dari Firestore. */
        loadedKey.current = "";

        const next: Publication = {
          ...previous,
          fileName,
          path,
          downloadUrl: up.downloadUrl,
          size: bytes.byteLength,
          pages: inspectedPages,
          uploadedAt: Date.now(),
          title: previous.title,
        };

        setBusy(db ? "Menyimpan ke Firestore..." : "Menyimpan...");
        setPub(next);
        pubRef.current = next;
        await persist(next);

        if (previous.path && previous.path !== path)
          void deletePdfFromFirestore(db, previous.path).catch(() => undefined);

        flash("PDF dan metadata berhasil disimpan di Firestore");
      } catch (e) {
        console.error(e);
        fail(e instanceof Error ? e.message : "Gagal mempublikasikan dokumen.");
      } finally {
        setBusy(null);
      }
    },
    [db, persist, flash, fail],
  );

  const removeDoc = useCallback(async () => {
    const previous = pubRef.current;
    setBusy("Menghapus...");
    try {
      if (db && previous.path)
        await deletePdfFromFirestore(db, previous.path);
      const next: Publication = {
        ...previous,
        fileName: "",
        path: "",
        downloadUrl: "",
        size: 0,
        pages: 0,
        uploadedAt: 0,
      };
      setPub(next);
      pubRef.current = next;
      await persist(next);
      setDoc(null);
      setNumPages(0);
      loadedKey.current = "";
      flash("Publikasi berhasil dihapus dari Firestore");
    } catch {
      fail("Gagal menghapus berkas di Firestore.");
    } finally {
      setBusy(null);
    }
  }, [db, persist, flash, fail]);

  /* ---------------- connection test ---------------- */
  const saveAndTest = useCallback(async () => {
    const c = connRef.current;
    setBusy("Menguji koneksi...");
    const notes: string[] = [];
    let database: Firestore | null = null;
    try {
      if (hasFirebase(c)) {
        database = connect(c);
        setDb(database);
        if (database) {
          await testFirestore(database);
          setLive(true);
          notes.push("Firestore OK");
        }
      } else {
        setDb(null);
        setLive(false);
      }
      if (database) {
        if (pubRef.current.path)
          await verifyFirestoreFile(database, pubRef.current.path);
        notes.push("File database OK");
      }
      setConnectionRevision((value) => value + 1);
      flash(notes.length ? notes.join(" · ") : "Konfigurasi tersimpan");
    } catch (e) {
      fail(e instanceof Error ? e.message : "Uji koneksi gagal.");
    } finally {
      setBusy(null);
    }
  }, [flash, fail]);

  const updateConn = useCallback((c: Connection) => {
    setConn(c);
    connRef.current = c;
  }, []);

  const checkPassword = useCallback(async (input: string) => {
    const hash = pubRef.current.passwordHash;
    const ok = hash ? (await sha256(input)) === hash : input === "admin123";
    if (ok) {
      setAuthed(true);
    }
    return ok;
  }, []);

  const changePassword = useCallback(
    async (value: string) => {
      patch({ passwordHash: await sha256(value) });
      flash("Kata sandi diperbarui");
    },
    [patch, flash],
  );

  /* ---------------- navigation ---------------- */
  const step = mode === "book" ? 2 : 1;

  const goto = useCallback(
    (p: number, dir?: number) => {
      const target = Math.min(Math.max(1, p), Math.max(1, numPages));
      if (target === pageRef.current) return;
      setDirection(dir ?? (target > pageRef.current ? 1 : -1));
      pageRef.current = target;
      setPage(target);
    },
    [numPages],
  );

  const next = useCallback(() => goto(page + step, 1), [goto, page, step]);
  const prev = useCallback(() => goto(page - step, -1), [goto, page, step]);

  const changeZoom = useCallback(
    (d: number) => setZoom((z) => Math.min(3, Math.max(0.4, +(z + d).toFixed(2)))),
    [],
  );

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) rootRef.current?.requestFullscreen?.().catch(() => undefined);
    else document.exitFullscreen?.().catch(() => undefined);
  }, []);

  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && /input|textarea|select/i.test(t.tagName)) return;
      if (e.altKey && (e.key === "a" || e.key === "A")) {
        e.preventDefault();
        setAdminOpen(true);
        return;
      }
      if (adminOpen || !doc) return;
      switch (e.key) {
        case "ArrowRight":
        case "PageDown":
        case " ":
          e.preventDefault();
          next();
          break;
        case "ArrowLeft":
        case "PageUp":
          e.preventDefault();
          prev();
          break;
        case "Home":
          goto(1, -1);
          break;
        case "End":
          goto(numPages, 1);
          break;
        case "+":
        case "=":
          changeZoom(0.2);
          break;
        case "-":
          changeZoom(-0.2);
          break;
        case "0":
          setZoom(1);
          break;
        case "f":
        case "F":
          toggleFullscreen();
          break;
        case "t":
        case "T":
          setTab("pages");
          setSidebar((v) => !v);
          break;
        case "s":
        case "S":
          setTab("search");
          setSidebar(true);
          break;
        case "d":
        case "D":
          setDark((v) => !v);
          break;
        case "r":
        case "R":
          setRotation((r) => (r + 90) % 360);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doc, adminOpen, next, prev, goto, numPages, changeZoom, toggleFullscreen]);

  useEffect(() => {
    if (!doc) return;
    let alive = true;
    getPageAspect(doc, page, rotation)
      .then((a) => alive && setAspect(a))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [doc, page, rotation]);

  useEffect(() => {
    const stop = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes("Files")) e.preventDefault();
    };
    window.addEventListener("dragover", stop);
    window.addEventListener("drop", stop);
    return () => {
      window.removeEventListener("dragover", stop);
      window.removeEventListener("drop", stop);
    };
  }, []);

  const onWheel = (e: React.WheelEvent) => {
    if (!doc || mode === "scroll" || zoom > 1.05 || adminOpen) return;
    if (Math.abs(e.deltaY) < 12) return;
    const now = Date.now();
    if (now < wheelLock.current) return;
    wheelLock.current = now + 480;
    if (e.deltaY > 0) next();
    else prev();
  };

  const download = () => {
    if (!bytesRef.current || !pub.allowDownload) return;
    const blob = new Blob([bytesRef.current.slice().buffer as ArrayBuffer], {
      type: "application/pdf",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${pub.title || pub.fileName || "dokumen"}.pdf`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  const displayTitle = pub.title || pub.fileName || "LumenPDF";
  const meta = useMemo(
    () => pub.subtitle || `${numPages} halaman · ${formatBytes(pub.size || 0)}`,
    [pub.subtitle, numPages, pub.size],
  );
  const progress = numPages ? (page / numPages) * 100 : 0;

  return (
    <div
      ref={rootRef}
      className="relative flex h-full w-full flex-col overflow-hidden bg-slate-100 text-slate-900 transition-colors duration-500 dark:bg-ink-950 dark:text-white"
    >
      <Ambient dark={dark} />

      <TopBar
        hasDoc={Boolean(doc)}
        fileName={displayTitle}
        meta={meta}
        dark={dark}
        sidebarOpen={sidebar}
        allowDownload={pub.allowDownload}
        onToggleSidebar={() => setSidebar((v) => !v)}
        onToggleTheme={() => setDark((v) => !v)}
        onDownload={download}
        onSearch={() => {
          setTab("search");
          setSidebar(true);
        }}
      />

      <div className="relative flex min-h-0 w-full flex-1">
        {doc && (
          <Sidebar
            doc={doc}
            numPages={numPages}
            page={page}
            rotation={rotation}
            open={sidebar}
            tab={tab}
            onTab={setTab}
            onClose={() => setSidebar(false)}
            onGoto={(p) => {
              goto(p);
              if (window.innerWidth < 1024) setSidebar(false);
            }}
          />
        )}

        <main className="relative min-w-0 flex-1" onWheel={onWheel}>
          {doc && (
            <div className="absolute inset-x-0 top-0 z-20 h-[3px] bg-slate-900/5 dark:bg-white/5">
              <motion.div
                className="h-full rounded-r-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400"
                animate={{ width: `${progress}%` }}
                transition={{ type: "spring", stiffness: 180, damping: 26 }}
              />
            </div>
          )}

          {doc &&
            (mode === "scroll" ? (
              <ScrollViewer
                doc={doc}
                page={page}
                numPages={numPages}
                aspect={aspect}
                rotation={rotation}
                zoom={zoom}
                onPageChange={(p) => goto(p)}
              />
            ) : (
              <FlipViewer
                doc={doc}
                page={page}
                numPages={numPages}
                direction={direction}
                aspect={aspect}
                rotation={rotation}
                zoom={zoom}
                book={mode === "book"}
                onNext={next}
                onPrev={prev}
              />
            ))}

          {!doc && !booting && (
            <div className="absolute inset-0 grid place-items-center px-6 text-center">
              <div className="max-w-sm">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-500/10 text-brand-500">
                  <Icon name="file" className="h-6 w-6" />
                </div>
                <h2 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">
                  Belum ada dokumen di Firebase
                </h2>
                <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
                  Masuk ke area admin melalui ikon gembok, lalu unggah PDF. Data akan dibaca
                  langsung dari Cloud Firestore.
                </p>
              </div>
            </div>
          )}

          {doc && (
            <Dock
              page={page}
              numPages={numPages}
              zoom={zoom}
              mode={mode}
              fullscreen={fullscreen}
              onPrev={prev}
              onNext={next}
              onGoto={(p) => goto(p)}
              onZoom={changeZoom}
              onResetZoom={() => setZoom(1)}
              onRotate={() => setRotation((r) => (r + 90) % 360)}
              onMode={setMode}
              onFullscreen={toggleFullscreen}
            />
          )}

          <AnimatePresence>
            {doc && hint && mode !== "scroll" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="pointer-events-none absolute bottom-20 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-ink-900/85 px-4 py-2 text-[11.5px] font-medium text-white shadow-xl backdrop-blur sm:bottom-24 sm:text-[12px] dark:bg-white/10"
              >
                <motion.span
                  animate={{ x: [-4, 4, -4] }}
                  transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
                  className="flex"
                >
                  <Icon name="left" className="h-4 w-4" />
                  <Icon name="right" className="h-4 w-4" />
                </motion.span>
                Geser halaman untuk membaca
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {!adminOpen && <LockTrigger onOpen={() => setAdminOpen(true)} />}

      <AdminOverlay
        open={adminOpen}
        authed={authed}
        pub={pub}
        conn={conn}
        status={{
          firebase: Boolean(db),
          files: Boolean(db),
          live,
          pages: numPages,
        }}
        busy={busy}
        onAuth={checkPassword}
        onClose={() => setAdminOpen(false)}
        onLogout={() => {
          setAuthed(false);
          setAdminOpen(false);
        }}
        patch={patch}
        onConn={updateConn}
        onTest={() => void saveAndTest()}
        onUpload={(f) => void publish(f)}
        onRemove={() => void removeDoc()}
        onPassword={(p) => void changePassword(p)}
      />

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            className="absolute bottom-6 left-1/2 z-[85] flex -translate-x-1/2 items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-[12.5px] font-semibold text-white shadow-2xl dark:bg-white dark:text-ink-900"
          >
            <Icon name="check" className="h-4 w-4 text-emerald-400 dark:text-emerald-600" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-20 left-1/2 z-[86] max-w-[92vw] -translate-x-1/2 rounded-xl bg-rose-600 px-4 py-2.5 text-center text-[12.5px] font-semibold text-white shadow-2xl"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>{booting && <Splash key="splash" label={bootLabel} />}</AnimatePresence>
    </div>
  );
}
