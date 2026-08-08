"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
import Header from "@/components/layout/Header";

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
  grossAmount?: number;
  customerDetails: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
}

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderIdParam = (params?.orderId as string) ?? "";

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.replace("/login");
        return;
      }
      setUser(currentUser);
      fetchOrder(currentUser.email);
    });
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, orderIdParam]);

  const fetchOrder = async (userEmail: string | null) => {
    if (!userEmail || !orderIdParam) {
      setLoading(false);
      return;
    }
    try {
      const ordersRef = collection(db, "orders");
      const q = query(
        ordersRef,
        where("orderId", "==", orderIdParam),
        where("customerDetails.email", "==", userEmail),
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        setNotFound(true);
      } else {
        const docSnap = snap.docs[0];
        setOrder({ id: docSnap.id, ...docSnap.data() } as Order);
      }
    } catch (error) {
      console.error("Gagal memuat detail pesanan:", error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

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

  const formatIDR = (amount: number) =>
    new Intl.NumberFormat("id-ID").format(amount);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "-";
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    if (isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const calculateTotal = (cart: OrderItem[]) =>
    cart.reduce((acc, item) => {
      const cleanPrice = Number(String(item.price).replace(/\./g, ""));
      return acc + cleanPrice * (item.quantity || 1);
    }, 0);

  const handleCompleteOrder = async () => {
    if (!order) return;
    if (
      !confirm(
        "Apakah Anda yakin telah menerima pesanan ini dengan baik? Tindakan ini tidak dapat dibatalkan.",
      )
    )
      return;
    setIsProcessing(true);
    try {
      const orderRef = doc(db, "orders", order.id);
      await updateDoc(orderRef, { status: "completed" });
      setOrder({ ...order, status: "completed" });
      alert("Terima kasih! Pesanan telah diselesaikan.");
    } catch (error) {
      alert("Gagal memperbarui status pesanan. Silakan coba lagi.");
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderStatusBadge = (dbStatus: string) => {
    const cat = getCategoryStatus(dbStatus);
    const styles: Record<string, string> = {
      pending:
        "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
      settlement:
        "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
      shipped:
        "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400",
      completed:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
      cancelled:
        "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400",
    };
    const labels: Record<string, string> = {
      pending: "Belum Bayar",
      settlement: "Sedang Dikemas",
      shipped: "Dikirim",
      completed: "Selesai",
      cancelled: "Dibatalkan",
    };
    return (
      <span
        className={`inline-flex px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider ${
          styles[cat] ??
          "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
        }`}
      >
        {labels[cat] ?? dbStatus}
      </span>
    );
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 dark:bg-[#0f172a] pt-28 pb-12 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    );
  }

  if (notFound || !order) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 dark:bg-[#0f172a] pt-28 pb-12 transition-colors duration-300">
          <div className="max-w-md mx-auto px-6 text-center">
            <div className="bg-white dark:bg-slate-800 p-10 rounded-3xl shadow-sm border border-gray-200 dark:border-slate-700">
              <div className="w-20 h-20 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-6">
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
                    d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-3">
                Pesanan Tidak Ditemukan
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mb-8">
                Pesanan dengan ID{" "}
                <span className="font-mono font-bold">{orderIdParam}</span>{" "}
                tidak ditemukan atau bukan milik akun Anda.
              </p>
              <Link
                href="/orders"
                className="inline-block px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/30"
              >
                Kembali ke Pesanan Saya
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  const total = order.grossAmount ?? calculateTotal(order.cart);

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 dark:bg-[#0f172a] pt-28 pb-12 transition-colors duration-300">
        <div className="max-w-3xl mx-auto px-6">
          {/* Breadcrumb */}
          <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Link
              href="/orders"
              className="hover:text-blue-600 dark:hover:text-cyan-400 transition-colors"
            >
              ← Pesanan Saya
            </Link>
          </nav>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
              <h1 className="text-3xl font-black text-gray-900 dark:text-white font-orbitron">
                DETAIL PESANAN
              </h1>
              {renderStatusBadge(order.status)}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 text-sm text-gray-500 dark:text-gray-400">
              <span>
                Order ID:{" "}
                <span className="font-mono font-bold text-gray-900 dark:text-white">
                  {order.orderId}
                </span>
              </span>
              <span>Dibuat: {formatDate(order.createdAt)}</span>
            </div>
          </motion.div>

          {/* Items */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden mb-6"
          >
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50">
              <h2 className="font-bold text-gray-900 dark:text-white">
                Produk Dipesan
              </h2>
            </div>
            <div className="p-6 space-y-4">
              {order.cart.map((item, index) => {
                const cleanPrice = Number(
                  String(item.price).replace(/\./g, ""),
                );
                const subtotal = cleanPrice * (item.quantity || 1);
                return (
                  <div
                    key={index}
                    className="flex items-center gap-4 pb-4 border-b border-gray-100 dark:border-slate-700 last:border-0 last:pb-0"
                  >
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
                      <img
                        src={item.image || "/logo.jpeg"}
                        alt={item.name}
                        className="object-contain w-full h-full absolute inset-0 p-1"
                        onError={(e) => {
                          e.currentTarget.src = "/logo.jpeg";
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                        {item.name}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {item.quantity || 1} x Rp {formatIDR(cleanPrice)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-blue-600 dark:text-cyan-400">
                        Rp {formatIDR(subtotal)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-6 py-5 bg-gray-50 dark:bg-slate-900/30 border-t border-gray-100 dark:border-slate-700 flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-300 font-bold">
                Total Belanja
              </span>
              <span className="text-2xl font-black text-blue-600 dark:text-cyan-400">
                Rp {formatIDR(total)}
              </span>
            </div>
          </motion.div>

          {/* Customer details */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 mb-6"
          >
            <h2 className="font-bold text-gray-900 dark:text-white mb-4">
              Informasi Pengiriman
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-500 dark:text-gray-400 mb-1">Nama</dt>
                <dd className="font-semibold text-gray-900 dark:text-white">
                  {order.customerDetails.name}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400 mb-1">Email</dt>
                <dd className="font-semibold text-gray-900 dark:text-white break-all">
                  {order.customerDetails.email}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400 mb-1">
                  Telepon
                </dt>
                <dd className="font-semibold text-gray-900 dark:text-white">
                  {order.customerDetails.phone}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-gray-500 dark:text-gray-400 mb-1">
                  Alamat Pengiriman
                </dt>
                <dd className="font-semibold text-gray-900 dark:text-white">
                  {order.customerDetails.address}
                </dd>
              </div>
            </dl>
          </motion.div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <Link
              href="/orders"
              className="flex-1 px-6 py-3.5 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-slate-700 rounded-xl font-bold transition-all text-center"
            >
              Lihat Semua Pesanan
            </Link>

            {getCategoryStatus(order.status) === "shipped" && (
              <button
                onClick={handleCompleteOrder}
                disabled={isProcessing}
                className="flex-1 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/30 disabled:opacity-50"
              >
                {isProcessing ? "Memproses..." : "Pesanan Diterima"}
              </button>
            )}

            {getCategoryStatus(order.status) === "pending" && (
              <Link
                href="/checkout"
                className="flex-1 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/30 text-center"
              >
                Lanjut Bayar
              </Link>
            )}
          </motion.div>
        </div>
      </div>
    </>
  );
}
