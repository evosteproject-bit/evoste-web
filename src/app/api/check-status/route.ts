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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId } = body;

    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json(
        { error: "orderId tidak valid" },
        { status: 400 },
      );
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

    return NextResponse.json({
      status: newFirestoreStatus,
      midtransTransactionStatus: data.transaction_status,
      fraud_status: data.fraud_status || null,
    });
  } catch (err: any) {
    console.error("[CheckStatus] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}