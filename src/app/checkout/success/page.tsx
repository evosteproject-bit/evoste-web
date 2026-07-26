"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Ambil status transaksi dari URL Midtrans
  const status = searchParams.get("transaction_status");
  const token = searchParams.get("token"); // Ambil token jika ada
  const orderId = searchParams.get("orderId") ?? searchParams.get("order_id");
  const [transactionStatus, setTransactionStatus] = useState(status);

  useEffect(() => {
    if (!orderId) {
      setTransactionStatus(null);
      return;
    }

    // Reset sebelum polling agar navigasi antar orderId tidak menampilkan
    // state stale dari order sebelumnya.
    setTransactionStatus(null);
    const controller = new AbortController();
    fetch("/api/check-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.status) {
          setTransactionStatus(data.status);
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Gagal cek status:", err);
        }
      });
    return () => controller.abort();
  }, [orderId]);

  useEffect(() => {
    // Polled value adalah source of truth. URL-driven redirect (yang lama)
    // bisa race dengan polling flip state ke "paid" dan bounce user kembali
    // ke /checkout/pending. Effect ini hanya memicu redirect gagal dari
    // hasil polling; transisi "pending" (spinner) dan success sudah di-handle
    // oleh render di bawah.
    if (transactionStatus === null) return; // masih verifying
    if (transactionStatus === "pending") {
      return; // spinner sudah ditampilkan oleh guard di bawah
    }
    if (transactionStatus === "failed" || transactionStatus === "cancelled") {
      const orderIdQS = orderId
        ? `?orderId=${encodeURIComponent(orderId)}`
        : "";
      router.replace(`/checkout/failed${orderIdQS}`);
      return;
    }
    // "paid" / "refunded" / unknown → render konten sukses & bersihkan cart
    localStorage.removeItem("cart");
    localStorage.removeItem("latest_snap_token");
    localStorage.removeItem("pending_order_redirect");
    window.dispatchEvent(new Event("cartUpdated"));
  }, [transactionStatus, orderId, router]);

  // Jika status pending, jangan tampilkan konten sukses (sedang loading redirect)
  if (transactionStatus === "pending") {
    return (
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-500 dark:text-gray-400 font-medium">
          Mengalihkan ke detail pembayaran...
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-md w-full bg-white dark:bg-slate-800 p-10 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-700 text-center"
    >
      <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
        <svg
          className="w-10 h-10 text-emerald-600 dark:text-emerald-400"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>

      <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-4 font-orbitron tracking-tight">
        PAYMENT SUCCESS
      </h1>

      <p className="text-gray-600 dark:text-gray-400 mb-10 leading-relaxed text-center">
        Transaksi Anda telah berhasil diverifikasi. Pesanan sedang diproses dan
        status akan diperbarui di dashboard secara otomatis.
      </p>

      <div className="space-y-4">
        <Link
          href="/"
          className="block w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/30 text-center"
        >
          Kembali ke Beranda
        </Link>
      </div>
    </motion.div>
  );
}

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f172a] flex items-center justify-center p-6 transition-colors duration-300">
      <Suspense
        fallback={
          <div className="animate-pulse text-gray-400">Memproses status...</div>
        }
      >
        <SuccessContent />
      </Suspense>
    </div>
  );
}
