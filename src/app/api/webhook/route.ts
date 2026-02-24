import { NextResponse } from "next/server";
import { doc, getDoc, updateDoc, increment } from "firebase/firestore";
import { db } from "@/services/firebaseConfig";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const orderId = body.order_id;
    const transactionStatus = body.transaction_status;
    const fraudStatus = body.fraud_status;

    if (!orderId) {
      return NextResponse.json(
        { error: "Kehilangan parameter Order ID" },
        { status: 400 },
      );
    }

    let finalStatus = "pending";

    if (transactionStatus === "capture") {
      if (fraudStatus === "challenge") finalStatus = "pending";
      else if (fraudStatus === "accept") finalStatus = "settlement";
    } else if (transactionStatus === "settlement") {
      finalStatus = "settlement";
    } else if (
      transactionStatus === "cancel" ||
      transactionStatus === "deny" ||
      transactionStatus === "expire"
    ) {
      finalStatus = "failed";
    } else if (transactionStatus === "pending") {
      finalStatus = "pending";
    }

    const orderRef = doc(db, "orders", orderId);
    const orderSnap = await getDoc(orderRef);

    if (orderSnap.exists()) {
      const currentStatus = orderSnap.data().status;
      const cart = orderSnap.data().cart;

      if (currentStatus === "shipped" || currentStatus === "completed") {
        return NextResponse.json(
          { message: "Update diabaikan, pesanan sudah diproses." },
          { status: 200 },
        );
      }

      // LOGIKA PENGEMBALIAN STOK (RESTOCK)
      // Jika status berubah menjadi 'failed' dan sebelumnya bukan 'failed'
      if (finalStatus === "failed" && currentStatus !== "failed") {
        const updatePromises = cart.map((item: any) => {
          const productRef = doc(db, "products", item.id);
          // Menggunakan increment untuk mengembalikan stok secara atomik
          return updateDoc(productRef, {
            stock: increment(item.quantity || 1),
          });
        });

        await Promise.all(updatePromises);
        console.log(
          `Pengembalian stok berhasil untuk pesanan gagal: ${orderId}`,
        );
      }
    } else {
      return NextResponse.json(
        { error: "Dokumen pesanan tidak ditemukan." },
        { status: 404 },
      );
    }

    await updateDoc(orderRef, { status: finalStatus });

    return NextResponse.json({ status: "success" });
  } catch (error: any) {
    console.error("Webhook API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
