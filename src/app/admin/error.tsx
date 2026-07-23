"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin error caught:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-md w-full bg-gray-800 p-8 rounded-2xl border border-gray-700 shadow-xl text-center">
        <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-8 h-8 text-rose-400"
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

        <h2 className="text-xl font-black text-white mb-2 font-orbitron tracking-wide">
          GAGAL MEMUAT DATA
        </h2>

        <p className="text-gray-400 text-sm mb-6">
          Terjadi kesalahan saat memuat halaman admin. Silakan coba lagi atau
          kembali ke dashboard.
        </p>

        {process.env.NODE_ENV === "development" && (
          <p className="text-xs text-rose-300 font-mono mb-6 break-all bg-rose-500/10 p-3 rounded-lg border border-rose-500/30">
            {error.message}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <button
            onClick={reset}
            className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-bold transition-all"
          >
            Coba Lagi
          </button>
          <Link
            href="/admin/dashboard"
            className="w-full py-3 bg-transparent border border-gray-600 text-gray-300 hover:bg-gray-700 rounded-lg font-semibold transition-all"
          >
            Kembali ke Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
