"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const status = searchParams.get("transaction_status");
  const orderId =
    searchParams.get("orderId") ?? searchParams.get("order_id");
  const action = searchParams.get("action"); // Midtrans pakai "back" saat user menutup popup
  const [transactionStatus, setTransactionStatus] = useState(status);

  // Redirect cepat berdasarkan sinyal dari URL Midtrans (lebih reliable
  // daripada menunggu polling). Jalankan SEBELUM render apa pun.
  useEffect(() => {
    if (!orderId) return;

    const lowerStatus = (status ?? "").toLowerCase();

    // Midtrans kirim transaction_status=pending + action=back saat user
    // menutup popup/kembali tanpa membayar. Redirect ke /checkout/pending
    // yang punya tombol "Lanjutkan Pembayaran Sekarang".
    if (lowerStatus === "pending" || action === "back") {
      router.replace(
        `/checkout/pending?orderId=${encodeURIComponent(orderId)}`,
      );
      return;
    }

    // Status final negatif → /checkout/failed
    if (
      lowerStatus === "deny" ||
      lowerStatus === "cancel" ||
      lowerStatus === "expire" ||
      lowerStatus === "failure"
    ) {
      router.replace(
        `/checkout/failed?orderId=${encodeURIComponent(orderId)}`,
      );
      return;
    }
    // settlement/capture → lanjut polling untuk konfirmasi
    // (URL bisa lebih dulu dari webhook)
  }, [orderId, status, action, router]);

  // Polling: tanyakan status ke /api/check-status setiap 3 detik,
  // maksimal 10 percobaan. Berhenti lebih awal kalau status sudah
  // settlement/capture (bukan "pending"). Skip kalau URL sudah kasih
  // sinyal final (pending/failed) — sudah di-handle effect di atas.
  useEffect(() => {
    if (!orderId) {
      setTransactionStatus(null);
      return;
    }

    // Kalau URL sudah final (settlement/capture) atau sudah negatif
    // (deny/cancel/expire), polling tidak perlu.
    const lowerStatus = (status ?? "").toLowerCase();
    if (
      lowerStatus === "settlement" ||
      lowerStatus === "capture" ||
      lowerStatus === "deny" ||
      lowerStatus === "cancel" ||
      lowerStatus === "expire" ||
      lowerStatus === "failure"
    ) {
      setTransactionStatus(lowerStatus);
      return;
    }

    // URL tidak kasih sinyal (tidak ada transaction_status) → polling.
    // Tapi kalau action=back, effect di atas sudah redirect ke pending.
    setTransactionStatus(null);
    const controller = new AbortController();
    let attempts = 0;
    const MAX_ATTEMPTS = 10;
    const POLL_INTERVAL_MS = 3000;

    const poll = async () => {
      attempts += 1;
      try {
        const res = await fetch("/api/check-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
          signal: controller.signal,
        });
        const data = await res.json();
        if (data.status && data.status !== "pending") {
          setTransactionStatus(data.status);
          return;
        }
        if (attempts < MAX_ATTEMPTS) {
          setTimeout(poll, POLL_INTERVAL_MS);
        } else {
          // Habis percobaan dan masih pending → arahkan ke /checkout/pending
          // supaya user bisa coba lanjut bayar atau lihat detail pesanan.
          router.replace(
            `/checkout/pending?orderId=${encodeURIComponent(orderId)}`,
          );
        }
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          console.error("Gagal cek status:", err);
          if (attempts < MAX_ATTEMPTS) {
            setTimeout(poll, POLL_INTERVAL_MS);
          }
        }
      }
    };

    poll();
    return () => controller.abort();
  }, [orderId, status, router]);

  useEffect(() => {
    if (transactionStatus === null) return;
    if (transactionStatus === "pending") return;
    if (transactionStatus === "failed" || transactionStatus === "cancelled") {
      const qs = orderId ? `?orderId=${encodeURIComponent(orderId)}` : "";
      router.replace(`/checkout/failed${qs}`);
      return;
    }
    // "paid" / "settlement" / "refunded" / unknown → sukses, bersihkan cart
    localStorage.removeItem("cart");
    localStorage.removeItem("latest_snap_token");
    localStorage.removeItem("pending_order_redirect");
    window.dispatchEvent(new Event("cartUpdated"));
  }, [transactionStatus, orderId, router]);

  // Spinner saat verifikasi
  if (transactionStatus === null || transactionStatus === "pending") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-md w-full bg-white dark:bg-slate-800 p-10 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-700 text-center"
      >
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-700 dark:text-gray-200 font-bold mb-2">
          Memverifikasi Pembayaran...
        </p>
        {orderId && (
          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
            Order: {orderId}
          </p>
        )}
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
          Mohon tunggu, kami sedang mengonfirmasi status transaksi Anda ke
          payment gateway.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-md w-full bg-white dark:bg-slate-800 p-10 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-700 text-center"
    >
      <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
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

      <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-3 font-orbitron tracking-tight">
        PEMBAYARAN BERHASIL
      </h1>

      <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
        Transaksi Anda telah berhasil diverifikasi. Pesanan sedang diproses dan
        status akan diperbarui otomatis.
      </p>

      {orderId && (
        <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl px-4 py-3 mb-8 border border-gray-100 dark:border-slate-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold mb-1">
            ORDER ID
          </p>
          <p className="text-sm font-bold text-gray-900 dark:text-white font-mono break-all">
            {orderId}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {orderId && (
          <Link
            href={`/orders/${orderId}`}
            className="block w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/30 text-center"
          >
            Lihat Detail Pesanan
          </Link>
        )}
        <Link
          href="/orders"
          className="block w-full py-4 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-slate-600 rounded-xl font-bold transition-all text-center"
        >
          Lihat Semua Pesanan
        </Link>
        <Link
          href="/"
          className="block w-full py-3 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-cyan-400 font-medium text-center transition-colors"
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
