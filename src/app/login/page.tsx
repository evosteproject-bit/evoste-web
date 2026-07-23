"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/services/firebaseConfig";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        formData.email,
        formData.password,
      );

      // Cek role user di Firestore untuk menentukan redirect
      const userDocRef = doc(db, "users", userCredential.user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists() && userDocSnap.data().role === "admin") {
        // Admin → ke dashboard
        router.push("/admin/dashboard");
      } else {
        // Customer → ke beranda
        router.push("/");
      }
    } catch (err: any) {
      setError("Email atau password tidak valid.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f172a] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-lg border border-gray-100 dark:border-slate-700">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2 font-orbitron text-center">
          LOGIN PELANGGAN
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-center mb-8 text-sm">
          Masuk untuk mengakses keranjang dan pesanan Anda.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-rose-100 text-rose-600 rounded-lg text-sm text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Email
            </label>
            <input
              required
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="john@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Password
            </label>
            <input
              required
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-cyan-500/30 disabled:opacity-70 mt-4"
          >
            {loading ? "Memverifikasi..." : "Masuk"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Belum memiliki akun?{" "}
          <Link
            href="/register"
            className="text-cyan-500 dark:text-cyan-400 font-bold hover:underline"
          >
            Daftar sekarang
          </Link>
        </p>

        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-slate-700">
          <Link
            href="/admin/login"
            className="group flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-cyan-400 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
            Masuk sebagai Administrator
            <span className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
              →
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
