import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

export const languages = ["Telugu", "Tamil", "English"] as const;
export type Language = (typeof languages)[number];

export type FileSlot = {
  name: string;
  url: string;
  size: string;
  bytes: number;
  uploadedAt: string;
  storagePath?: string;
};

export type Keerthana = {
  id: string;
  name: string;
  raga: string;
  tala: string;
  composer: string;
  deity: string;
  lyrics: string;
  translation: string;
  notationFiles: Record<Language, FileSlot[]>;
};

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseConfigured = Object.values(config).every(Boolean);
const app = firebaseConfigured
  ? getApps().length > 0
    ? getApp()
    : initializeApp(config)
  : null;

export const auth = app ? getAuth(app) : null;
export const firestore = app ? getFirestore(app) : null;
export const storage = app ? getStorage(app) : null;
export const googleProvider = app ? new GoogleAuthProvider() : null;

export const allowedEmails = (import.meta.env.VITE_FIREBASE_ALLOWED_EMAILS ?? "")
  .split(",")
  .map((email: string) => email.trim().toLowerCase())
  .filter(Boolean);

export function isAllowedUser(email: string | null): boolean {
  return allowedEmails.length === 0 || (!!email && allowedEmails.includes(email.toLowerCase()));
}