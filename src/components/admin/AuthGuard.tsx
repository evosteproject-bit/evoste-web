"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/services/firebaseConfig";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // Jika tidak ada sesi, tendang ke login admin
        router.replace("/admin/login");
        return;
      }

      try {
        // Ambil dokumen pengguna dari Firestore untuk mengecek peran (role)
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();

          if (userData.role === "admin") {
            // Otorisasi berhasil, izinkan perenderan
            setLoading(false);
          } else {
            // Otorisasi gagal (pelanggan mencoba masuk admin), tendang ke beranda publik
            console.warn("Akses ditolak: Pengguna bukan administrator.");
            router.replace("/");
          }
        } else {
          // Dokumen tidak ditemukan, tendang demi keamanan
          router.replace("/");
        }
      } catch (error) {
        console.error("Gagal memverifikasi otorisasi:", error);
        router.replace("/");
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
