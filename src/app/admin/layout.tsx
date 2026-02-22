"use client";

import AuthGuard from "@/components/admin/AuthGuard";
import { usePathname } from "next/navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Kecualikan halaman login dari proteksi agar tidak terjadi looping redirect
  const isLoginPage = pathname === "/admin/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-900 text-white">{children}</div>
    </AuthGuard>
  );
}
