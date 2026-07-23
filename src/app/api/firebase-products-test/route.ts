// src/app/api/firebase-products-test/route.ts
// Verifikasi rules: test read publik + write behavior
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const result: Record<string, unknown> = { projectId };

  try {
    // 1. Test READ publik (tidak butuh auth)
    const listRes = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/products?pageSize=3&key=${apiKey}`,
    );
    const listData = await listRes.json();
    result.publicRead = {
      ok: listRes.ok,
      status: listRes.status,
      count: listRes.ok ? (listData.documents?.length || 0) : 0,
      message: listRes.ok
        ? "✓ Read publik works"
        : `✗ Read gagal: ${listData?.error?.message}`,
    };

    // 2. Test WRITE tanpa auth (harus DENY karena rules butuh request.auth != null)
    const writeNoAuth = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/products/test_no_auth_${Date.now()}?key=${apiKey}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: { name: { stringValue: "TEST" } },
        }),
      },
    );
    const writeNoAuthData = await writeNoAuth.json();
    result.unauthWrite = {
      status: writeNoAuth.status,
      denied: writeNoAuth.status === 403,
      message:
        writeNoAuth.status === 403
          ? "✓ Rules DENY write tanpa auth (expected)"
          : `? Status ${writeNoAuth.status}: ${writeNoAuthData?.error?.message}`,
    };

    // 3. Cleanup kalau somehow berhasil
    if (writeNoAuth.ok) {
      await fetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/products/${writeNoAuthData?.name?.split("/").pop()}?key=${apiKey}`,
        { method: "DELETE" },
      );
    }

    // Kesimpulan
    result.conclusion =
      result.publicRead.ok && writeNoAuth.status === 403
        ? "✓ Rules AKTIF dan berfungsi: read publik OK, write tanpa auth DENY. " +
          "Customer terautentikasi akan bisa decrement stok di checkout."
        : "⚠ Ada yang aneh. Cek detail di atas.";

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
