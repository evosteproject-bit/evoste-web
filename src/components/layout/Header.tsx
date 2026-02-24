"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { onAuthStateChanged, User, signOut } from "firebase/auth";
import { auth } from "@/services/firebaseConfig";

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  description: string;
  image: string;
}

export interface CartItem extends Product {
  quantity?: number;
}

interface HeaderProps {
  showCartNotification?: boolean;
}

export default function Header({ showCartNotification }: HeaderProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // State Navigasi Dropdown
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const { theme, setTheme } = useTheme();
  const isDarkMode = theme === "dark";

  // Referensi Elemen untuk Click-Outside Detection
  const cartRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setMounted(true);
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribeAuth();
  }, []);

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

  // Logika Deteksi Klik di Luar Area
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      // Evaluasi penutupan Profil
      if (
        isProfileOpen &&
        profileRef.current &&
        !profileRef.current.contains(target)
      ) {
        setIsProfileOpen(false);
      }

      // Evaluasi penutupan Keranjang (Mengecualikan tombol toggle agar tidak tumpang tindih)
      if (isCartOpen && cartRef.current && !cartRef.current.contains(target)) {
        const toggleBtn = document.getElementById("cart-toggle-btn");
        if (toggleBtn && !toggleBtn.contains(target)) {
          setIsCartOpen(false);
        }
      }

      // Evaluasi penutupan Menu Mobile
      if (
        isMenuOpen &&
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(target)
      ) {
        const mobileBtn = document.getElementById("mobile-menu-btn");
        if (mobileBtn && !mobileBtn.contains(target)) {
          setIsMenuOpen(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isCartOpen, isProfileOpen, isMenuOpen]);

  // Logika Eksklusivitas State (Saling Menutup)
  const toggleCart = () => {
    setIsCartOpen(!isCartOpen);
    setIsProfileOpen(false);
    setIsMenuOpen(false);
  };

  const toggleProfile = () => {
    setIsProfileOpen(!isProfileOpen);
    setIsCartOpen(false);
    setIsMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    setIsCartOpen(false);
    setIsProfileOpen(false);
  };

  const handleRemoveItem = (id: string | number) => {
    const updated = cartItems.filter((item) => item.id !== id);
    setCartItems(updated);
    localStorage.setItem("cart", JSON.stringify(updated));
    window.dispatchEvent(new Event("cartUpdated"));
  };

  const handleUpdateQuantity = (id: string | number, delta: number) => {
    const updatedCart = cartItems.map((item) => {
      if (item.id === id) {
        const currentQty = item.quantity || 1;
        const newQty = currentQty + delta;

        if (newQty < 1) return item;

        if (newQty > item.stock) {
          alert(
            `Maksimal pembelian untuk ${item.name} adalah ${item.stock} unit sesuai sisa stok.`,
          );
          return item;
        }

        return { ...item, quantity: newQty };
      }
      return item;
    });

    setCartItems(updatedCart);
    localStorage.setItem("cart", JSON.stringify(updatedCart));
    window.dispatchEvent(new Event("cartUpdated"));
  };

  const getTotal = () => {
    return cartItems.reduce((acc, item) => {
      if ((item.stock || 0) <= 0) return acc;
      const cleanPrice = Number(String(item.price).replace(/\./g, ""));
      return acc + cleanPrice * (item.quantity || 1);
    }, 0);
  };

  const getCartCount = () => {
    return cartItems.reduce((acc, item) => acc + (item.quantity || 1), 0);
  };

  const formatIDR = (amount: number) => {
    return new Intl.NumberFormat("id-ID").format(amount);
  };

  const handleCheckoutRedirect = () => {
    setIsCartOpen(false);
    if (currentUser) {
      router.push("/checkout");
    } else {
      router.push("/login");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsProfileOpen(false);
      setIsMenuOpen(false);
      router.push("/login");
    } catch (error) {
      console.error("Gagal melakukan logout:", error);
    }
  };

  const hasOutOfStockItems = cartItems.some((item) => (item.stock || 0) <= 0);

  return (
    <header className="fixed w-full top-0 z-50 transition-all duration-300 bg-white/90 dark:bg-[#0f172a]/90 backdrop-blur-md border-b border-gray-200 dark:border-cyan-500/50">
      <div className="container mx-auto px-6 max-w-7xl h-20 flex items-center justify-between">
        <Link
          href="/"
          onClick={() => {
            setIsCartOpen(false);
            setIsProfileOpen(false);
            setIsMenuOpen(false);
          }}
          className="text-2xl font-black tracking-widest text-blue-600 dark:text-cyan-300 font-orbitron"
        >
          EVOSTE
        </Link>

        <nav className="hidden md:flex gap-8 text-sm font-medium text-gray-700 dark:text-gray-300">
          {["Catalog", "About", "History", "Philosophy"].map((item) => (
            <Link
              key={item}
              href={`/#${item.toLowerCase()}`}
              className="hover:text-blue-600 dark:hover:text-cyan-400 transition-colors"
            >
              {item}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-6 relative">
          <button
            id="cart-toggle-btn"
            className="relative p-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-cyan-400 transition-colors"
            onClick={toggleCart}
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
            {(cartItems.length > 0 || showCartNotification) && (
              <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full animate-bounce">
                {getCartCount()}
              </span>
            )}
          </button>

          <button
            onClick={() => setTheme(isDarkMode ? "light" : "dark")}
            className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
          >
            {!mounted ? (
              <div className="w-5 h-5" />
            ) : isDarkMode ? (
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

          <div className="hidden md:block relative" ref={profileRef}>
            {currentUser ? (
              <div>
                <button
                  onClick={toggleProfile}
                  className="w-9 h-9 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded-full flex items-center justify-center font-bold text-sm uppercase transition-colors focus:ring-2 focus:ring-blue-500"
                >
                  {currentUser.email?.charAt(0)}
                </button>

                <AnimatePresence>
                  {isProfileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-3 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-100 dark:border-slate-700 overflow-hidden z-50"
                    >
                      <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                          Masuk sebagai
                        </p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                          {currentUser.email}
                        </p>
                      </div>
                      <div className="py-2">
                        <Link
                          href="/profile"
                          onClick={() => setIsProfileOpen(false)}
                          className="block px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                        >
                          Profil Saya
                        </Link>
                        <Link
                          href="/orders"
                          onClick={() => setIsProfileOpen(false)}
                          className="block px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                        >
                          Pesanan Saya
                        </Link>
                      </div>
                      <div className="border-t border-gray-100 dark:border-slate-700 py-1.5">
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-2.5 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors font-bold"
                        >
                          Logout
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                href="/login"
                className="text-sm font-semibold text-blue-600 dark:text-cyan-400 hover:underline"
              >
                Login
              </Link>
            )}
          </div>

          <button
            id="mobile-menu-btn"
            className="md:hidden p-2 dark:text-white"
            onClick={toggleMobileMenu}
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
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            </svg>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.nav
            ref={mobileMenuRef}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-gray-800 overflow-hidden"
          >
            <div className="flex flex-col p-6 gap-4 text-center font-medium dark:text-gray-300">
              {["Catalog", "About", "History", "Philosophy"].map((item) => (
                <Link
                  key={item}
                  href={`/#${item.toLowerCase()}`}
                  onClick={() => setIsMenuOpen(false)}
                  className="hover:text-blue-600 dark:hover:text-cyan-400"
                >
                  {item}
                </Link>
              ))}

              {currentUser ? (
                <div className="flex flex-col gap-4 border-t border-gray-200 dark:border-gray-700 pt-5 mt-2">
                  <p className="text-xs text-gray-500">
                    Masuk sebagai{" "}
                    <span className="font-bold text-gray-900 dark:text-white">
                      {currentUser.email}
                    </span>
                  </p>
                  <Link
                    href="/profile"
                    onClick={() => setIsMenuOpen(false)}
                    className="font-semibold hover:text-blue-600"
                  >
                    Profil Saya
                  </Link>
                  <Link
                    href="/orders"
                    onClick={() => setIsMenuOpen(false)}
                    className="font-semibold hover:text-blue-600"
                  >
                    Pesanan Saya
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="font-bold text-rose-500 hover:text-rose-600"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setIsMenuOpen(false)}
                  className="text-blue-600 dark:text-cyan-400 font-bold border-t border-gray-200 dark:border-gray-700 pt-5 mt-2"
                >
                  Login / Register
                </Link>
              )}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCartOpen && (
          <motion.div
            ref={cartRef}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-20 right-6 w-[340px] md:w-96 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden z-50"
          >
            <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
              <h3 className="font-bold text-gray-900 dark:text-white">
                Keranjang Belanja
              </h3>
              <button
                onClick={() => setIsCartOpen(false)}
                className="text-gray-400 hover:text-gray-600"
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
                  Keranjang Anda masih kosong.
                </p>
              ) : (
                cartItems.map((item) => {
                  const currentQty = item.quantity || 1;
                  const maxStock = item.stock || 0;
                  const isOutOfStock = maxStock <= 0;

                  return (
                    <div
                      key={item.id}
                      className={`flex gap-4 items-start p-3 rounded-xl border ${isOutOfStock ? "bg-rose-50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-800/50" : "bg-gray-50 dark:bg-slate-700/50 border-gray-100 dark:border-slate-700"}`}
                    >
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-600">
                        <img
                          src={item.image || "/logo.jpeg"}
                          alt={item.name}
                          className={`object-contain w-full h-full absolute inset-0 p-1 transition-all ${isOutOfStock ? "grayscale opacity-40" : ""}`}
                          onError={(e) => {
                            e.currentTarget.src = "/logo.jpeg";
                          }}
                        />
                        {isOutOfStock && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[1px]">
                            <span className="text-[9px] font-black text-white bg-rose-600 px-1.5 py-0.5 rounded uppercase tracking-widest transform -rotate-12 shadow-sm">
                              Habis
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex-1">
                        <h4
                          className={`font-semibold text-sm line-clamp-1 ${isOutOfStock ? "text-gray-400 dark:text-gray-500 line-through" : "text-gray-900 dark:text-white"}`}
                        >
                          {item.name}
                        </h4>
                        <p
                          className={`text-sm font-bold mt-1 ${isOutOfStock ? "text-gray-400 dark:text-gray-500" : "text-blue-600 dark:text-cyan-400"}`}
                        >
                          Rp{" "}
                          {formatIDR(
                            Number(String(item.price).replace(/\./g, "")) *
                              currentQty,
                          )}
                        </p>

                        <div className="flex justify-between items-center mt-3">
                          <div
                            className={`flex items-center border rounded-lg overflow-hidden h-8 ${isOutOfStock ? "bg-gray-100 dark:bg-slate-800 border-gray-200 dark:border-slate-700 opacity-40" : "bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600"}`}
                          >
                            <button
                              onClick={() => handleUpdateQuantity(item.id, -1)}
                              disabled={currentQty <= 1 || isOutOfStock}
                              className="w-8 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors h-full"
                            >
                              -
                            </button>
                            <span className="w-8 flex items-center justify-center text-xs font-bold text-gray-900 dark:text-white border-x border-gray-300 dark:border-slate-600 h-full">
                              {currentQty}
                            </span>
                            <button
                              onClick={() => handleUpdateQuantity(item.id, 1)}
                              disabled={currentQty >= maxStock || isOutOfStock}
                              className="w-8 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors h-full"
                            >
                              +
                            </button>
                          </div>
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-xs font-semibold text-rose-500 hover:text-rose-600 transition-colors ml-2"
                          >
                            Hapus
                          </button>
                        </div>
                        {isOutOfStock && (
                          <p className="text-[10px] text-rose-500 font-bold mt-2">
                            Item ini tidak tersedia. Silakan hapus.
                          </p>
                        )}
                      </div>
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
                  onClick={handleCheckoutRedirect}
                  disabled={hasOutOfStockItems}
                  className={`w-full py-3.5 rounded-xl font-bold transition-all shadow-lg ${hasOutOfStockItems ? "bg-gray-400 text-gray-200 cursor-not-allowed shadow-none" : "bg-cyan-500 hover:bg-cyan-600 text-white shadow-cyan-500/30"}`}
                >
                  {hasOutOfStockItems
                    ? "Hapus Item Habis Untuk Lanjut"
                    : "Lanjut ke Checkout"}
                </button>
                {!currentUser && !hasOutOfStockItems && (
                  <p className="text-xs text-center text-rose-500 mt-3 font-medium">
                    Anda harus login untuk melanjutkan checkout.
                  </p>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
