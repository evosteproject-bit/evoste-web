import {
  initializeApp,
  getApps,
  cert,
  type App,
} from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";

/**
 * Inisialisasi Firebase Admin SDK untuk server-side use only.
 *
 * Admin SDK bypass Firestore rules — semua logika validasi (stock decrement,
 * order creation) HARUS di server-side code karena rules tidak lagi jadi
 * pengaman terakhir.
 *
 * Cara setup credentials:
 *
 * 1. Buka Firebase Console → Project Settings → Service Accounts
 *    (https://console.firebase.google.com/project/evosteproject26/settings/serviceaccounts/adminsdk)
 * 2. Klik "Generate New Private Key" → download file JSON
 * 3. Taruh isi file JSON-nya di env var FIREBASE_SERVICE_ACCOUNT_KEY
 *    (JSON.stringify satu baris).
 *    - Lokal: taruh di .env
 *    - Vercel: Project Settings → Environment Variables
 */

let _adminApp: App | null = null;
let _adminDb: Firestore | null = null;

function getAdminApp(): App {
  if (_adminApp) return _adminApp;
  if (getApps().length > 0) {
    _adminApp = getApps()[0];
    return _adminApp;
  }

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKey) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY tidak ditemukan di environment variables. " +
        "Download service account JSON dari Firebase Console dan tambahkan ke .env / Vercel env.",
    );
  }

  let credential;
  try {
    credential = cert(JSON.parse(serviceAccountKey));
  } catch {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY bukan JSON yang valid. " +
        "Pastikan env var berisi JSON.stringify dari service account JSON.",
    );
  }

  _adminApp = initializeApp({
    credential,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });

  return _adminApp;
}

/**
 * Lazy-init Firestore Admin instance — bypass security rules.
 * HANYA gunakan di API routes (server-side), JANGAN import di client component.
 *
 * Panggil di dalam route handler, BUKAN di top-level module.
 * Contoh: `const adminDb = getAdminDb();`
 */
export function getAdminDb(): Firestore {
  if (!_adminDb) {
    _adminDb = getFirestore(getAdminApp());
  }
  return _adminDb;
}