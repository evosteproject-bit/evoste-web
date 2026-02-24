"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/services/firebaseConfig";
import Link from "next/link";

export default function AdminDashboardPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // State Paginasi
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
          : new Date(a.createdAt).getTime();
        const dateB = b.createdAt?.toDate
          ? b.createdAt.toDate().getTime()
          : new Date(b.createdAt).getTime();
        return dateB - dateA;
      });
      setOrders(data);
    } catch (error) {
      console.error("Gagal memuat pesanan:", error);
    } finally {
      setLoading(false);
    }
  };

  // Kalkulasi Statistik Metrik (Akumulasi Seluruh Waktu)
  const metrics = useMemo(() => {
    let totalRev = 0;
    let pending = 0;
    let completed = 0; // Menggambarkan total transaksi lunas
    let failed = 0;

    orders.forEach((order) => {
      const status = order.status?.toLowerCase();

      // PERBAIKAN LOGIKA: Menghitung semua status pasca-pembayaran
      if (
        status === "settlement" ||
        status === "success" ||
        status === "shipped" ||
        status === "completed"
      ) {
        completed++;

        const orderTotal =
          order.cart?.reduce((acc: number, item: any) => {
            const cleanPrice = Number(String(item.price).replace(/\./g, ""));
            return acc + cleanPrice * (item.quantity || 1);
          }, 0) || 0;

        totalRev += orderTotal;
      } else if (status === "pending") {
        pending++;
      } else {
        // Mencakup cancel, deny, expire, failed
        failed++;
      }
    });

    return { totalRev, totalOrders: orders.length, pending, completed, failed };
  }, [orders]);

  // Logika Filter Transaksi Hari Ini
  const todayOrders = useMemo(() => {
    const today = new Date();
    return orders.filter((order) => {
      if (!order.createdAt) return false;
      const orderDate = order.createdAt?.toDate
        ? order.createdAt.toDate()
        : new Date(order.createdAt);

      return (
        orderDate.getDate() === today.getDate() &&
        orderDate.getMonth() === today.getMonth() &&
        orderDate.getFullYear() === today.getFullYear()
      );
    });
  }, [orders]);

  // Logika Paginasi untuk Tabel Hari Ini
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
      {/* Kartu Pendapatan */}
      <div className="bg-gradient-to-r from-cyan-600 to-blue-700 rounded-2xl p-6 md:p-8 shadow-lg border border-cyan-500/30">
        <p className="text-cyan-100 font-semibold mb-2">
          Total Pendapatan Bersih (Lunas)
        </p>
        <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">
          Rp {formatIDR(metrics.totalRev)}
        </h2>
      </div>

      {/* Grid Kartu Metrik Kecil */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-sm flex flex-col">
          <span className="text-gray-400 text-sm font-medium mb-1">
            Total Pesanan
          </span>
          <span className="text-2xl font-bold text-white">
            {metrics.totalOrders}
          </span>
        </div>
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-sm flex flex-col border-l-4 border-l-amber-500">
          <span className="text-gray-400 text-sm font-medium mb-1">
            Tertunda (Pending)
          </span>
          <span className="text-2xl font-bold text-amber-400">
            {metrics.pending}
          </span>
        </div>
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-sm flex flex-col border-l-4 border-l-emerald-500">
          <span className="text-gray-400 text-sm font-medium mb-1">
            Lunas (Diproses/Selesai)
          </span>
          <span className="text-2xl font-bold text-emerald-400">
            {metrics.completed}
          </span>
        </div>
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-sm flex flex-col border-l-4 border-l-rose-500">
          <span className="text-gray-400 text-sm font-medium mb-1">
            Gagal (Failed)
          </span>
          <span className="text-2xl font-bold text-rose-400">
            {metrics.failed}
          </span>
        </div>
      </div>

      {/* Bagian Tabel Transaksi Harian */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-white">Transaksi Hari Ini</h3>
          <Link
            href="/admin/orders"
            className="text-sm text-cyan-400 hover:underline"
          >
            Lihat Riwayat Lengkap &rarr;
          </Link>
        </div>

        {/* Tabel */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-400">
              <thead className="bg-gray-900/50 text-gray-300 uppercase text-xs border-b border-gray-700">
                <tr>
                  <th className="px-6 py-4">Order ID</th>
                  <th className="px-6 py-4">Pelanggan</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center">
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
                  paginatedOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-gray-700 hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="px-6 py-4 font-mono text-cyan-400">
                        {order.orderId}
                      </td>
                      <td className="px-6 py-4">
                        {order.customerDetails?.name || "-"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                            [
                              "settlement",
                              "shipped",
                              "completed",
                              "success",
                            ].includes(order.status)
                              ? "bg-emerald-500/20 text-emerald-400"
                              : order.status === "pending"
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-rose-500/20 text-rose-400"
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginasi Dasbor */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 bg-gray-900/50 border-t border-gray-700">
              <span className="text-xs text-gray-500">
                Halaman {currentPage} dari {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2 py-1 bg-gray-800 text-white rounded border border-gray-600 hover:bg-gray-700 disabled:opacity-50 text-xs"
                >
                  Prev
                </button>
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 bg-gray-800 text-white rounded border border-gray-600 hover:bg-gray-700 disabled:opacity-50 text-xs"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
