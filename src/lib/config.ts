/** Firebase project configuration. Environment values can override the defaults. */

export type FirebaseConf = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  storageBucket: string;
  messagingSenderId: string;
  measurementId: string;
};

export type Connection = { firebase: FirebaseConf };

const env = import.meta.env as Record<string, string | undefined>;

export const FIREBASE_CONNECTION: Connection = {
  firebase: {
    apiKey: env.VITE_FIREBASE_API_KEY ?? "AIzaSyBbgQkzPfwXvuJSkXrk0_HDYh0RJ7BxVkY",
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? "katalog-rtv.firebaseapp.com",
    projectId: env.VITE_FIREBASE_PROJECT_ID ?? "katalog-rtv",
    appId: env.VITE_FIREBASE_APP_ID ?? "1:1094285832571:web:335fe7ac5f05a22c1d4dde",
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET ?? "katalog-rtv.firebasestorage.app",
    messagingSenderId: env.VITE_FIREBASE_SENDER_ID ?? "1094285832571",
    measurementId: env.VITE_FIREBASE_MEASUREMENT_ID ?? "G-QXP5N1NCPR",
  },
};

export const hasFirebase = (c: Connection) =>
  Boolean(
    c.firebase.apiKey &&
      c.firebase.projectId &&
      c.firebase.appId,
  );

export async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
