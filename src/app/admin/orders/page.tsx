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

// Definisi
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

  // State Modal
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState("");
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

  // Logika Filter Tab dan Pencarian
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

  // Logika Paginasi
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
    const category = getCategoryStatus(order.status);
    // Jika status cancelled, pertahankan nilai aslinya di dropdown
    setNewStatus(category === "cancelled" ? order.status : category);
    setIsModalOpen(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedOrder) return;
    setIsProcessing(true);
    try {
      const orderRef = doc(db, "orders", selectedOrder.id);
      await updateDoc(orderRef, { status: newStatus });

      setOrders(
        orders.map((o) =>
          o.id === selectedOrder.id ? { ...o, status: newStatus } : o,
        ),
      );
      setSelectedOrder({ ...selectedOrder, status: newStatus });
      alert("Status pengiriman berhasil diperbarui.");
      setIsModalOpen(false);
    } catch (error) {
      alert("Gagal memperbarui status.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteOrder = async (id: string) => {
    if (!confirm("Hapus pesanan ini secara permanen?")) return;
    try {
      await deleteDoc(doc(db, "orders", id));
      setOrders(orders.filter((o) => o.id !== id));
      setIsModalOpen(false);
    } catch (error) {
      alert("Gagal menghapus pesanan.");
    }
  };

  // UI Helpers
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

      {/* Pencarian */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Cari Order ID atau Nama Pelanggan..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full md:w-1/2 bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block p-3 outline-none"
        />
      </div>

      {/* Navigasi Tab Shopee Style */}
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

      {/* Tabel Pesanan */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="bg-gray-900/50 text-gray-300 uppercase text-xs border-b border-gray-700">
              <tr>
                <th className="px-6 py-4">Order ID</th>
                <th className="px-6 py-4">Pelanggan</th>
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4">Status Pengiriman</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
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
                    <td className="px-6 py-4">{formatDate(order.createdAt)}</td>
                    <td className="px-6 py-4">
                      {renderStatusBadge(order.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openDetailModal(order)}
                        className="px-3 py-1.5 bg-gray-700 hover:bg-cyan-600 text-white rounded text-xs font-bold transition-colors border border-gray-600 hover:border-cyan-500"
                      >
                        Periksa & Update
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginasi */}
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

      {/* Modal Detail & Update Status Pengiriman */}
      {isModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-gray-700 flex justify-between items-center sticky top-0 bg-gray-800 z-10">
              <h3 className="text-xl font-bold text-white">
                Detail Pengiriman
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                <h4 className="text-sm font-bold text-gray-400 mb-3 uppercase">
                  Alamat Tujuan
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
                    <p className="text-gray-500">Alamat Lengkap</p>
                    <p className="text-white font-medium">
                      {selectedOrder.customerDetails?.address}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-gray-400 mb-3 uppercase">
                  Barang yang harus dikemas
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
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-700 pt-6">
                <h4 className="text-sm font-bold text-gray-400 mb-3 uppercase">
                  Pembaruan Status
                </h4>
                <div className="flex flex-col sm:flex-row gap-4 items-end">
                  <div className="flex-1 w-full">
                    <label className="block text-xs text-gray-500 mb-1">
                      Status Pengiriman Saat Ini
                    </label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-600 text-white text-sm rounded focus:ring-cyan-500 focus:border-cyan-500 block p-3 outline-none"
                    >
                      <option value="pending" disabled>
                        Belum Bayar (Menunggu Pelanggan)
                      </option>
                      <option value="settlement">
                        Sedang Dikemas (Pembayaran Valid)
                      </option>
                      <option value="shipped">
                        Dikirim (Pesanan diserahkan ke kurir)
                      </option>
                      <option value="completed">
                        Selesai (Pesanan diterima)
                      </option>
                      <option value="cancel">Dibatalkan</option>
                    </select>
                  </div>
                  <button
                    onClick={handleUpdateStatus}
                    disabled={
                      isProcessing ||
                      newStatus === getCategoryStatus(selectedOrder.status)
                    }
                    className="w-full sm:w-auto px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-bold rounded disabled:opacity-50 transition-colors"
                  >
                    Simpan Perubahan
                  </button>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-700/50 flex justify-end">
                  <button
                    onClick={() => handleDeleteOrder(selectedOrder.id)}
                    className="text-xs font-bold text-rose-500 hover:text-rose-400 transition-colors"
                  >
                    Hapus Data Pesanan
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
