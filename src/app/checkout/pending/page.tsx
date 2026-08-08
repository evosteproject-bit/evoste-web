"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

function PendingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Order ID + token dari URL Midtrans (callback 'unfinish' membawa orderId)
  // atau localStorage (di-set oleh /checkout saat membuat pesanan).
  const orderId =
    searchParams.get("orderId") ??
    (typeof window !== "undefined"
      ? localStorage.getItem("latest_order_id")
      : null);

  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const urlToken = searchParams.get("token");
    const storedToken = localStorage.getItem("latest_snap_token");
    setToken(urlToken || storedToken);
  }, [searchParams]);

  const handleResumePayment = () => {
    if (!token) return;
    setLoading(true);

    const snap = (window as any).snap;
    if (snap) {
      snap.pay(token, {
        onSuccess: () => {
          localStorage.removeItem("latest_snap_token");
          const orderIdQS =
            searchParams.get("orderId") ??
            localStorage.getItem("latest_order_id");
          router.push(
            orderIdQS
              ? `/checkout/success?orderId=${encodeURIComponent(orderIdQS)}`
              : "/checkout/success",
          );
        },
        onPending: () => setLoading(false),
        onError: () => router.push("/checkout/failed"),
        onClose: () => setLoading(false),
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-md w-full bg-white dark:bg-slate-800 p-10 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-700 text-center"
    >
      <div className="w-20 h-20 bg-amber-100 dark:bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg
          className="w-10 h-10 text-amber-600 dark:text-amber-400"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>

      <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-3 font-orbitron tracking-tight">
        PEMBAYARAN BELUM SELESAI
      </h1>

      <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
        Pesanan Anda sudah kami catat dengan status <strong>Belum Bayar</strong>.
        Silakan selesaikan pembayaran untuk melanjutkan proses pesanan.
      </p>

      {orderId && (
        <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl px-4 py-3 mb-6 border border-gray-100 dark:border-slate-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold mb-1">
            ORDER ID
          </p>
          <p className="text-sm font-bold text-gray-900 dark:text-white font-mono break-all">
            {orderId}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {token && (
          <button
            onClick={handleResumePayment}
            disabled={loading}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/30 disabled:opacity-70"
          >
            {loading
              ? "Menyiapkan Instruksi..."
              : "Lanjutkan Pembayaran Sekarang"}
          </button>
        )}

        {orderId && (
          <Link
            href={`/orders/${orderId}`}
            className="block w-full py-4 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-slate-600 rounded-xl font-bold transition-all text-center"
          >
            Lihat Detail Pesanan
          </Link>
        )}

        <Link
          href="/orders"
          className="block w-full py-3 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-cyan-400 font-semibold text-center transition-colors"
        >
          Lihat Semua Pesanan Saya
        </Link>
      </div>
    </motion.div>
  );
}

export default function PendingPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f172a] flex items-center justify-center p-6 transition-colors duration-300">
      <Suspense
        fallback={<div className="text-gray-400">Loading detail...</div>}
      >
        <PendingContent />
      </Suspense>
    </div>
  );
}
