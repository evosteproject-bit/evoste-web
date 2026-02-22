"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function FailedPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f172a] flex items-center justify-center p-6 transition-colors duration-300">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white dark:bg-slate-800 p-10 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-700 text-center"
      >
        <div className="w-20 h-20 bg-rose-100 dark:bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
          <svg
            className="w-10 h-10 text-rose-600 dark:text-rose-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>

        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-4 font-orbitron tracking-tight">
          PAYMENT FAILED
        </h1>

        <p className="text-gray-600 dark:text-gray-400 mb-10 leading-relaxed">
          Maaf, transaksi Anda tidak dapat diproses. Hal ini bisa terjadi karena
          saldo tidak mencukupi, kendala jaringan, atau pembatalan secara
          manual.
        </p>

        <div className="space-y-4">
          <Link
            href="/checkout"
            className="block w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold transition-all shadow-lg"
          >
            Coba Lagi
          </Link>

          <Link
            href="/"
            className="block w-full py-4 bg-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 font-semibold transition-all"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
