import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f172a] flex items-center justify-center p-6 transition-colors duration-300">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 p-10 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-700 text-center">
        <p className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-400 dark:from-cyan-300 dark:to-blue-500 mb-2 font-orbitron">
          404
        </p>

        <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-4 font-orbitron tracking-tight">
          PAGE NOT FOUND
        </h1>

        <p className="text-gray-600 dark:text-gray-400 mb-10 leading-relaxed">
          Halaman yang Anda cari tidak dapat ditemukan. Mungkin telah dipindahkan
          atau tidak pernah ada.
        </p>

        <div className="space-y-3">
          <Link
            href="/"
            className="block w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/30 text-center"
          >
            Kembali ke Beranda
          </Link>
          <Link
            href="/#catalog"
            className="block w-full py-4 bg-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 font-semibold transition-all text-center"
          >
            Jelajahi Katalog
          </Link>
        </div>
      </div>
    </div>
  );
}
