import { NextResponse } from "next/server";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/services/firebaseConfig";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { cart = [], orderId = `order-${Date.now()}` } = body;

    const item_details = cart.map((it: any, idx: number) => {
      const price =
        typeof it.price === "string"
          ? Number(String(it.price).replace(/\./g, ""))
          : Number(it.price ?? 0);

      return {
        id: it.id ?? String(idx + 1),
        price: price,
        quantity: it.quantity ?? 1,
        name: (it.name ?? "Item").substring(0, 50),
      };
    });

    const calculatedTotal = item_details.reduce(
      (acc: number, item: any) => acc + item.price * item.quantity,
      0,
    );

    const orderRef = doc(db, "orders", orderId);
    await setDoc(orderRef, {
      orderId,
      items: cart,
      total: calculatedTotal,
      status: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const MIDTRANS_USE_PROD = process.env.MIDTRANS_USE_PROD === "1";
    const MIDTRANS_BASE = MIDTRANS_USE_PROD
      ? "https://app.midtrans.com"
      : "https://app.sandbox.midtrans.com";

    // Pemanggilan mutlak dari environment variable
    const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY;

    if (!MIDTRANS_SERVER_KEY) {
      console.error("Konfigurasi Server Key Midtrans tidak ditemukan.");
      return NextResponse.json(
        { error: "Server Configuration Error" },
        { status: 500 },
      );
    }

    const payload = {
      transaction_details: {
        order_id: orderId,
        gross_amount: calculatedTotal,
      },
      item_details: item_details,
    };

    const auth = Buffer.from(`${MIDTRANS_SERVER_KEY}:`).toString("base64");

    const res = await fetch(`${MIDTRANS_BASE}/snap/v1/transactions`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text().catch(() => "");
    if (!res.ok) {
      console.error(
        "Midtrans Error Payload:",
        JSON.stringify(payload, null, 2),
      );
      return NextResponse.json(
        { error: `Midtrans error: ${res.status}`, details: text || null },
        { status: 502 },
      );
    }

    let json: any = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch (e) {
      return NextResponse.json(
        { error: "Midtrans invalid response", details: text },
        { status: 502 },
      );
    }

    return NextResponse.json(json);
  } catch (err: any) {
    console.error("Checkout Catch Error:", err);
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: 500 },
    );
  }
}
