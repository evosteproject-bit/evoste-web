import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/services/firebaseAdmin";
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

    // 1. Paksa ID Pesanan menjadi String
    const safeOrderId = String(orderId);

    const grossAmount = cart.reduce((acc: number, item: any) => {
      const price = Number(String(item.price).replace(/\./g, ""));
      return acc + price * (item.quantity || 1);
    }, 0);

    // 2. Transaksi Firestore via Admin SDK (bypass rules)
    //    Stock validation & decrement dilakukan secara atomic di server.
    const adminDb = getAdminDb();
    await adminDb.runTransaction(async (transaction) => {
      const productRefs = cart.map((item: any) =>
        adminDb.collection("products").doc(String(item.id)),
      );
      const productDocs = await Promise.all(
        productRefs.map((ref) => transaction.get(ref)),
      );

      // Validasi ketat
      productDocs.forEach((pDoc, index) => {
        if (!pDoc.exists) {
          throw new Error(
            `Produk "${cart[index].name}" sudah tidak tersedia atau telah dihapus dari katalog utama.`,
          );
        }
        const currentStock = pDoc.data()?.stock ?? 0;
        const requestedQty = cart[index].quantity || 1;

        if (currentStock < requestedQty) {
          throw new Error(
            `Stok tidak mencukupi untuk "${cart[index].name}". Sisa di gudang: ${currentStock} unit.`,
          );
        }
      });

      // Potong stok
      productDocs.forEach((pDoc, index) => {
        const currentStock = pDoc.data()?.stock ?? 0;
        const requestedQty = cart[index].quantity || 1;
        transaction.update(productRefs[index], {
          stock: currentStock - requestedQty,
        });
      });

      // Buat dokumen pesanan
      const orderRef = adminDb.collection("orders").doc(safeOrderId);
      transaction.set(orderRef, {
        orderId: safeOrderId,
        cart: cart,
        customerDetails: customerDetails,
        status: "pending",
        grossAmount: grossAmount,
        createdAt: FieldValue.serverTimestamp(),
      });
    });

    // 3. Permintaan Token Midtrans Snap
    const baseUrl =
      req.headers.get("origin") ||
      req.headers.get("referer")?.replace(/\/$/, "") ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      "http://localhost:3000";

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
      callbacks: {
        finish: `${baseUrl}/checkout/success?orderId=${safeOrderId}`,
        unfinish: `${baseUrl}/checkout/pending?orderId=${safeOrderId}`,
        error: `${baseUrl}/checkout/failed?orderId=${safeOrderId}`,
      },
    };

    const transactionToken = await snap.createTransaction(parameters);

    return NextResponse.json({
      token: transactionToken.token,
      redirect_url: transactionToken.redirect_url,
    });
  } catch (error: any) {
    console.error("Checkout API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}