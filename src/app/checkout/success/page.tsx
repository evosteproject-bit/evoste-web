"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function SuccessPage() {
  useEffect(() => {
    // Memastikan keranjang belanja kosong setelah sukses
    localStorage.removeItem("cart");
    window.dispatchEvent(new Event("cartUpdated"));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f172a] flex items-center justify-center p-6 transition-colors duration-300">
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

        <p className="text-gray-600 dark:text-gray-400 mb-10 leading-relaxed">
          Transaksi Anda telah berhasil diverifikasi. Pesanan sedang diproses
          dan status akan diperbarui di dashboard secara otomatis.
        </p>

        <div className="space-y-4">
          <Link
            href="/"
            className="block w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/30"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
