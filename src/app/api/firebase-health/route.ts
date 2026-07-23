// src/app/api/firebase-health/route.ts
// Test endpoint untuk membuktikan koneksi Firebase (Auth + Firestore) hidup.
// GET /api/firebase-health → { auth: "...", firestore: "..." }
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const results: Record<string, unknown> = {};

  // 1. Cek env vars tersedia
  const envCheck = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? "✓ set" : "✗ MISSING",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? "✓ set" : "✗ MISSING",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? "✓ set" : "✗ MISSING",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? "✓ set" : "✗ MISSING",
  };
  results.env = envCheck;

  // 2. Test Auth REST endpoint (Identity Toolkit)
  try {
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ localId: ["nonexistent_uid_test_only"] }),
      },
    );
    const data = await res.json();
    if (res.ok) {
      results.auth = `✓ connected (Identity Toolkit merespons)`;
    } else if (data?.error?.message?.includes("USER_NOT_FOUND")) {
      // Expected — endpoint reachable, just no such user
      results.auth = `✓ connected (USER_NOT_FOUND = normal untuk UID test)`;
    } else {
      results.auth = `✗ error: ${data?.error?.message || res.statusText}`;
    }
  } catch (err: any) {
    results.auth = `✗ network error: ${err.message}`;
  }

  // 3. Test Firestore REST endpoint
  try {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/nonexistent_test?key=${apiKey}`,
    );
    if (res.status === 404) {
      results.firestore = `✓ connected (404 = normal, dokumen test memang tidak ada)`;
    } else if (res.status === 403) {
      results.firestore = `⚠ rules DENY akses ke /users — perlu cek firestore.rules`;
    } else {
      results.firestore = `? status ${res.status}`;
    }
  } catch (err: any) {
    results.firestore = `✗ network error: ${err.message}`;
  }

  return NextResponse.json(results, { status: 200 });
}
