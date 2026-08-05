import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon, type IconName } from "@/components/icons";
import type { Connection } from "@/lib/config";
import type { Publication } from "@/lib/firebase";
import { formatBytes } from "@/lib/pdf";
import { cn } from "@/utils/cn";

/* ------------------------------------------------------------------ */
/* Pemicu gembok samar                                                 */
/* ------------------------------------------------------------------ */

export function LockTrigger({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      title="Area admin"
      aria-label="Buka area admin"
      className="group absolute right-1.5 top-1.5 z-[60] grid h-8 w-8 place-items-center rounded-lg text-slate-400/50 opacity-35 transition-all duration-300 hover:bg-slate-900/5 hover:text-brand-500 hover:opacity-100 focus-visible:opacity-100 focus:outline-none active:scale-90 sm:right-2.5 sm:top-2.5 dark:text-white/30 dark:hover:bg-white/10 dark:hover:text-brand-400"
    >
      <Icon name="lock" className="h-[15px] w-[15px]" strokeWidth={1.6} />
      <span className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-transparent transition group-hover:ring-brand-500/30" />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Elemen kecil                                                        */
/* ------------------------------------------------------------------ */

const inputCls =
  "mt-1.5 w-full rounded-xl border border-slate-900/10 bg-white px-3.5 py-2.5 text-[13px] text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 dark:border-white/10 dark:bg-white/5 dark:text-white";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11px] leading-relaxed text-slate-400">{hint}</span>}
    </label>
  );
}

function Card({
  title,
  icon,
  right,
  children,
}: {
  title: string;
  icon: IconName;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-900/5 bg-white/70 p-5 backdrop-blur dark:border-white/10 dark:bg-white/5">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
          <Icon name={icon} className="h-4 w-4" />
        </span>
        <h3 className="flex-1 text-[13.5px] font-extrabold text-slate-900 dark:text-white">
          {title}
        </h3>
        {right}
      </div>
      {children}
    </section>
  );
}

function Pill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide",
        ok
          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
          : "bg-amber-500/15 text-amber-600 dark:text-amber-400",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", ok ? "bg-emerald-500" : "bg-amber-500")} />
      {label}
    </span>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  desc,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-3 rounded-xl border border-slate-900/5 bg-white/60 p-3 text-left transition hover:border-brand-400/50 dark:border-white/10 dark:bg-white/5"
    >
      <span
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          checked
            ? "bg-gradient-to-r from-violet-600 to-fuchsia-600"
            : "bg-slate-300 dark:bg-white/15",
        )}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 500, damping: 32 }}
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow",
            checked ? "left-[22px]" : "left-0.5",
          )}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold text-slate-800 dark:text-white">
          {label}
        </span>
        <span className="block text-[11px] text-slate-500 dark:text-slate-400">{desc}</span>
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Layar kunci                                                         */
/* ------------------------------------------------------------------ */

