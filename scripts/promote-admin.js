// scripts/promote-admin.js
// Promotes a Firebase Auth user to admin role in Firestore.
// Usage: node scripts/promote-admin.js <email>
//
// Requires .env with:
//   NEXT_PUBLIC_FIREBASE_API_KEY
//   NEXT_PUBLIC_FIREBASE_PROJECT_ID
//
// This uses Firebase Identity Toolkit (REST) to look up the user by email,
// then uses the Firestore REST API to set role:"admin" on users/{uid}.

const fs = require("fs");
const path = require("path");

// Load .env manually (no dotenv dependency required)
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

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/promote-admin.js <email>");
  process.exit(1);
}

async function lookupUidByEmail(email) {
  const url = `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:lookup?key=${API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      `Identity Toolkit error: ${data?.error?.message || res.statusText}`,
    );
  }
  const users = data?.users || [];
  if (users.length === 0) {
    throw new Error(`User dengan email "${email}" tidak ditemukan di Firebase Auth.`);
  }
  return users[0].localId; // localId is the UID
}

async function setAdminRole(uid) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}?updateMask.fieldPaths=role&key=${API_KEY}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fields: {
        role: { stringValue: "admin" },
      },
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      `Firestore error: ${data?.error?.message || res.statusText}. Cek Firestore rules — perlu allow write untuk path users/{uid}.`,
    );
  }
}

(async () => {
  try {
    console.log(`🔍  Mencari UID untuk email: ${email} ...`);
    const uid = await lookupUidByEmail(email);
    console.log(`✅  Ditemukan UID: ${uid}`);

    console.log(`🛡️   Mengatur role: "admin" di users/${uid} ...`);
    await setAdminRole(uid);
    console.log(`🎉  Sukses! User ${email} sekarang adalah admin.`);
    console.log(`\nSilakan login di http://localhost:3000/admin/login`);
  } catch (err) {
    console.error("❌  Gagal:", err.message);
    process.exit(1);
  }
})();
