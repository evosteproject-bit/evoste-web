import { NextResponse } from "next/server";
import { doc, serverTimestamp, runTransaction } from "firebase/firestore";
import { db } from "@/services/firebaseConfig";
import Midtrans from "midtrans-client";

const snap = new Midtrans.Snap({
  isProduction: process.env.NEXT_PUBLIC_MIDTRANS_USE_PROD === "1",
  serverKey: process.env.MIDTRANS_SERVER_KEY || "",
  clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "",
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { cart, orderId, customerDetails } = body;

    if (!cart || !orderId || !customerDetails) {
      return NextResponse.json(
        { error: "Data payload tidak lengkap" },
        { status: 400 },
      );
    }

    // 1. Konversi paksa ID Pesanan menjadi String
    const safeOrderId = String(orderId);

    const grossAmount = cart.reduce((acc: number, item: any) => {
      const price = Number(String(item.price).replace(/\./g, ""));
      return acc + price * (item.quantity || 1);
    }, 0);

    // Eksekusi Blok Transaksi Firestore
    await runTransaction(db, async (transaction) => {
      // 2. Konversi paksa ID Produk menjadi String pada Fase Pembacaan
      const productRefs = cart.map((item: any) =>
        doc(db, "products", String(item.id)),
      );
      const productDocs = await Promise.all(
        productRefs.map((ref) => transaction.get(ref)),
      );

      // Fase Validasi Ketat
      productDocs.forEach((pDoc, index) => {
        if (!pDoc.exists()) {
          throw new Error(
            `Produk "${cart[index].name}" sudah tidak tersedia atau telah dihapus dari katalog utama.`,
          );
        }
        const currentStock = pDoc.data().stock;
        const requestedQty = cart[index].quantity || 1;

        if (currentStock < requestedQty) {
          throw new Error(
            `Stok tidak mencukupi untuk "${cart[index].name}". Sisa di gudang: ${currentStock} unit.`,
          );
        }
      });

      // Fase Penulisan (Potong Stok)
      productDocs.forEach((pDoc, index) => {
        const currentStock = pDoc.data().stock;
        const requestedQty = cart[index].quantity || 1;
        transaction.update(productRefs[index], {
          stock: currentStock - requestedQty,
        });
      });

      // Fase Pembuatan Dokumen Pesanan
      const orderRef = doc(db, "orders", safeOrderId);
      transaction.set(orderRef, {
        orderId: safeOrderId,
        cart: cart,
        customerDetails: customerDetails,
        status: "pending",
        grossAmount: grossAmount,
        createdAt: serverTimestamp(),
      });
    });

    // Permintaan Token Midtrans Snap
    const parameters = {
      transaction_details: {
        order_id: safeOrderId,
        gross_amount: grossAmount,
      },
      customer_details: {
        first_name: customerDetails.name,
        email: customerDetails.email,
        phone: customerDetails.phone,
      },
    };

    const transactionToken = await snap.createTransaction(parameters);

    return NextResponse.json({
      token: transactionToken.token,
      redirect_url: transactionToken.redirect_url,
    });
  } catch (error: any) {
    console.error("Checkout API Error:", error);
    // Kembalikan pesan yang jelas ke antarmuka klien
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
