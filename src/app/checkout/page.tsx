"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";

export default function CheckoutPage() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  useEffect(() => {
    // 1. Muat data keranjang
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

    // 2. Injeksi Script Midtrans Snap secara dinamis
    // Menggunakan Production URL jika Client Key tidak diawali SB-
    const isSandbox =
      process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY?.startsWith("Mid-client-");
    const scriptUrl = isSandbox
      ? "https://app.sandbox.midtrans.com/snap/snap.js"
      : "https://app.midtrans.com/snap/snap.js";

    const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "";

    const existingScript = document.getElementById("midtrans-snap");
    if (!existingScript) {
      const scriptTag = document.createElement("script");
      scriptTag.src = scriptUrl;
      scriptTag.id = "midtrans-snap";
      scriptTag.setAttribute("data-client-key", clientKey);
      document.body.appendChild(scriptTag);
    }
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
      const payload = {
        cart: cartItems,
        orderId: `order-${Date.now()}`,
        customerDetails: formData,
      };

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // ✅ SIMPAN TOKEN KE LOCALSTORAGE
      if (data.token) {
        localStorage.setItem("latest_snap_token", data.token);
      }

      const snap = (window as any).snap;
      if (snap && data.token) {
        snap.pay(data.token, {
          onSuccess: function (result: any) {
            localStorage.removeItem("cart");
            window.dispatchEvent(new Event("cartUpdated"));
            router.push("/checkout/success");
          },
          onPending: function (result: any) {
            localStorage.removeItem("cart");
            window.dispatchEvent(new Event("cartUpdated"));
            const baseUrl = window.location.origin;
            router.push(`${baseUrl}/checkout/pending?token=${data.token}`);
          },
          onError: function (result: any) {
            setLoading(false);
            router.push("/checkout/failed");
          },
          onClose: function () {
            // Pengguna menutup popup tanpa memilih metode apa pun
            setLoading(false);
            console.log("User closed the popup without action.");
          },
        });
      } else if (data.redirect_url) {
        window.location.href = data.redirect_url;
      }
    } catch (error: any) {
      alert(error.message || "Terjadi kesalahan sistem.");
      setLoading(false);
    }
  };

  if (cartItems.length === 0) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f172a] pt-28 pb-12 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Kolom Form Data Diri */}
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
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Nama Lengkap
              </label>
              <input
                required
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-gray-400"
                placeholder="John Doe"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-gray-400"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Nomor Telepon
                </label>
                <input
                  required
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-gray-400"
                  placeholder="08123456789"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Alamat Lengkap
              </label>
              <textarea
                required
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none placeholder-gray-400"
                placeholder="Jl. Contoh Raya No. 123..."
              />
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

        {/* Kolom Ringkasan Pesanan */}
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
                  <div className="relative w-20 h-20 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 overflow-hidden shrink-0">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-contain p-2"
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
