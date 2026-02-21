"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes"; // Sesuaikan dengan provider tema Anda
import { Product } from "@/lib/data";

// Tambahkan interface untuk mendefinisikan item di keranjang yang memiliki quantity
export interface CartItem extends Product {
  quantity?: number;
}

interface HeaderProps {
  showCartNotification?: boolean;
}

export default function Header({ showCartNotification }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Mengambil state tema, sesuaikan jika Anda memakai custom context
  const { theme, setTheme } = useTheme();
  const isDarkMode = theme === "dark";
  const toggleTheme = () => setTheme(isDarkMode ? "light" : "dark");

  useEffect(() => {
    const loadCart = () => {
      const stored = localStorage.getItem("cart");
      if (stored) {
        setCartItems(JSON.parse(stored));
      }
    };
    loadCart();

    window.addEventListener("cartUpdated", loadCart);
    return () => window.removeEventListener("cartUpdated", loadCart);
  }, []);

  const handleRemoveItem = (id: number) => {
    const updated = cartItems.filter((item) => item.id !== id);
    setCartItems(updated);
    localStorage.setItem("cart", JSON.stringify(updated));
    window.dispatchEvent(new Event("cartUpdated"));
  };

  // ✅ KODE BARU: Perhitungan Total yang Mengalikan dengan Quantity
  const getTotal = () => {
    return cartItems.reduce((acc, item) => {
      const cleanPrice = Number(String(item.price).replace(/\./g, ""));
      const qty = item.quantity || 1; // Default 1 jika tidak ada quantity (data lama)
      return acc + cleanPrice * qty;
    }, 0);
  };

  // ✅ KODE BARU: Menghitung total jumlah barang untuk indikator angka di ikon cart
  const getCartCount = () => {
    return cartItems.reduce((acc, item) => acc + (item.quantity || 1), 0);
  };

  // Fungsi Format Rupiah
  const formatIDR = (amount: number) => {
    return new Intl.NumberFormat("id-ID").format(amount);
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;
    try {
      const payload = {
        cart: cartItems,
        orderId: `order-${Date.now()}`,
      };

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      // Jika API mengembalikan error (bukan ok)
      if (!res.ok) {
        console.error("API Error:", data);
        alert(`Gagal membuat transaksi: ${data.error || "Server Error"}`);
        return;
      }

      const token = data.token;
      const redirectUrl = data.redirect_url;

      if (!token && !redirectUrl) {
        alert("Gagal mendapatkan akses pembayaran dari Midtrans.");
        return;
      }

      // 1. Coba munculkan Popup Snap Midtrans
      if (typeof window !== "undefined" && (window as any).snap) {
        try {
          (window as any).snap.pay(token, {
            onSuccess: function () {
              localStorage.removeItem("cart");
              setCartItems([]);
              window.dispatchEvent(new Event("cartUpdated"));
              setIsCartOpen(false);
            },
            onPending: function () {
              alert("Menunggu pembayaran! Silakan cek status pesanan Anda.");
              setIsCartOpen(false);
            },
            onError: function () {
              alert("Pembayaran gagal!");
            },
            onClose: function () {
              console.log("Popup Midtrans ditutup");
            },
          });
        } catch (snapError) {
          console.error("Snap Error:", snapError);
          // Jika Snap error, gunakan Fallback Redirect
          if (redirectUrl) window.location.href = redirectUrl;
        }
      }
      // 2. FALLBACK: Jika script snap gagal dimuat, langsung arahkan ke halaman Midtrans
      else if (redirectUrl) {
        console.warn(
          "Snap.js tidak ditemukan, mengalihkan ke halaman Midtrans...",
        );
        window.location.href = redirectUrl;
      } else {
        alert("Sistem pembayaran sedang tidak dapat diakses.");
      }
    } catch (error) {
      console.error("Checkout Request Error:", error);
      alert("Terjadi kesalahan koneksi saat melakukan checkout.");
    }
  };

  return (
    <header className="fixed w-full top-0 z-50 transition-all duration-300 bg-white/90 dark:bg-[#0f172a]/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
      <div className="container mx-auto px-6 max-w-7xl h-20 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="text-2xl font-black tracking-widest text-blue-600 dark:text-cyan-300 font-orbitron"
        >
          E-VOSTE
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex gap-8 text-sm font-medium text-gray-700 dark:text-gray-300">
          {["Shop", "About", "History", "Philosophy"].map((item) => (
            <Link
              key={item}
              href={`#${item.toLowerCase()}`}
              className="hover:text-blue-600 dark:hover:text-cyan-400 transition-colors"
            >
              {item}
            </Link>
          ))}
        </nav>

        {/* Actions (Cart & Theme) */}
        <div className="flex items-center gap-6 relative">
          {/* Cart Button */}
          <button
            className="relative p-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-cyan-400 transition-colors cart-icon"
            onClick={() => setIsCartOpen(!isCartOpen)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
              />
            </svg>

            {/* Cart Counter Badge */}
            {(cartItems.length > 0 || showCartNotification) && (
              <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full animate-bounce">
                {getCartCount()}
              </span>
            )}
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
          >
            {isDarkMode ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
                />
              </svg>
            )}
          </button>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6 dark:text-white"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Nav Dropdown */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-gray-800 overflow-hidden"
          >
            <div className="flex flex-col p-6 gap-4 text-center font-medium dark:text-gray-300">
              {["Shop", "About", "History", "Philosophy"].map((item) => (
                <Link
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  onClick={() => setIsMenuOpen(false)}
                  className="hover:text-blue-600 dark:hover:text-cyan-400"
                >
                  {item}
                </Link>
              ))}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      {/* Cart Dropdown Modal */}
      <AnimatePresence>
        {isCartOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-20 right-6 w-80 md:w-96 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden z-50"
          >
            <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
              <h3 className="font-bold text-gray-900 dark:text-white">
                Your Cart
              </h3>
              <button
                onClick={() => setIsCartOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto p-5 space-y-4">
              {cartItems.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                  Your cart is empty.
                </p>
              ) : (
                cartItems.map((item) => {
                  const qty = item.quantity || 1;
                  const itemPrice = Number(
                    String(item.price).replace(/\./g, ""),
                  );
                  const subTotal = itemPrice * qty;

                  return (
                    <div
                      key={item.id}
                      className="flex gap-4 items-center bg-gray-50 dark:bg-slate-700/50 p-3 rounded-xl border border-gray-100 dark:border-slate-700"
                    >
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-white dark:bg-slate-800">
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          className="object-contain p-1"
                        />
                      </div>
                      <div className="flex-1">
                        {/* ✅ KODE BARU: Menampilkan Kuantitas (misal: "2x Citrine Flame") */}
                        <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                          {qty}x {item.name}
                        </h4>
                        {/* ✅ Menampilkan Total Harga per Baris Item */}
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-0.5">
                          Rp {formatIDR(subTotal)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-xs font-semibold text-red-500 hover:text-red-700 px-2 py-1 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 transition"
                      >
                        Remove
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {cartItems.length > 0 && (
              <div className="p-5 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/80">
                <div className="flex justify-between items-center mb-5">
                  <span className="font-semibold text-gray-600 dark:text-gray-300">
                    Total:
                  </span>
                  <span className="font-black text-xl text-gray-900 dark:text-white">
                    Rp {formatIDR(getTotal())}
                  </span>
                </div>
                <button
                  onClick={handleCheckout}
                  className="w-full py-3.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl font-bold transition-colors shadow-lg shadow-cyan-500/30"
                >
                  Checkout
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
