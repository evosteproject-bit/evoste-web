"use client";

import { useEffect, useState, useMemo } from "react";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/services/firebaseConfig";

const TABS = [
  { id: "All", label: "Semua" },
  { id: "pending", label: "Belum Bayar" },
  { id: "settlement", label: "Sedang Dikemas" },
  { id: "shipped", label: "Dikirim" },
  { id: "completed", label: "Selesai" },
  { id: "cancelled", label: "Dibatalkan" },
];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // State Modal Detail
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // State Navigasi dan Paginasi
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
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

  // Helper untuk normalisasi status database ke kategori tab
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

  // Helper Mesin Status (State Machine) untuk menentukan langkah selanjutnya
  const getNextStatusInfo = (currentStatus: string) => {
    const s = currentStatus?.toLowerCase();
    // Jika pesanan lunas/sedang dikemas, tahap selanjutnya adalah Dikirim
    if (s === "settlement" || s === "success")
      return { nextStatus: "shipped", actionLabel: "Kirim Pesanan" };
    // Jika pesanan sudah dikirim, tahap selanjutnya adalah Selesai (Opsional bagi admin jika pelanggan lupa klik selesai)
    if (s === "shipped")
      return { nextStatus: "completed", actionLabel: "Tandai Selesai" };
    // Status lain (pending, completed, failed) tidak memiliki tombol aksi lanjutan otomatis
    return null;
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchSearch =
        order.orderId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customerDetails?.name
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase());

      const category = getCategoryStatus(order.status);
      const matchTab = activeTab === "All" || category === activeTab;

      return matchSearch && matchTab;
    });
  }, [orders, searchQuery, activeTab]);

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredOrders, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab]);

  const openDetailModal = (order: any) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  // Fungsi Pembaruan Status Satu Klik
  const handleAdvanceStatus = async (order: any) => {
    const nextInfo = getNextStatusInfo(order.status);
    if (!nextInfo) return;

    if (
      !window.confirm(
        `Konfirmasi: Ubah status pesanan ${order.orderId} menjadi "${nextInfo.actionLabel}"?`,
      )
    ) {
      return;
    }

    setIsProcessing(true);
    try {
      const orderRef = doc(db, "orders", order.id);
      await updateDoc(orderRef, { status: nextInfo.nextStatus });

      setOrders(
        orders.map((o) =>
          o.id === order.id ? { ...o, status: nextInfo.nextStatus } : o,
        ),
      );
      alert(
        `Pesanan berhasil diperbarui ke tahap: ${nextInfo.nextStatus.toUpperCase()}`,
      );
    } catch (error) {
      alert("Terjadi kesalahan saat memperbarui status pesanan.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteOrder = async (id: string) => {
    if (
      !window.confirm(
        "Peringatan: Hapus pesanan ini secara permanen dari basis data? Tindakan ini tidak dapat dibatalkan.",
      )
    )
      return;
    try {
      await deleteDoc(doc(db, "orders", id));
      setOrders(orders.filter((o) => o.id !== id));
      setIsModalOpen(false);
    } catch (error) {
      alert("Gagal menghapus pesanan.");
    }
  };

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

  const renderStatusBadge = (dbStatus: string) => {
    const cat = getCategoryStatus(dbStatus);
    switch (cat) {
      case "pending":
        return (
          <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-xs font-bold uppercase">
            Belum Bayar
          </span>
        );
      case "settlement":
        return (
          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-bold uppercase">
            Sedang Dikemas
          </span>
        );
      case "shipped":
        return (
          <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs font-bold uppercase">
            Dikirim
          </span>
        );
      case "completed":
        return (
          <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs font-bold uppercase">
            Selesai
          </span>
        );
      case "cancelled":
        return (
          <span className="px-2 py-1 bg-rose-500/20 text-rose-400 rounded text-xs font-bold uppercase">
            Dibatalkan
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 bg-gray-500/20 text-gray-400 rounded text-xs font-bold uppercase">
            {dbStatus}
          </span>
        );
    }
  };

  if (loading)
    return (
      <div className="text-cyan-400 font-orbitron animate-pulse">
        Memuat data pesanan...
      </div>
    );

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">
        Kelola Pengiriman Pesanan
      </h2>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Cari Order ID atau Nama Pelanggan..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full md:w-1/2 bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block p-3 outline-none"
        />
      </div>

      <div className="flex overflow-x-auto border-b border-gray-700 mb-6 custom-scrollbar">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap px-6 py-3 text-sm font-semibold transition-colors border-b-2 ${
                isActive
                  ? "border-cyan-500 text-cyan-400"
                  : "border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="bg-gray-900/50 text-gray-300 uppercase text-xs border-b border-gray-700">
              <tr>
                <th className="px-6 py-4 text-center">Order ID</th>
                <th className="px-6 py-4 text-center">Pelanggan</th>
                <th className="px-6 py-4 text-center">Tanggal</th>
                <th className="px-6 py-4 text-center">Status Pengiriman</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-center">
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    Tidak ada pesanan di kategori ini.
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => {
                  const nextStatusInfo = getNextStatusInfo(order.status);

                  return (
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
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        {renderStatusBadge(order.status)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openDetailModal(order)}
                            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-xs font-bold transition-colors border border-gray-600 shadow-sm"
                          >
                            Detail
                          </button>

                          {nextStatusInfo && (
                            <button
                              onClick={() => handleAdvanceStatus(order)}
                              disabled={isProcessing}
                              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-md text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
                            >
                              {nextStatusInfo.actionLabel}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 bg-gray-900/50 border-t border-gray-700">
            <span className="text-sm text-gray-400">
              Hal {currentPage} dari {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-gray-800 text-white rounded border border-gray-600 hover:bg-gray-700 disabled:opacity-50"
              >
                Prev
              </button>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="px-3 py-1 bg-gray-800 text-white rounded border border-gray-600 hover:bg-gray-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Detail Pesanan Saja */}
      {isModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-gray-700 flex justify-between items-center sticky top-0 bg-gray-800 z-10">
              <h3 className="text-xl font-bold text-white">Rincian Pesanan</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                <h4 className="text-sm font-bold text-gray-400 mb-3 uppercase">
                  Informasi Pelanggan & Pengiriman
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Penerima</p>
                    <p className="text-white font-medium">
                      {selectedOrder.customerDetails?.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Telepon</p>
                    <p className="text-white font-medium">
                      {selectedOrder.customerDetails?.phone}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-500">Email Utama</p>
                    <p className="text-white font-medium">
                      {selectedOrder.customerDetails?.email}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-500">Alamat Lengkap</p>
                    <p className="text-white font-medium leading-relaxed">
                      {selectedOrder.customerDetails?.address}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-gray-400 mb-3 uppercase">
                  Daftar Barang
                </h4>
                <div className="space-y-3">
                  {selectedOrder.cart.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center bg-gray-700/20 p-3 rounded border border-gray-700"
                    >
                      <div>
                        <p className="text-white font-medium">{item.name}</p>
                        <p className="text-xs text-gray-400">
                          Kuantitas: {item.quantity || 1}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-cyan-400">
                          Rp{" "}
                          {formatIDR(
                            Number(String(item.price).replace(/\./g, "")) *
                              (item.quantity || 1),
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-700/50 flex justify-between items-center">
                <button
                  onClick={() => handleDeleteOrder(selectedOrder.id)}
                  className="text-xs font-bold text-rose-500 hover:text-rose-400 transition-colors py-2"
                >
                  Hapus Pesanan Permanen
                </button>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-bold rounded transition-colors"
                >
                  Tutup Rincian
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
