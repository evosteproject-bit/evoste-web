"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

function PendingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Mencari token dari URL atau LocalStorage
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Ambil token dari URL jika ada
    const urlToken = searchParams.get("token");
    // Ambil token dari storage sebagai cadangan
    const storedToken = localStorage.getItem("latest_snap_token");

    setToken(urlToken || storedToken);

    const isSandbox =
      process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY?.startsWith("SB-");
    const scriptUrl = isSandbox
      ? "https://app.sandbox.midtrans.com/snap/snap.js"
      : "https://app.midtrans.com/snap/snap.js";

    const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "";

    const scriptTag = document.createElement("script");
    scriptTag.src = scriptUrl;
    scriptTag.setAttribute("data-client-key", clientKey);
    document.body.appendChild(scriptTag);

    return () => {
      const existingScript = document.body.querySelector(
        `script[src="${scriptUrl}"]`,
      );
      if (existingScript) document.body.removeChild(existingScript);
    };
  }, [searchParams]);

  const handleResumePayment = () => {
    if (!token) return;
    setLoading(true);

    const snap = (window as any).snap;
    if (snap) {
      snap.pay(token, {
        onSuccess: () => {
          localStorage.removeItem("latest_snap_token"); // Bersihkan setelah sukses
          router.push("/checkout/success");
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
      <div className="w-20 h-20 bg-amber-100 dark:bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
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

      <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-4 font-orbitron tracking-tight text-center">
        PAYMENT PENDING
      </h1>

      <p className="text-gray-600 dark:text-gray-400 mb-10 leading-relaxed text-center">
        Instruksi pembayaran telah dikirim. Jika Anda tidak sengaja menutup
        jendela pembayaran, silakan klik tombol di bawah.
      </p>

      <div className="space-y-4">
        {/* Tombol akan muncul karena token sekarang berhasil diambil dari localStorage */}
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

        <Link
          href="/"
          className="block w-full py-4 bg-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 font-semibold transition-all text-center"
        >
          Kembali ke Beranda
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
