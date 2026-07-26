// src/app/api/check-status/route.ts
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/services/firebaseAdmin";

export const dynamic = "force-dynamic";

const STATUS_MAP: Record<string, string> = {
  capture: "paid",
  settlement: "paid",
  pending: "pending",
  deny: "failed",
  cancel: "cancelled",
  expire: "failed",
  refund: "refunded",
  partial_refund: "refunded",
};

// Validasi orderId pola EVO-<digits> — sama dengan webhook untuk konsistensi.
const ORDER_ID_PATTERN = /^EVO-\d+$/;

// Per-IP rate limit (best-effort in-memory).
// CATATAN: ini per-instance; pada Vercel serverless setiap cold start dapat
// map baru, jadi limit efektif kira-kira N_instances * 10/min. Untuk
// production-grade limiting butuh Upstash/Redis.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;
const rateLimitMap = new Map<string, number[]>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const hits = rateLimitMap.get(ip) ?? [];
  const recent = hits.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) {
    rateLimitMap.set(ip, recent);
    return false;
  }
  recent.push(now);
  rateLimitMap.set(ip, recent);
  return true;
}

export async function POST(req: Request) {
  try {
    // Per-IP rate limit sebelum body parsing
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 },
      );
    }

    const body = await req.json();
    const { orderId } = body;

    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json(
        { error: "orderId tidak valid" },
        { status: 400 },
      );
    }

    if (!ORDER_ID_PATTERN.test(orderId)) {
      return NextResponse.json({ error: "Invalid orderId" }, { status: 400 });
    }

    const serverKey = process.env.MIDTRANS_SERVER_KEY || "";
    const baseUrl =
      process.env.NEXT_PUBLIC_MIDTRANS_USE_PROD === "1"
        ? "https://api.midtrans.com"
        : "https://api.sandbox.midtrans.com";

    // Query Midtrans status API
    const auth = Buffer.from(serverKey + ":").toString("base64");
    const res = await fetch(`${baseUrl}/v2/${orderId}/status`, {
      method: "GET",
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.error("[CheckStatus] Midtrans error:", res.status, errBody);
      return NextResponse.json(
        { error: "Gagal cek status ke Midtrans" },
        { status: 502 },
      );
    }

    const data = await res.json();
    const newFirestoreStatus =
      STATUS_MAP[data.transaction_status] || "pending";

    // Update Firestore
    const db = getAdminDb();
    const orderRef = db.collection("orders").doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const current = orderSnap.data();
    if (current?.status !== newFirestoreStatus) {
      await orderRef.update({
        status: newFirestoreStatus,
        midtransTransactionStatus: data.transaction_status,
        statusUpdatedAt: FieldValue.serverTimestamp(),
      });
    }

    // Minimal contract: hanya `status` yang dikembalikan ke caller.
    // midtransTransactionStatus / fraud_status hanya untuk internal Firestore.
    return NextResponse.json({ status: newFirestoreStatus });
  } catch (err: any) {
    console.error("[CheckStatus] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}