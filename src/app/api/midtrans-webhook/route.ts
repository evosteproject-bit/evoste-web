// src/app/api/midtrans-webhook/route.ts
import { NextResponse } from "next/server";
import { createHash } from "crypto";
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

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-signature") || "";

    // Verify signature
    const serverKey = process.env.MIDTRANS_SERVER_KEY || "";
    const expected = createHash("sha512")
      .update(body + serverKey)
      .digest("hex");

    if (signature !== expected) {
      console.error("[Webhook] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const data: MidtransNotification = JSON.parse(body);
    const newFirestoreStatus = STATUS_MAP[data.transaction_status] || "pending";

    const db = getAdminDb();
    const orderRef = db.collection("orders").doc(data.order_id);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      console.error("[Webhook] Order not found:", data.order_id);
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Idempotency: skip jika status sudah sama
    const current = orderSnap.data();
    if (current?.status === newFirestoreStatus) {
      return NextResponse.json({ ok: true, status: "no_change" });
    }

    await orderRef.update({
      status: newFirestoreStatus,
      midtransTransactionStatus: data.transaction_status,
      statusUpdatedAt: FieldValue.serverTimestamp(),
      paymentInfo: {
        fraud_status: data.fraud_status || null,
        gross_amount: data.gross_amount || null,
        status_code: data.status_code || null,
      },
    });

    return NextResponse.json({ ok: true, status: newFirestoreStatus });
  } catch (err: any) {
    console.error("[Webhook] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
