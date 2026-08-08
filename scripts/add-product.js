// scripts/add-product.js
// Menambahkan 1 produk ke koleksi Firestore `products`.
// Usage: node scripts/add-product.js
//
// Edit variabel NEW_PRODUCT di bawah sebelum menjalankan.
//
// Requires .env dengan:
//   NEXT_PUBLIC_FIREBASE_API_KEY
//   NEXT_PUBLIC_FIREBASE_PROJECT_ID

const fs = require("fs");
const path = require("path");

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}
loadEnv();

const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

if (!API_KEY || !PROJECT_ID) {
  console.error(
    "❌  NEXT_PUBLIC_FIREBASE_API_KEY dan NEXT_PUBLIC_FIREBASE_PROJECT_ID harus ada di .env",
  );
  process.exit(1);
}

// ──────────────────────────────────────────────────────────────
// EDIT DATA PRODUK DI BAWAH INI SESUAI KEBUTUHAN
// ──────────────────────────────────────────────────────────────
const NEW_PRODUCT = {
  // id Firestore doc — biarkan auto kalau mau, atau isi manual
  id: "mystic-rose-50ml",
  name: "Mystic Rose 50ml",
  description:
    "Eau de Parfum 50ml dengan karakter floral oriental yang hangat. Cocok untuk acara malam atau kencan. Reseller Alfian Parfume — bukan official Evoste.",
  price: 350000,
  stock: 10,
  image: "/products/mystic-rose.png",
  category: "Eau de Parfum",
  size: "50ml",
  tags: ["floral", "oriental", "wanita", "malam"],
};
// ──────────────────────────────────────────────────────────────

async function addProduct(product) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/products?documentId=${encodeURIComponent(
    product.id,
  )}&key=${API_KEY}`;

  const fields = {};
  for (const [k, v] of Object.entries(product)) {
    if (k === "id") continue;
    if (typeof v === "string") fields[k] = { stringValue: v };
    else if (typeof v === "number") fields[k] = { integerValue: String(v) };
    else if (typeof v === "boolean") fields[k] = { booleanValue: v };
    else if (Array.isArray(v)) fields[k] = { arrayValue: { values: v.map(String).map((s) => ({ stringValue: s })) } };
    else fields[k] = { stringValue: String(v) };
  }
  fields.createdAt = { timestampValue: new Date().toISOString() };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      `Firestore error: ${data?.error?.message || res.statusText}. Cek Firestore rules — perlu allow create untuk path products.`,
    );
  }
  return data;
}

(async () => {
  try {
    console.log(`📦  Menambahkan produk: ${NEW_PRODUCT.name} (${NEW_PRODUCT.id}) ...`);
    const result = await addProduct(NEW_PRODUCT);
    console.log(`✅  Sukses! Dokumen dibuat: ${result.name}`);
    console.log(`\nLihat di Firestore console atau http://localhost:3000/#catalog`);
  } catch (err) {
    console.error("❌  Gagal:", err.message);
    process.exit(1);
  }
})();