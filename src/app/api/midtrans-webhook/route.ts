// src/app/api/midtrans-webhook/route.ts
import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/services/firebaseAdmin";

export const dynamic = "force-dynamic";

interface MidtransNotification {
  transaction_status: string;
  order_id: string;
  fraud_status?: string;
  status_code?: string;
  gross_amount?: string;
}

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

const ORDER_ID_PATTERN = /^EVO-\d+$/;

function safeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function POST(req: Request) {
  try {
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    if (!serverKey) {
      console.error("[Webhook] MIDTRANS_SERVER_KEY is not configured");
      return NextResponse.json(
        { error: "Server misconfigured" },
        { status: 500 },
      );
    }

    const body = await req.text();
    const signature = req.headers.get("x-signature") || "";

    // Verify signature (constant-time, fail-closed)
    const expected = createHash("sha512")
      .update(body + serverKey)
      .digest("hex");

    if (!signature || !safeEqualHex(signature, expected)) {
      console.error("[Webhook] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const data: MidtransNotification = JSON.parse(body);

    // Validate order_id format
    if (!data.order_id || !ORDER_ID_PATTERN.test(data.order_id)) {
      console.error("[Webhook] Invalid order_id format:", data.order_id);
      return NextResponse.json(
        { error: "Invalid order_id" },
        { status: 400 },
      );
    }

    const newFirestoreStatus = STATUS_MAP[data.transaction_status];
    if (!newFirestoreStatus) {
      console.error(
        "[Webhook] Unknown transaction_status, skipping update:",
        data.transaction_status,
      );
      return NextResponse.json({ ok: true, status: "unknown_status" });
    }

    const db = getAdminDb();
    const orderRef = db.collection("orders").doc(data.order_id);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      console.error("[Webhook] Order not found:", data.order_id);
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const current = orderSnap.data();
    const paymentInfo = {
      fraud_status: data.fraud_status || null,
      gross_amount: data.gross_amount || null,
      status_code: data.status_code || null,
    };

    // Status unchanged: still update metadata so we capture latest
    // midtransTransactionStatus / fraud_status / status_code from Midtrans.
    if (current?.status === newFirestoreStatus) {
      await orderRef.update({
        midtransTransactionStatus: data.transaction_status,
        paymentInfo,
      });
      return NextResponse.json({ ok: true, status: "no_change" });
    }

    await orderRef.update({
      status: newFirestoreStatus,
      midtransTransactionStatus: data.transaction_status,
      statusUpdatedAt: FieldValue.serverTimestamp(),
      paymentInfo,
    });

    return NextResponse.json({ ok: true, status: newFirestoreStatus });
  } catch (err: any) {
    console.error("[Webhook] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
