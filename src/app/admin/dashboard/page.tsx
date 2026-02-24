"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/services/firebaseConfig";
import Link from "next/link";

export default function AdminDashboardPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "orders"));
      const data: any[] = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      data.sort((a, b) => {
        const dateA = a.createdAt?.toDate
          ? a.createdAt.toDate().getTime()
          : new Date(a.createdAt || 0).getTime();
        const dateB = b.createdAt?.toDate
          ? b.createdAt.toDate().getTime()
          : new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });
      setOrders(data);
    } catch (error) {
      console.error("Gagal memuat pesanan:", error);
    } finally {
      setLoading(false);
    }
  };

  const metrics = useMemo(() => {
    let totalRev = 0;
    let pending = 0;
    let packaging = 0;
    let shipped = 0;
    let completed = 0;
    let cancelled = 0;

    orders.forEach((order) => {
      const status = (order?.status || "").toLowerCase();

      if (["settlement", "success", "shipped", "completed"].includes(status)) {
        const cartItems = order?.cart || [];
        const orderTotal =
          order?.grossAmount ||
          cartItems.reduce((acc: number, item: any) => {
            const priceStr = item?.price
              ? String(item.price).replace(/\./g, "")
              : "0";
            return acc + Number(priceStr) * (item?.quantity || 1);
          }, 0);

        totalRev += orderTotal;
      }

      if (status === "pending") {
        pending++;
      } else if (status === "settlement" || status === "success") {
        packaging++;
      } else if (status === "shipped") {
        shipped++;
      } else if (status === "completed") {
        completed++;
      } else {
        cancelled++;
      }
    });

    return { totalRev, pending, packaging, shipped, completed, cancelled };
  }, [orders]);

  const todayOrders = useMemo(() => {
    const today = new Date();
    return orders.filter((order) => {
      if (!order?.createdAt) return false;

      try {
        const orderDate = order.createdAt.toDate
          ? order.createdAt.toDate()
          : new Date(order.createdAt);
        if (isNaN(orderDate.getTime())) return false;

        return (
          orderDate.getDate() === today.getDate() &&
          orderDate.getMonth() === today.getMonth() &&
          orderDate.getFullYear() === today.getFullYear()
        );
      } catch (error) {
        return false;
      }
    });
  }, [orders]);

  const todayRevenue = useMemo(() => {
    let rev = 0;
    todayOrders.forEach((order) => {
      const status = (order?.status || "").toLowerCase();
      if (["settlement", "success", "shipped", "completed"].includes(status)) {
        const cartItems = order?.cart || [];
        const orderTotal =
          order?.grossAmount ||
          cartItems.reduce((acc: number, item: any) => {
            const priceStr = item?.price
              ? String(item.price).replace(/\./g, "")
              : "0";
            return acc + Number(priceStr) * (item?.quantity || 1);
          }, 0);
        rev += orderTotal;
      }
    });
    return rev;
  }, [todayOrders]);

  const totalPages = Math.ceil(todayOrders.length / itemsPerPage);
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return todayOrders.slice(startIndex, startIndex + itemsPerPage);
  }, [todayOrders, currentPage]);

  const formatIDR = (amount: number) =>
    new Intl.NumberFormat("id-ID").format(amount);

  if (loading)
    return (
      <div className="text-cyan-400 font-orbitron animate-pulse">
        Menghitung metrik analitik...
      </div>
    );

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-r from-blue-700 to-cyan-600 rounded-2xl p-6 md:p-8 shadow-lg border border-cyan-500/30">
          <p className="text-cyan-100 font-semibold mb-2">
            Akumulasi Pendapatan (Seluruh Waktu)
          </p>
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">
            Rp {formatIDR(metrics.totalRev)}
          </h2>
        </div>

        <div className="bg-gradient-to-r from-emerald-600 to-teal-500 rounded-2xl p-6 md:p-8 shadow-lg border border-emerald-400/30">
          <p className="text-emerald-100 font-semibold mb-2">
            Pendapatan Bersih (Hari Ini)
          </p>
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">
            Rp {formatIDR(todayRevenue)}
          </h2>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-end mb-4">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Pesanan</h2>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-sm flex flex-col items-center justify-center text-center border-t-4 border-t-amber-500">
            <span className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">
              Belum Bayar
            </span>
            <span className="text-2xl font-black text-amber-400">
              {metrics.pending}
            </span>
          </div>
          <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-sm flex flex-col items-center justify-center text-center border-t-4 border-t-blue-500">
            <span className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">
              Sedang Dikemas
            </span>
            <span className="text-2xl font-black text-blue-400">
              {metrics.packaging}
            </span>
          </div>
          <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-sm flex flex-col items-center justify-center text-center border-t-4 border-t-purple-500">
            <span className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">
              Dikirim
            </span>
            <span className="text-2xl font-black text-purple-400">
              {metrics.shipped}
            </span>
          </div>
          <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-sm flex flex-col items-center justify-center text-center border-t-4 border-t-emerald-500">
            <span className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">
              Selesai
            </span>
            <span className="text-2xl font-black text-emerald-400">
              {metrics.completed}
            </span>
          </div>
          <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-sm flex flex-col items-center justify-center text-center border-t-4 border-t-rose-500">
            <span className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">
              Dibatalkan
            </span>
            <span className="text-2xl font-black text-rose-400">
              {metrics.cancelled}
            </span>
          </div>
        </div>

        <div className="flex justify-between items-center mb-4 mt-8">
          <h2 className="text-xl font-bold text-white">Transaksi Hari Ini</h2>
          <Link
            href="/admin/orders"
            className="text-sm text-cyan-400 hover:underline"
          >
            Lihat Riwayat Lengkap &rarr;
          </Link>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-400">
              <thead className="bg-gray-900/50 text-gray-300 uppercase text-xs border-b border-gray-700">
                <tr>
                  <th className="px-6 py-4">ID Pesanan</th>
                  <th className="px-6 py-4">Pelanggan</th>
                  <th className="px-6 py-4">Total Barang</th>
                  <th className="px-6 py-4">Total Bayar</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-500">
                        <svg
                          className="w-12 h-12 mb-3 text-gray-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                          />
                        </svg>
                        <p className="text-lg font-semibold">
                          Belum ada Transaksi hari ini
                        </p>
                        <p className="text-sm">
                          Pesanan yang masuk hari ini akan otomatis muncul di
                          sini.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedOrders.map((order) => {
                    const customerName =
                      order?.customerDetails?.name || "Anonim";
                    const orderIdDisplay = order?.orderId || order?.id || "-";
                    const orderStatus = (
                      order?.status || "unknown"
                    ).toLowerCase();

                    const cartItems = order?.cart || [];
                    const totalItems = cartItems.reduce(
                      (sum: number, item: any) => sum + (item?.quantity || 1),
                      0,
                    );

                    const totalAmount =
                      order?.grossAmount ||
                      cartItems.reduce((sum: number, item: any) => {
                        const priceStr = item?.price
                          ? String(item.price).replace(/\./g, "")
                          : "0";
                        return sum + Number(priceStr) * (item?.quantity || 1);
                      }, 0);

                    return (
                      <tr
                        key={order?.id || Math.random().toString()}
                        className="border-b border-gray-700 hover:bg-gray-700/30 transition-colors"
                      >
                        <td className="px-6 py-4 font-mono text-cyan-400">
                          {orderIdDisplay}
                        </td>
                        <td className="px-6 py-4">{customerName}</td>
                        <td className="px-6 py-4 font-bold">
                          {totalItems} Unit
                        </td>
                        <td className="px-6 py-4">
                          Rp {formatIDR(totalAmount)}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                              [
                                "settlement",
                                "shipped",
                                "completed",
                                "success",
                              ].includes(orderStatus)
                                ? "bg-emerald-500/20 text-emerald-400"
                                : orderStatus === "pending"
                                  ? "bg-amber-500/20 text-amber-400"
                                  : "bg-rose-500/20 text-rose-400"
                            }`}
                          >
                            {orderStatus}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 bg-gray-900/50 border-t border-gray-700">
              <span className="text-xs text-gray-500">
                Halaman {currentPage} dari {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 bg-gray-800 text-white rounded border border-gray-600 hover:bg-gray-700 disabled:opacity-50 text-xs"
                >
                  Sebelumnya
                </button>
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 bg-gray-800 text-white rounded border border-gray-600 hover:bg-gray-700 disabled:opacity-50 text-xs"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
