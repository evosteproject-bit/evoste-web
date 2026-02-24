"use client";

import { useEffect, useState, useMemo } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/services/firebaseConfig";

const TABS = [
  { id: "CUSTOMER", label: "Pelanggan" },
  { id: "ADMIN", label: "Administrator" },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState("CUSTOMER");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [newRole, setNewRole] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
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
      setUsers(data);
    } catch (error) {
      console.error("Gagal memuat data pengguna:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchSearch =
        (user.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.email || "").toLowerCase().includes(searchQuery.toLowerCase());

      const role = (user.role || "customer").toUpperCase();
      const isAdmin = role === "ADMIN";
      const isCustomer = role !== "ADMIN";

      const matchTab = activeTab === "ADMIN" ? isAdmin : isCustomer;

      return matchSearch && matchTab;
    });
  }, [users, searchQuery, activeTab]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredUsers, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab]);

  const openEditModal = (user: any) => {
    setSelectedUser(user);
    setNewRole((user.role || "customer").toLowerCase());
    setIsModalOpen(true);
  };

  const handleUpdateRole = async () => {
    if (!selectedUser) return;
    setIsProcessing(true);
    try {
      const userRef = doc(db, "users", selectedUser.id);
      await updateDoc(userRef, { role: newRole });

      setUsers(
        users.map((u) =>
          u.id === selectedUser.id ? { ...u, role: newRole } : u,
        ),
      );
      setIsModalOpen(false);
      alert("Otoritas pengguna berhasil diperbarui.");
    } catch (error) {
      alert("Gagal memperbarui otoritas pengguna.");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Tidak diketahui";
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    if (isNaN(date.getTime())) return "Format tidak valid";
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  if (loading)
    return (
      <div className="text-cyan-400 font-orbitron animate-pulse">
        Memuat data pengguna...
      </div>
    );

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Manajemen Pengguna</h2>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Cari Nama Lengkap atau Email..."
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
                <th className="px-6 py-4">Nama Lengkap</th>
                <th className="px-6 py-4">Email / Kontak</th>
                {/* Isolasi Kolom Terdaftar untuk Tab Admin */}
                {activeTab === "CUSTOMER" && (
                  <th className="px-6 py-4 text-center">Terdaftar</th>
                )}
                <th className="px-6 py-4 text-center">Peran (Role)</th>
                {/* Isolasi Kolom Aksi untuk Tab Admin */}
                {activeTab === "CUSTOMER" && (
                  <th className="px-6 py-4 text-center">Aksi</th>
                )}
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={activeTab === "CUSTOMER" ? 5 : 3}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    Tidak ada data pengguna di kategori ini.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => {
                  const role = (user.role || "customer").toUpperCase();
                  const isAdmin = role === "ADMIN";

                  return (
                    <tr
                      key={user.id}
                      className="border-b border-gray-700 hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="px-6 py-4 font-bold text-white">
                        {user.name || "Anonim"}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-cyan-400">{user.email || "-"}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {user.phone || "Tidak ada telepon"}
                        </p>
                      </td>
                      {/* Render Kondisional untuk Baris Terdaftar */}
                      {activeTab === "CUSTOMER" && (
                        <td className="px-6 py-4 text-center">
                          {formatDate(user.createdAt)}
                        </td>
                      )}
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                            isAdmin
                              ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                              : "bg-gray-600/50 text-gray-300 border border-gray-500/30"
                          }`}
                        >
                          {role}
                        </span>
                      </td>
                      {/* Render Kondisional untuk Baris Aksi */}
                      {activeTab === "CUSTOMER" && (
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openEditModal(user)}
                              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-md text-xs font-bold transition-colors shadow-sm"
                            >
                              Edit
                            </button>
                          </div>
                        </td>
                      )}
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
                className="px-3 py-1 bg-gray-800 text-white rounded border border-gray-600 hover:bg-gray-700 disabled:opacity-50 text-xs font-bold"
              >
                Sebelumnya
              </button>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="px-3 py-1 bg-gray-800 text-white rounded border border-gray-600 hover:bg-gray-700 disabled:opacity-50 text-xs font-bold"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-gray-700 flex justify-between items-center bg-gray-800">
              <h3 className="text-lg font-bold text-white">
                Edit Otoritas Pengguna
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                <p className="text-sm text-gray-400">Nama</p>
                <p className="font-bold text-white mb-2">{selectedUser.name}</p>
                <p className="text-sm text-gray-400">Email</p>
                <p className="font-bold text-cyan-400">{selectedUser.email}</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Tingkat Peran (Role)
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-600 text-white text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block p-3 outline-none"
                >
                  <option value="customer">Customer (Akses Publik)</option>
                  <option value="admin">Administrator (Akses Dasbor)</option>
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  Peringatan: Memberikan akses administrator akan mengizinkan
                  pengguna ini mengubah data sistem Anda.
                </p>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-gray-700">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-transparent text-gray-300 hover:text-white font-bold text-sm transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleUpdateRole}
                  disabled={
                    isProcessing ||
                    newRole === (selectedUser.role || "customer").toLowerCase()
                  }
                  className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-sm rounded-lg disabled:opacity-50 transition-colors shadow-md"
                >
                  Simpan Peran
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
