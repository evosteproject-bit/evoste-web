import { NextResponse } from "next/server";
import crypto from "crypto";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/services/firebaseConfig";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      fraud_status,
    } = body;

    // Pemanggilan mutlak dari environment variable
    const serverKey = process.env.MIDTRANS_SERVER_KEY;

    if (!serverKey) {
      console.error("Konfigurasi Server Key Midtrans tidak ditemukan.");
      return NextResponse.json(
        { error: "Server Configuration Error" },
        { status: 500 },
      );
    }

    const hashString = `${order_id}${status_code}${gross_amount}${serverKey}`;
    const expectedSignature = crypto
      .createHash("sha512")
      .update(hashString)
      .digest("hex");

    if (signature_key !== expectedSignature) {
      console.error(
        "Invalid Signature Key. Potensi serangan manipulasi data terdeteksi.",
      );
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    let finalStatus = "pending";

    if (
      transaction_status === "capture" ||
      transaction_status === "settlement"
    ) {
      if (fraud_status === "challenge") {
        finalStatus = "pending";
      } else if (fraud_status === "accept" || !fraud_status) {
        finalStatus = "settlement";
      }
    } else if (
      transaction_status === "cancel" ||
      transaction_status === "deny" ||
      transaction_status === "expire"
    ) {
      finalStatus = "failed";
    }

    const orderRef = doc(db, "orders", order_id);
    await updateDoc(orderRef, {
      status: finalStatus,
      updatedAt: serverTimestamp(),
    });

    return NextResponse.json({ message: "OK" }, { status: 200 });
  } catch (error: any) {
    console.error("Webhook Error:", error.message);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
