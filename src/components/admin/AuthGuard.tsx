"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/services/firebaseConfig";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Memantau status sesi secara real-time dari Firebase
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        // Jika tidak ada sesi aktif, lempar pengguna ke halaman login
        router.push("/admin/login");
      } else {
        // Izinkan perenderan jika user terverifikasi
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-cyan-500 font-bold tracking-widest text-sm font-orbitron">
            VERIFYING AUTHORIZATION...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
