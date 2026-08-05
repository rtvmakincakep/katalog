/** Lapisan Firestore: satu dokumen berisi publikasi aktif + pengaturan tampilan. */

import { deleteApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  Bytes,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import { hasFirebase, type Connection, type FirebaseConf } from "@/lib/config";

export type Publication = {
  /* berkas */
  fileName: string;
  path: string;
  downloadUrl: string;
  size: number;
  pages: number;
  uploadedAt: number;
  /* tampilan */
  title: string;
  subtitle: string;
  mode: "single" | "book" | "scroll";
  dark: boolean;
  allowDownload: boolean;
  /* keamanan */
  passwordHash: string;
};

export const EMPTY_PUBLICATION: Publication = {
  fileName: "",
  path: "",
  downloadUrl: "",
  size: 0,
  pages: 0,
  uploadedAt: 0,
  title: "",
  subtitle: "",
  mode: "single",
  dark: true,
  allowDownload: true,
  passwordHash: "",
};

const COLLECTION = "lumenpdf";
const DOC_ID = "publication";

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let signature = "";

function sign(c: FirebaseConf) {
  return `${c.projectId}|${c.apiKey}|${c.appId}`;
}

/** Inisialisasi (atau re-inisialisasi bila konfigurasi berubah). */
export function connect(conn: Connection): Firestore | null {
  if (!hasFirebase(conn)) return null;
  const next = sign(conn.firebase);
  if (db && signature === next) return db;

  try {
    if (app) {
      void deleteApp(app).catch(() => undefined);
      app = null;
      db = null;
    }
    const name = `lumenpdf-${Date.now()}`;
    app = initializeApp(
      {
        apiKey: conn.firebase.apiKey,
        authDomain: conn.firebase.authDomain || `${conn.firebase.projectId}.firebaseapp.com`,
        projectId: conn.firebase.projectId,
        storageBucket: conn.firebase.storageBucket,
        messagingSenderId: conn.firebase.messagingSenderId,
        appId: conn.firebase.appId,
        measurementId: conn.firebase.measurementId,
      },
      getApps().length ? name : undefined,
    );
    db = getFirestore(app);
    signature = next;
    return db;
  } catch (e) {
    console.error("Firebase init gagal", e);
    return null;
  }
}

const ref = (database: Firestore) => doc(database, COLLECTION, DOC_ID);

export async function fetchPublication(database: Firestore): Promise<Publication | null> {
  const snap = await getDoc(ref(database));
  if (!snap.exists()) return null;
  return { ...EMPTY_PUBLICATION, ...(snap.data() as Partial<Publication>) };
}

export function watchPublication(
  database: Firestore,
  onData: (p: Publication | null) => void,
  onError?: (e: Error) => void,
) {
  return onSnapshot(
    ref(database),
    (snap) =>
      onData(snap.exists() ? { ...EMPTY_PUBLICATION, ...(snap.data() as Partial<Publication>) } : null),
    (err) => onError?.(err as Error),
  );
}

export async function savePublication(database: Firestore, data: Partial<Publication>) {
  await setDoc(ref(database), { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

/** Uji koneksi: baca dokumen (izin read) lalu tulis penanda kecil (izin write). */
export async function testFirestore(database: Firestore) {
  await getDoc(ref(database));
  await setDoc(ref(database), { pingAt: serverTimestamp() }, { merge: true });
}

export type FirestoreFileUpload = { path: string; downloadUrl: string };

function safeName(name: string) {
  return (
    name.toLowerCase().replace(/\.pdf$/i, "").replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "").slice(0, 60) || "dokumen"
  );
}

/* Keep each document safely below Firestore's 1 MiB document limit. */
const CHUNK_SIZE = 700 * 1024;

export async function uploadPdfToFirestore(
  database: Firestore,
  bytes: Uint8Array,
  fileName: string,
  onProgress?: (percent: number) => void,
): Promise<FirestoreFileUpload> {
  const fileId = `${Date.now()}-${safeName(fileName)}`;
  const total = Math.ceil(bytes.byteLength / CHUNK_SIZE);
  const fileRef = doc(database, "lumenpdf_files", fileId);

  await setDoc(fileRef, {
    fileName,
    size: bytes.byteLength,
    chunks: total,
    contentType: "application/pdf",
    createdAt: serverTimestamp(),
  });

  /* Firestore batches support up to 500 operations; use smaller batches. */
  for (let start = 0; start < total; start += 400) {
    const batch = writeBatch(database);
    const end = Math.min(total, start + 400);
    for (let index = start; index < end; index++) {
      const chunk = bytes.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE);
      batch.set(doc(database, "lumenpdf_files", fileId, "chunks", String(index).padStart(6, "0")), {
        index,
        data: Bytes.fromUint8Array(chunk),
      });
    }
    await batch.commit();
    onProgress?.((end / total) * 100);
  }

  return { path: fileId, downloadUrl: "" };
}

export async function fetchPdfFromFirestore(database: Firestore, fileId: string) {
  const snap = await getDocs(
    query(collection(database, "lumenpdf_files", fileId, "chunks"), orderBy("index")),
  );
  if (snap.empty) throw new Error("Potongan PDF tidak ditemukan di Firestore.");
  const chunks = snap.docs.map((item) => (item.data().data as Bytes).toUint8Array());
  const length = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const out = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

export async function deletePdfFromFirestore(database: Firestore, fileId: string) {
  if (!fileId) return;
  const chunks = await getDocs(collection(database, "lumenpdf_files", fileId, "chunks"));
  for (let start = 0; start < chunks.docs.length; start += 400) {
    const batch = writeBatch(database);
    chunks.docs.slice(start, start + 400).forEach((item) => batch.delete(item.ref));
    await batch.commit();
  }
  await deleteDoc(doc(database, "lumenpdf_files", fileId));
}

export async function verifyFirestoreFile(database: Firestore, fileId: string) {
  if (fileId) await getDoc(doc(database, "lumenpdf_files", fileId));
}
