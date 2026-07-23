"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error caught:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f172a] flex items-center justify-center p-6 transition-colors duration-300">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 p-10 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-700 text-center">
        <div className="w-20 h-20 bg-rose-100 dark:bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
          <svg
            className="w-10 h-10 text-rose-600 dark:text-rose-400"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
        </div>

        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-4 font-orbitron tracking-tight">
          SOMETHING WENT WRONG
        </h1>

        <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
          Maaf, terjadi kesalahan tak terduga pada sistem. Tim kami telah
          menerima laporan dan sedang menanganinya.
        </p>

        {process.env.NODE_ENV === "development" && (
          <div className="mb-8 p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-xl text-left">
            <p className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider mb-1">
              Debug Info
            </p>
            <p className="text-xs text-rose-600 dark:text-rose-300 font-mono break-all">
              {error.message}
            </p>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={reset}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/30"
          >
            Coba Lagi
          </button>
          <Link
            href="/"
            className="block w-full py-4 bg-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 font-semibold transition-all"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
