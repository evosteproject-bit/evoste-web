"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "@/services/firebaseConfig";

// Definisi Tab Status Shopee-style
const TABS = [
  { id: "All", label: "Semua" },
  { id: "pending", label: "Belum Bayar" },
  { id: "settlement", label: "Sedang Dikemas" },
  { id: "shipped", label: "Dikirim" },
  { id: "completed", label: "Selesai" },
  { id: "cancelled", label: "Dibatalkan" },
];

interface OrderItem {
  id: string | number;
  name: string;
  price: string | number;
  quantity: number;
  image: string;
}

interface Order {
  id: string;
  orderId: string;
  status: string;
  cart: OrderItem[];
  createdAt: any;
  customerDetails: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
}

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState("All");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.replace("/login");
        return;
      }
      setUser(currentUser);
      fetchUserOrders(currentUser.email);
    });

    return () => unsubscribe();
  }, [router]);

  const fetchUserOrders = async (userEmail: string | null) => {
    if (!userEmail) return;

    try {
      const ordersRef = collection(db, "orders");
      const q = query(
        ordersRef,
        where("customerDetails.email", "==", userEmail),
      );
      const querySnapshot = await getDocs(q);

      const fetchedOrders: Order[] = [];
      querySnapshot.forEach((doc) => {
        fetchedOrders.push({ id: doc.id, ...doc.data() } as Order);
      });

      fetchedOrders.sort((a, b) => {
        const dateA = a.createdAt?.toDate
          ? a.createdAt.toDate().getTime()
          : new Date(a.createdAt).getTime();
        const dateB = b.createdAt?.toDate
          ? b.createdAt.toDate().getTime()
          : new Date(b.createdAt).getTime();
        return dateB - dateA;
      });

      setOrders(fetchedOrders);
    } catch (error) {
      console.error("Gagal mengambil data pesanan:", error);
    } finally {
      setLoading(false);
    }
  };

  // Helper untuk klasifikasi status
  const getCategoryStatus = (dbStatus: string) => {
    const s = dbStatus?.toLowerCase();
    if (s === "pending") return "pending";
    if (s === "settlement" || s === "success") return "settlement";
    if (s === "shipped") return "shipped";
    if (s === "completed") return "completed";
    if (s === "cancel" || s === "deny" || s === "expire" || s === "failed")
      return "cancelled";
    return "unknown";
  };

  // Logika Filter Tab
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const category = getCategoryStatus(order.status);
      return activeTab === "All" || category === activeTab;
    });
  }, [orders, activeTab]);

  // Aksi Pelanggan: Konfirmasi Pesanan Diterima
  const handleCompleteOrder = async (orderId: string) => {
    if (
      !confirm(
        "Apakah Anda yakin telah menerima pesanan ini dengan baik? Tindakan ini tidak dapat dibatalkan.",
      )
    )
      return;

    setIsProcessing(true);
    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, { status: "completed" });

      // Update UI secara lokal
      setOrders(
        orders.map((o) =>
          o.id === orderId ? { ...o, status: "completed" } : o,
        ),
      );
      alert("Terima kasih! Pesanan telah diselesaikan.");
    } catch (error) {
      alert("Gagal memperbarui status pesanan. Silakan coba lagi.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Format Helpers
  const formatIDR = (amount: number) =>
    new Intl.NumberFormat("id-ID").format(amount);
  const formatDate = (timestamp: any) => {
    if (!timestamp) return "-";
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };
  const calculateTotal = (cart: OrderItem[]) => {
    return cart.reduce((acc, item) => {
      const cleanPrice = Number(String(item.price).replace(/\./g, ""));
      return acc + cleanPrice * (item.quantity || 1);
    }, 0);
  };

  // Visual Helper Badge
  const renderStatusBadge = (dbStatus: string) => {
    const cat = getCategoryStatus(dbStatus);
    switch (cat) {
      case "pending":
        return (
          <span className="px-3 py-1 bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 rounded-full text-xs font-bold uppercase tracking-wider">
            Belum Bayar
          </span>
        );
      case "settlement":
        return (
          <span className="px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 rounded-full text-xs font-bold uppercase tracking-wider">
            Sedang Dikemas
          </span>
        );
      case "shipped":
        return (
          <span className="px-3 py-1 bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400 rounded-full text-xs font-bold uppercase tracking-wider">
            Dikirim
          </span>
        );
      case "completed":
        return (
          <span className="px-3 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 rounded-full text-xs font-bold uppercase tracking-wider">
            Selesai
          </span>
        );
      case "cancelled":
        return (
          <span className="px-3 py-1 bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 rounded-full text-xs font-bold uppercase tracking-wider">
            Dibatalkan
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-full text-xs font-bold uppercase tracking-wider">
            {dbStatus}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0f172a] pt-28 pb-12 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f172a] pt-28 pb-12 transition-colors duration-300">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-black text-gray-900 dark:text-white font-orbitron">
            PESANAN SAYA
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Pantau status transaksi dan riwayat belanja Anda di sini.
          </p>
        </motion.div>

        {/* Navigasi Tab Shopee Style */}
        <div className="flex overflow-x-auto border-b border-gray-200 dark:border-slate-700 mb-8 custom-scrollbar bg-white dark:bg-slate-800 rounded-t-2xl px-2 pt-2">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap px-6 py-4 text-sm font-bold transition-all border-b-2 ${
                  isActive
                    ? "border-blue-600 text-blue-600 dark:border-cyan-400 dark:text-cyan-400"
                    : "border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {filteredOrders.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 p-12 rounded-b-3xl shadow-sm border border-gray-200 dark:border-slate-700 text-center">
            <div className="w-24 h-24 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-10 h-10 text-gray-400"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Belum ada pesanan
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8">
              Anda tidak memiliki pesanan dalam kategori ini.
            </p>
            <Link
              href="/"
              className="inline-block px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/30"
            >
              Mulai Belanja
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredOrders.map((order) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden"
              >
                {/* Header Card Pesanan */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold mb-1">
                      ORDER ID
                    </p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white font-mono">
                      {order.orderId}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(order.createdAt)}
                    </p>
                    {renderStatusBadge(order.status)}
                  </div>
                </div>

                {/* Body Card Pesanan (Item List) */}
                <div className="p-6 border-b border-gray-100 dark:border-slate-700">
                  <div className="space-y-4">
                    {order.cart.map((item, index) => (
                      <div key={index} className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-lg flex items-center justify-center shrink-0 p-1">
                          <img
                            src={item.image || "/logo.jpeg"}
                            alt={item.name}
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {item.name}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {item.quantity || 1} x Rp{" "}
                            {formatIDR(
                              Number(String(item.price).replace(/\./g, "")),
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer Card Pesanan & Aksi */}
                <div className="px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50 dark:bg-slate-900/30">
                  <div className="text-sm">
                    <span className="text-gray-500 dark:text-gray-400">
                      Total Belanja:{" "}
                    </span>
                    <span className="text-lg font-black text-blue-600 dark:text-cyan-400">
                      Rp {formatIDR(calculateTotal(order.cart))}
                    </span>
                  </div>

                  {/* Kondisi Tombol Berdasarkan Status */}
                  <div className="w-full sm:w-auto flex gap-3 justify-end">
                    {getCategoryStatus(order.status) === "shipped" && (
                      <button
                        onClick={() => handleCompleteOrder(order.id)}
                        disabled={isProcessing}
                        className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm transition-colors shadow-lg shadow-emerald-500/30 disabled:opacity-50"
                      >
                        Pesanan Diterima
                      </button>
                    )}
                    {getCategoryStatus(order.status) === "pending" && (
                      <Link
                        href={`/checkout`} // Asumsi pengguna bisa dialihkan kembali ke checkout, atau beri instruksi.
                        className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition-colors text-center"
                      >
                        Lanjut Bayar
                      </Link>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
