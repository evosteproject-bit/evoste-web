"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/services/firebaseConfig";

export default function CheckoutPage() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFetchingUser, setIsFetchingUser] = useState(true);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  useEffect(() => {
    // 1. Validasi Autentikasi dan Ambil Data Profil
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/register");
        return;
      }

      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setFormData({
            name: userData.name || "",
            email: userData.email || user.email || "",
            phone: userData.phone || "",
            address: userData.address || "",
          });
        }
      } catch (error) {
        console.error("Gagal memuat profil pengguna:", error);
      } finally {
        setIsFetchingUser(false);
      }
    });

    // 2. Muat Data Keranjang
    const stored = localStorage.getItem("cart");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.length === 0) {
        router.push("/");
      } else {
        setCartItems(parsed);
      }
    } else {
      router.push("/");
    }

    // Catatan: snap.js sudah di-load global di layout.tsx via <Script strategy="beforeInteractive">,
    // sehingga tidak perlu injeksi ulang di sini. Default flow adalah redirect_url
    // (lihat handleSubmit) yang TIDAK memerlukan snap.js — fallback snap.pay() tetap
    // bisa dipakai jika redirect_url tidak tersedia di response Midtrans.

    return () => {
      unsubscribeAuth();
    };
  }, [router]);

  const getTotal = () => {
    return cartItems.reduce((acc, item) => {
      const cleanPrice = Number(String(item.price).replace(/\./g, ""));
      return acc + cleanPrice * (item.quantity || 1);
    }, 0);
  };

  const formatIDR = (amount: number) => {
    return new Intl.NumberFormat("id-ID").format(amount);
  };

  // Hanya memproses perubahan pada input yang tidak di-disable (address)
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      const orderId = `EVO-${Date.now()}`;
      const payload = {
        cart: cartItems,
        orderId,
        customerDetails: formData,
      };

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal membuat sesi transaksi");
      }

      if (data.token) {
        localStorage.setItem("latest_snap_token", data.token);
      }

      // Persist orderId so success/pending pages can read it post-popup
      if (orderId) {
        localStorage.setItem("latest_order_id", orderId);
      }

      // Prioritaskan redirect_url (menghindari CSP error dari popup Midtrans)
      // Popup Midtrans (snap.pay) memiliki CSP ketat yang memblokir inline script-nya sendiri
      // di environment tertentu. Redirect flow lebih stabil.
      if (data.redirect_url) {
        // Simpan cart reference agar bisa di-clear di halaman success
        localStorage.setItem("pending_order_redirect", "1");
        window.location.href = data.redirect_url;
        return;
      }

      // Fallback ke snap.pay popup jika redirect_url tidak tersedia
      const snap = (window as any).snap;
      if (snap && data.token) {
        snap.pay(data.token, {
          onSuccess: function () {
            const orderIdLS = localStorage.getItem("latest_order_id");
            router.push(
              orderIdLS
                ? `/checkout/success?orderId=${encodeURIComponent(orderIdLS)}`
                : "/checkout/success",
            );
          },
          onPending: function () {
            const baseUrl = window.location.origin;
            const orderIdLS = localStorage.getItem("latest_order_id");
            const qs = orderIdLS
              ? `?orderId=${encodeURIComponent(orderIdLS)}&token=${data.token}`
              : `?token=${data.token}`;
            router.push(`${baseUrl}/checkout/pending${qs}`);
          },
          onError: function () {
            router.push("/checkout/failed");
          },
          onClose: function () {
            // User menutup popup Midtrans tanpa menyelesaikan pembayaran.
            // Pesanan sudah dibuat di Firestore (status: pending). Arahkan
            // user ke /checkout/pending supaya mereka bisa lanjut bayar atau
            // lihat detail pesanan — konsisten dengan flow redirect_url yang
            // juga mengirim user ke sini via callback 'unfinish'.
            const baseUrl = window.location.origin;
            const orderIdLS = localStorage.getItem("latest_order_id");
            const qs = orderIdLS
              ? `?orderId=${encodeURIComponent(orderIdLS)}&token=${data.token}`
              : `?token=${data.token}`;
            router.push(`${baseUrl}/checkout/pending${qs}`);
          },
        });
      } else {
        throw new Error("Sistem pembayaran tidak merespons. Coba lagi nanti.");
      }
    } catch (error: any) {
      alert(error.message || "Terjadi kesalahan sistem.");
      setLoading(false);
    }
  };

  // Mencegah rendering form yang berkedip sebelum data profil tiba
  if (cartItems.length === 0 || isFetchingUser) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0f172a] flex items-center justify-center pt-28 pb-12">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f172a] pt-28 pb-12 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-6">
            Informasi Pengiriman
          </h1>
          <form
            onSubmit={handleSubmit}
            className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 space-y-6"
          >
            {/* Input Terkunci (Read-Only) */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Nama Lengkap
              </label>
              <input
                required
                disabled
                readOnly
                type="text"
                name="name"
                value={formData.name}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 cursor-not-allowed outline-none transition-all"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Email
                </label>
                <input
                  required
                  disabled
                  readOnly
                  type="email"
                  name="email"
                  value={formData.email}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 cursor-not-allowed outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Nomor Telepon
                </label>
                <input
                  required
                  disabled
                  readOnly
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 cursor-not-allowed outline-none transition-all"
                />
              </div>
            </div>

            {/* Input Terbuka (Dapat Diedit) */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Alamat Pengiriman (Dapat diubah)
              </label>
              <textarea
                required
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                placeholder="Tentukan detail alamat pengiriman untuk pesanan ini..."
              />
              <p className="text-xs text-gray-500 mt-2">
                *Perubahan alamat di sini hanya berlaku untuk pesanan ini dan
                tidak mengubah alamat profil utama Anda.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-blue-500/30 disabled:opacity-70"
            >
              {loading
                ? "Menghubungkan ke Midtrans..."
                : "Lanjutkan ke Pembayaran"}
            </button>
          </form>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:pl-8"
        >
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Ringkasan Pesanan
          </h2>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
            <div className="p-6 space-y-4 max-h-[500px] overflow-y-auto">
              {cartItems.map((item) => (
                <div key={item.id} className="flex gap-4 items-center">
                  <div className="relative w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-lg overflow-hidden shrink-0">
                    <img
                      src={item.image || "/logo.jpeg"}
                      alt={item.name}
                      className="object-contain w-full h-full absolute inset-0 p-2"
                      onError={(e) => {
                        e.currentTarget.src = "/logo.jpeg";
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {item.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Qty: {item.quantity || 1}
                    </p>
                  </div>
                  <div className="font-bold text-gray-900 dark:text-white">
                    Rp{" "}
                    {formatIDR(
                      Number(String(item.price).replace(/\./g, "")) *
                        (item.quantity || 1),
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-6 bg-gray-50 dark:bg-slate-900/50 border-t border-gray-200 dark:border-slate-700">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-600 dark:text-gray-300">
                  Total Tagihan
                </span>
                <span className="text-2xl font-black text-blue-600 dark:text-cyan-400">
                  Rp {formatIDR(getTotal())}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
