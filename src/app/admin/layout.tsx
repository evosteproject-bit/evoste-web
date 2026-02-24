"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/admin/AuthGuard";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/services/firebaseConfig";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // Tambahkan state untuk menangkap email admin
  const [adminEmail, setAdminEmail] = useState<string>("");

  const isLoginPage = pathname === "/admin/login";

  // Pantau sesi pengguna untuk mengambil email
  useEffect(() => {
    if (isLoginPage) return;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.email) {
        setAdminEmail(user.email);
      }
    });

    return () => unsubscribe();
  }, [isLoginPage]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/admin/login");
  };

  if (isLoginPage) {
    return <>{children}</>;
  }

  const navItems = [
    {
      label: "Dashboard",
      path: "/admin/dashboard",
      icon: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
    },
    {
      label: "Kelola Produk",
      path: "/admin/products",
      icon: "M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.11 0 2-.89 2-2V5c0-1.11-.89-2-2-2zm0 5h-2V5h2v3zM4 19h16v2H4z",
    },
    {
      label: "Kelola Pesanan",
      path: "/admin/orders",
      icon: "M16 11h5l-9 10v-7H7l9-10v7z",
    },
    {
      label: "Kelola Pengguna",
      path: "/admin/users",
      icon: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",
    },
    {
      label: "Profil Admin",
      path: "/admin/profile",
      icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z",
    },
  ];

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-900 text-white flex">
        {/* Bilah Sisi (Sidebar) */}
        <aside className="w-64 bg-gray-800 border-r border-gray-700 hidden md:flex flex-col">
          <div className="h-20 flex items-center px-6 border-b border-gray-700">
            <h1 className="text-xl font-black tracking-widest text-cyan-400 font-orbitron">
              E-VOSTE ADMIN
            </h1>
          </div>
          <nav className="flex-1 py-6 px-4 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                  pathname === item.path
                    ? "bg-cyan-500/10 text-cyan-400"
                    : "text-gray-400 hover:bg-gray-700 hover:text-white"
                }`}
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d={item.icon} />
                </svg>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="p-4 border-t border-gray-700">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg transition-colors font-bold"
            >
              Logout
            </button>
          </div>
        </aside>

        {/* Konten Utama */}
        <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
          {/* Header Mobile & Top Bar */}
          <header className="bg-gray-900 border-b border-slate-200 sticky top-0 z-30 shadow-lg">
            <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-900 text-white rounded-lg flex items-center justify-center font-bold text-xl tracking-tighter">
                  EV
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-white">
                    EVOSTE Portal
                  </h1>
                  <p className="text-sm text-slate-500 font-medium">
                    {/* Menggunakan state adminEmail untuk merender email */}
                    Sesi Aktif: {adminEmail || "Memuat..."}
                  </p>
                </div>
              </div>
            </div>
          </header>

          {/* Area Render Halaman */}
          <div className="p-6 md:p-8 flex-1 overflow-y-auto">{children}</div>
        </main>
      </div>
    </AuthGuard>
  );
}