function LockScreen({
  onAuth,
  onClose,
  defaultHint,
}: {
  onAuth: (pwd: string) => Promise<boolean>;
  onClose: () => void;
  defaultHint: boolean;
}) {
  const [value, setValue] = useState("");
  const [shake, setShake] = useState(false);
  const [show, setShow] = useState(false);
  const [checking, setChecking] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => ref.current?.focus(), 260);
    return () => clearTimeout(t);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (checking) return;
    setChecking(true);
    const ok = await onAuth(value);
    setChecking(false);
    if (!ok) {
      setShake(true);
      setValue("");
      setTimeout(() => setShake(false), 560);
    }
  };

  return (
    <div className="grid h-full w-full place-items-center px-5">
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={
          shake
            ? { opacity: 1, y: 0, scale: 1, x: [0, -11, 9, -7, 5, 0] }
            : { opacity: 1, y: 0, scale: 1, x: 0 }
        }
        transition={shake ? { duration: 0.45 } : { type: "spring", stiffness: 260, damping: 24 }}
        className="w-full max-w-sm rounded-3xl border border-white/60 bg-white/85 p-7 shadow-[0_30px_90px_-25px_rgba(20,10,60,0.5)] backdrop-blur-2xl sm:p-8 dark:border-white/10 dark:bg-ink-800/85"
      >
        <div className="flex flex-col items-center text-center">
          <motion.div
            animate={shake ? { rotate: [0, -8, 8, -5, 0] } : {}}
            transition={{ duration: 0.45 }}
            className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 via-brand-500 to-fuchsia-500 shadow-xl shadow-brand-500/30"
          >
            <Icon name="lock" className="h-6 w-6 text-white" strokeWidth={2} />
          </motion.div>
          <h2 className="mt-4 text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Area Admin
          </h2>
          <p className="mt-1 text-[12.5px] text-slate-500 dark:text-slate-400">
            Masukkan kata sandi untuk mengelola dokumen.
          </p>
        </div>

        <div className="relative mt-6">
          <input
            ref={ref}
            type={show ? "text" : "password"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Kata sandi"
            autoComplete="current-password"
            className={cn(
              inputCls,
              "py-3 pr-11 text-center text-base tracking-[0.3em] placeholder:tracking-normal placeholder:text-center",
              shake && "border-rose-500 ring-4 ring-rose-500/15",
            )}
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label="Tampilkan kata sandi"
            className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition hover:text-slate-700 dark:hover:text-white"
          >
            <Icon name="eye" className="h-4 w-4" />
          </button>
        </div>

        <AnimatePresence>
          {shake && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 text-center text-[12px] font-semibold text-rose-500"
            >
              Kata sandi salah, coba lagi.
            </motion.p>
          )}
        </AnimatePresence>

        <button
          type="submit"
          disabled={checking}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3 text-[13.5px] font-bold text-white shadow-lg shadow-violet-600/25 transition hover:scale-[1.02] active:scale-95 disabled:opacity-60"
        >
          {checking ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : (
            <Icon name="unlock" className="h-4 w-4" strokeWidth={2.1} />
          )}
          Masuk
        </button>

        <button
          type="button"
          onClick={onClose}
          className="mt-2.5 w-full rounded-xl py-2.5 text-[12.5px] font-semibold text-slate-500 transition hover:text-slate-800 dark:hover:text-white"
        >
          Kembali ke pembaca
        </button>

        {defaultHint && (
          <p className="mt-5 rounded-xl bg-slate-900/[0.04] px-3 py-2 text-center text-[11px] text-slate-500 dark:bg-white/5 dark:text-slate-400">
            Kata sandi bawaan:{" "}
            <span className="font-bold text-brand-600 dark:text-brand-400">admin123</span>
          </p>
        )}
      </motion.form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dasbor                                                              */
/* ------------------------------------------------------------------ */

type Tab = "doc" | "look" | "conn";

export type AdminStatus = {
  firebase: boolean;
  files: boolean;
  live: boolean;
  pages: number;
};

function Dashboard(props: {
  pub: Publication;
  patch: (p: Partial<Publication>) => void;
  conn: Connection;
  onConn: (c: Connection) => void;
  onTest: () => void;
  onUpload: (f: File) => void;
  onRemove: () => void;
  onPassword: (p: string) => void;
  onClose: () => void;
  onLogout: () => void;
  busy: string | null;
  status: AdminStatus;
}) {
  const { pub, patch, conn, onConn, onTest, onUpload, onRemove, onPassword, status } = props;
  const [tab, setTab] = useState<Tab>("doc");
  const [over, setOver] = useState(false);
  const [pwd, setPwd] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const fb = (k: keyof Connection["firebase"], v: string) =>
    onConn({ ...conn, firebase: { ...conn.firebase, [k]: v } });

  const dateLabel = pub.uploadedAt
    ? new Date(pub.uploadedAt).toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Dokumen contoh bawaan";

  const tabs: { id: Tab; label: string; icon: IconName }[] = [
    { id: "doc", label: "Dokumen", icon: "file" },
    { id: "look", label: "Tampilan", icon: "book" },
    { id: "conn", label: "Koneksi", icon: "settings" },
  ];

  return (
    <div className="nice-scroll h-full w-full overflow-y-auto">
      <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-9">
        {/* header */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 via-brand-500 to-fuchsia-500 shadow-lg shadow-brand-500/30">
            <Icon name="settings" className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl dark:text-white">
              Panel Admin
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <Pill ok={status.firebase} label={status.firebase ? "Firestore" : "Firebase off"} />
              <Pill ok={status.files} label={status.files ? "PDF database" : "PDF off"} />
              {status.live && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/15 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide text-brand-600 dark:text-brand-400">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-500" />
                  </span>
                  realtime
                </span>
              )}
            </div>
          </div>
          <button
            onClick={props.onLogout}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-900/10 px-3 text-[12.5px] font-semibold text-slate-600 transition hover:bg-slate-900/5 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
          >
            <Icon name="logout" className="h-4 w-4" />
            Keluar
          </button>
          <button
            onClick={props.onClose}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3.5 text-[12.5px] font-bold text-white shadow-lg shadow-violet-600/25 transition hover:scale-[1.03] active:scale-95"
          >
            <Icon name="eye" className="h-4 w-4" />
            Pembaca
          </button>
        </div>

        {/* tab bar */}
        <div className="mt-5 flex gap-1 rounded-2xl bg-slate-900/5 p-1 dark:bg-white/5">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "relative flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-[12.5px] font-bold transition",
                tab === t.id
                  ? "text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white",
              )}
            >
              {tab === t.id && (
                <motion.span
                  layoutId="admin-tab"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-md shadow-violet-600/25"
                />
              )}
              <Icon name={t.icon} className="relative h-4 w-4" />
              <span className="relative">{t.label}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="mt-4 space-y-4"
          >
            {/* ------------------------------ DOKUMEN ------------------------------ */}
            {tab === "doc" && (
              <>
                <div className="grid gap-4 lg:grid-cols-5">
                  <div className="lg:col-span-2">
                    <Card title="Dokumen aktif" icon="file">
                      <div className="flex items-start gap-3">
                        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-rose-500/10 text-rose-500">
                          <Icon name="file" className="h-6 w-6" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-bold text-slate-900 dark:text-white">
                            {pub.fileName || "Dokumen contoh"}
                          </p>
                          <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">
                            {status.pages} halaman · {formatBytes(pub.size)}
                          </p>
                          <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-slate-900/5 px-2 py-1 text-[11px] font-medium text-slate-500 dark:bg-white/10 dark:text-slate-300">
                            <Icon name="clock" className="h-3.5 w-3.5" />
                            {dateLabel}
                          </p>
                        </div>
                      </div>

                      {pub.path && (
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center gap-2 rounded-xl bg-slate-900/[0.04] px-3 py-2 dark:bg-white/5">
                            <Icon name="lock" className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <span className="truncate font-mono text-[11px] text-slate-500 dark:text-slate-400">
                              {pub.path}
                            </span>
                          </div>
                          <button
                            onClick={() => navigator.clipboard?.writeText(pub.downloadUrl)}
                            className="w-full truncate rounded-xl border border-slate-900/10 px-3 py-2 text-left font-mono text-[11px] text-brand-600 transition hover:bg-brand-500/5 dark:border-white/10 dark:text-brand-400"
                          >
                            {pub.downloadUrl}
                          </button>
                        </div>
                      )}

                      {pub.path && (
                        <button
                          onClick={onRemove}
                          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 py-2.5 text-[12.5px] font-bold text-rose-600 transition hover:bg-rose-500/20 dark:text-rose-400"
                        >
                          <Icon name="trash" className="h-4 w-4" />
                          Hapus publikasi
                        </button>
                      )}
                    </Card>
                  </div>

                  <div className="lg:col-span-3">
                    <button
                      onClick={() => fileRef.current?.click()}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setOver(true);
                      }}
                      onDragLeave={() => setOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setOver(false);
                        const f = e.dataTransfer.files?.[0];
                        if (f) onUpload(f);
                      }}
                      className={cn(
                        "flex h-full min-h-[210px] w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-6 text-center transition-all duration-300",
                        over
                          ? "scale-[1.01] border-brand-500 bg-brand-500/10"
                          : "border-slate-300 bg-white/60 hover:border-brand-400 hover:bg-white/90 dark:border-white/15 dark:bg-white/5 dark:hover:border-brand-400/70",
                      )}
                    >
                      <motion.div
                        animate={over ? { y: -6, scale: 1.08 } : { y: 0, scale: 1 }}
                        className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 via-brand-500 to-fuchsia-500 shadow-xl shadow-brand-500/30"
                      >
                        {props.busy ? (
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        ) : (
                          <Icon name="upload" className="h-6 w-6 text-white" strokeWidth={2.2} />
                        )}
                      </motion.div>
                      <div>
                        <p className="text-[14.5px] font-bold text-slate-900 dark:text-white">
                          {props.busy ?? "Unggah berkas PDF"}
                        </p>
                        <p className="mx-auto mt-1 max-w-xs text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
                          PDF dipecah menjadi potongan data dan disimpan bersama metadatanya di
                          Firestore, lalu langsung tampil secara realtime.
                        </p>
                      </div>
                      <span className="mt-1 rounded-full bg-slate-900/5 px-2.5 py-1 text-[10.5px] font-semibold text-slate-500 dark:bg-white/10 dark:text-slate-400">
                        Tanpa Firebase Storage dan tanpa kartu pembayaran
                      </span>
                    </button>
                  </div>
                </div>

                {(!status.files || !status.firebase) && (
                  <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4">
                    <p className="flex items-center gap-2 text-[12.5px] font-bold text-amber-700 dark:text-amber-400">
                      <Icon name="shield" className="h-4 w-4" />
                      Sebagian backend belum tersambung
                    </p>
                    <p className="mt-1 text-[12px] leading-relaxed text-amber-700/80 dark:text-amber-400/80">
                      {!status.files && "Penyimpanan file Firestore belum tersambung. "}
                      {!status.firebase && "Firestore belum tersambung. "}
                      Buka tab <b>Koneksi</b> untuk melengkapinya.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* ------------------------------ TAMPILAN ----------------------------- */}
            {tab === "look" && (
              <div className="grid gap-4 lg:grid-cols-2">
                <Card title="Identitas halaman depan" icon="page">
                  <div className="space-y-3.5">
                    <Field label="Judul dokumen" hint="Kosongkan untuk memakai nama berkas.">
                      <input
                        value={pub.title}
                        onChange={(e) => patch({ title: e.target.value })}
                        placeholder={pub.fileName || "LumenPDF"}
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Keterangan singkat">
                      <input
                        value={pub.subtitle}
                        onChange={(e) => patch({ subtitle: e.target.value })}
                        placeholder="mis. Edisi Januari 2026"
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Mode baca awal">
                      <div className="mt-1.5 grid grid-cols-3 gap-1.5 rounded-xl bg-slate-900/5 p-1 dark:bg-white/5">
                        {(
                          [
                            ["single", "Halaman"],
                            ["book", "Buku"],
                            ["scroll", "Gulir"],
                          ] as const
                        ).map(([id, label]) => (
                          <button
                            key={id}
                            onClick={() => patch({ mode: id })}
                            className={cn(
                              "relative rounded-lg py-2 text-[12px] font-bold transition",
                              pub.mode === id
                                ? "text-white"
                                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white",
                            )}
                          >
                            {pub.mode === id && (
                              <motion.span
                                layoutId="admin-mode"
                                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                                className="absolute inset-0 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600"
                              />
                            )}
                            <span className="relative">{label}</span>
                          </button>
                        ))}
                      </div>
                    </Field>
                  </div>
                </Card>

                <Card title="Perilaku & keamanan" icon="shield">
                  <div className="space-y-3">
                    <Toggle
                      checked={pub.dark}
                      onChange={(v) => patch({ dark: v })}
                      label="Tema gelap sebagai bawaan"
                      desc="Pengunjung tetap bisa menggantinya."
                    />
                    <Toggle
                      checked={pub.allowDownload}
                      onChange={(v) => patch({ allowDownload: v })}
                      label="Izinkan unduh dokumen"
                      desc="Menampilkan tombol unduh di bilah atas."
                    />
                    <Field
                      label="Ganti kata sandi admin"
                      hint="Disimpan sebagai hash SHA-256 di Firestore."
                    >
                      <div className="flex gap-2">
                        <input
                          value={pwd}
                          onChange={(e) => setPwd(e.target.value)}
                          className={inputCls}
                          placeholder="Kata sandi baru"
                        />
                        <button
                          onClick={() => {
                            if (pwd.trim().length >= 4) {
                              onPassword(pwd.trim());
                              setPwd("");
                            }
                          }}
                          className="mt-1.5 shrink-0 rounded-xl bg-slate-900 px-4 text-[12.5px] font-bold text-white transition hover:opacity-90 active:scale-95 dark:bg-white dark:text-ink-900"
                        >
                          Simpan
                        </button>
                      </div>
                    </Field>
                  </div>
                </Card>
              </div>
            )}

            {/* ------------------------------- KONEKSI ----------------------------- */}
            {tab === "conn" && (
              <>
                <Card
                  title="Firebase Firestore"
                  icon="settings"
                  right={<Pill ok={status.firebase} label={status.firebase ? "aktif" : "kosong"} />}
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="API Key">
                      <input
                        value={conn.firebase.apiKey}
                        onChange={(e) => fb("apiKey", e.target.value.trim())}
                        placeholder="AIzaSy..."
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Project ID">
                      <input
                        value={conn.firebase.projectId}
                        onChange={(e) => fb("projectId", e.target.value.trim())}
                        placeholder="lumenpdf-app"
                        className={inputCls}
                      />
                    </Field>
                    <Field label="App ID">
                      <input
                        value={conn.firebase.appId}
                        onChange={(e) => fb("appId", e.target.value.trim())}
                        placeholder="1:1234567890:web:abc123"
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Auth Domain">
                      <input
                        value={conn.firebase.authDomain}
                        onChange={(e) => fb("authDomain", e.target.value.trim())}
                        placeholder="lumenpdf-app.firebaseapp.com"
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Storage Bucket (tidak dipakai)">
                      <input
                        value={conn.firebase.storageBucket}
                        onChange={(e) => fb("storageBucket", e.target.value.trim())}
                        placeholder="lumenpdf-app.appspot.com"
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Sender ID (opsional)">
                      <input
                        value={conn.firebase.messagingSenderId}
                        onChange={(e) => fb("messagingSenderId", e.target.value.trim())}
                        placeholder="1234567890"
                        className={inputCls}
                      />
                    </Field>
                  </div>
                  <details className="mt-3 rounded-xl bg-slate-900/[0.04] p-3 dark:bg-white/5">
                    <summary className="cursor-pointer text-[12px] font-bold text-slate-600 dark:text-slate-300">
                      Contoh aturan keamanan Firestore
                    </summary>
                    <pre className="nice-scroll mt-2 overflow-x-auto rounded-lg bg-ink-900 p-3 text-[10.5px] leading-relaxed text-emerald-300">{`rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /lumenpdf/publication {
      allow read: if true;
      allow write: if true; // ketatkan sesuai kebutuhan
    }
  }
}`}</pre>
                  </details>
                </Card>

                <Card
                  title="Penyimpanan PDF di Firestore"
                  icon="upload"
                  right={<Pill ok={status.files} label={status.files ? "aktif" : "kosong"} />}
                >
                  <p className="text-[12px] leading-relaxed text-slate-600 dark:text-slate-300">
                    PDF dibagi menjadi potongan sekitar 700 KB dan disimpan sebagai dokumen pada
                    koleksi <b>lumenpdf_files</b>. Cara ini memakai kuota gratis Firestore Spark dan
                    tidak membutuhkan Firebase Storage, paket Blaze, atau kartu pembayaran.
                  </p>
                  <details className="mt-3 rounded-xl bg-slate-900/[0.04] p-3 dark:bg-white/5">
                    <summary className="cursor-pointer text-[12px] font-bold text-slate-600 dark:text-slate-300">
                      Aturan Firestore untuk metadata dan potongan PDF
                    </summary>
                    <pre className="nice-scroll mt-2 overflow-x-auto rounded-lg bg-ink-900 p-3 text-[10.5px] leading-relaxed text-emerald-300">{`rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /lumenpdf/{doc} {
      allow read, write: if true;
    }
    match /lumenpdf_files/{fileId}/{document=**} {
      allow read, write: if true;
    }
  }
}`}</pre>
                    <p className="mt-2 text-[11px] leading-relaxed text-amber-600 dark:text-amber-400">
                      Aturan ini cocok untuk pengujian. Untuk produksi, write sebaiknya dilindungi
                      Firebase Authentication agar hanya admin yang dapat mengunggah.
                    </p>
                  </details>
                </Card>

                <button
                  onClick={onTest}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3 text-[13px] font-bold text-white shadow-lg shadow-violet-600/25 transition hover:scale-[1.01] active:scale-95"
                >
                  <Icon name="check" className="h-4 w-4" />
                  Terapkan & uji koneksi
                </button>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        <p className="mt-6 text-center text-[11px] text-slate-400">
          LumenPDF · metadata dan potongan PDF tersimpan sepenuhnya di Firebase Firestore.
        </p>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shell                                                               */
/* ------------------------------------------------------------------ */

export function AdminOverlay(props: {
  open: boolean;
  authed: boolean;
  pub: Publication;
  conn: Connection;
  status: AdminStatus;
  busy: string | null;
  onAuth: (pwd: string) => Promise<boolean>;
  onClose: () => void;
  onLogout: () => void;
  patch: (p: Partial<Publication>) => void;
  onConn: (c: Connection) => void;
  onTest: () => void;
  onUpload: (f: File) => void;
  onRemove: () => void;
  onPassword: (p: string) => void;
}) {
  const { open, authed, onClose } = props;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="absolute inset-0 z-[70] bg-slate-100/95 backdrop-blur-xl dark:bg-ink-950/95"
        >
          <button
            onClick={onClose}
            aria-label="Tutup admin"
            className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-900/5 hover:text-slate-900 active:scale-90 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <Icon name="close" />
          </button>

          {authed ? (
            <Dashboard {...props} />
          ) : (
            <LockScreen
              onAuth={props.onAuth}
              onClose={onClose}
              defaultHint={!props.pub.passwordHash}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
