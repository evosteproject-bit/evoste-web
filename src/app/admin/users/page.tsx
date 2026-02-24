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

interface UserProfile {
  id: string; // Document ID (Sama dengan Auth UID)
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  role?: string;
  createdAt?: any;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // State Modal
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // State Form Edit
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    address: "",
    role: "customer",
  });

  // State Paginasi dan Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const data: UserProfile[] = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as UserProfile);
      });
      // Urutkan berdasarkan tanggal dibuat (terbaru)
      data.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return dateB - dateA;
      });
      setUsers(data);
    } catch (error) {
      console.error("Gagal memuat pengguna:", error);
    } finally {
      setLoading(false);
    }
  };

  // Logika Filter dan Pencarian
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const searchLower = searchQuery.toLowerCase();
      const matchSearch =
        (user.name?.toLowerCase() || "").includes(searchLower) ||
        (user.email?.toLowerCase() || "").includes(searchLower);

      const matchRole = filterRole === "All" || user.role === filterRole;

      return matchSearch && matchRole;
    });
  }, [users, searchQuery, filterRole]);

  // Logika Paginasi
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredUsers, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterRole]);

  const openDetailModal = (user: UserProfile) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name || "",
      phone: user.phone || "",
      address: user.address || "",
      role: user.role || "customer",
    });
    setIsModalOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    setIsProcessing(true);
    try {
      const userRef = doc(db, "users", selectedUser.id);
      await updateDoc(userRef, {
        name: editForm.name,
        phone: editForm.phone,
        address: editForm.address,
        role: editForm.role,
      });

      // Sinkronisasi status lokal
      setUsers(
        users.map((u) =>
          u.id === selectedUser.id ? { ...u, ...editForm } : u,
        ),
      );
      setSelectedUser({ ...selectedUser, ...editForm });
      alert("Data pengguna berhasil diperbarui.");
      setIsModalOpen(false);
    } catch (error) {
      alert("Gagal memperbarui data pengguna.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (
      !confirm(
        "PERINGATAN: Menghapus data ini akan melumpuhkan profil pengguna terkait secara permanen. Lanjutkan?",
      )
    )
      return;
    try {
      await deleteDoc(doc(db, "users", id));
      setUsers(users.filter((u) => u.id !== id));
      setIsModalOpen(false);
    } catch (error) {
      alert("Gagal menghapus pengguna.");
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Tidak diketahui";
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  if (loading)
    return (
      <div className="text-cyan-400 font-orbitron animate-pulse">
        Memuat basis data pengguna...
      </div>
    );

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Manajemen Pengguna</h2>

      {/* Kontrol Filter & Pencarian */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between items-center bg-gray-800 p-4 rounded-xl border border-gray-700">
        <div className="w-full md:w-1/3">
          <input
            type="text"
            placeholder="Cari Nama atau Email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-900 border border-gray-600 text-white text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block p-2.5 outline-none"
          />
        </div>
        <div className="w-full md:w-1/4 flex items-center gap-3">
          <span className="text-sm text-gray-400 font-medium">Otoritas:</span>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="w-full bg-gray-900 border border-gray-600 text-white text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block p-2.5 outline-none"
          >
            <option value="All">Semua Peran</option>
            <option value="customer">Customer</option>
            <option value="admin">Administrator</option>
          </select>
        </div>
      </div>

      {/* Tabel Pengguna */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="bg-gray-900/50 text-gray-300 uppercase text-xs border-b border-gray-700">
              <tr>
                <th className="px-6 py-4">Nama Lengkap</th>
                <th className="px-6 py-4">Email / Kontak</th>
                <th className="px-6 py-4">Terdaftar</th>
                <th className="px-6 py-4">Peran (Role)</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    Tidak ada data pengguna yang sesuai.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-gray-700 hover:bg-gray-700/30 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-white">
                      {user.name || "Anonim"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-cyan-400">{user.email}</div>
                      <div className="text-xs text-gray-500">
                        {user.phone || "Tidak ada telepon"}
                      </div>
                    </td>
                    <td className="px-6 py-4">{formatDate(user.createdAt)}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                          user.role === "admin"
                            ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                            : "bg-gray-700 text-gray-300"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openDetailModal(user)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold transition-colors"
                      >
                        Edit
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
              Menampilkan {(currentPage - 1) * itemsPerPage + 1} hingga{" "}
              {Math.min(currentPage * itemsPerPage, filteredUsers.length)} dari{" "}
              {filteredUsers.length} pengguna
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

      {/* Modal Detail & Edit */}
      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-gray-700 flex justify-between items-center sticky top-0 bg-gray-800 z-10">
              <h3 className="text-xl font-bold text-white">
                Kelola Profil Pengguna
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-1">
                  Email (Kredensial)
                </label>
                <input
                  type="email"
                  value={selectedUser.email || ""}
                  disabled
                  readOnly
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-600 bg-gray-900 text-gray-500 cursor-not-allowed outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Email tidak dapat diubah dari sisi aplikasi klien.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-600 bg-gray-700 text-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1">
                  Nomor Telepon
                </label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm({ ...editForm, phone: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-600 bg-gray-700 text-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1">
                  Alamat Utama
                </label>
                <textarea
                  rows={3}
                  value={editForm.address}
                  onChange={(e) =>
                    setEditForm({ ...editForm, address: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-600 bg-gray-700 text-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all resize-none"
                />
              </div>

              <div className="pt-4 border-t border-gray-700">
                <label className="block text-sm font-bold text-rose-400 mb-2 uppercase tracking-wide">
                  Otorisasi Sistem (Role)
                </label>
                <select
                  value={editForm.role}
                  onChange={(e) =>
                    setEditForm({ ...editForm, role: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-600 bg-gray-900 text-white focus:ring-2 focus:ring-rose-500 outline-none transition-all"
                >
                  <option value="customer">Customer (Akses Terbatas)</option>
                  <option value="admin">Administrator (Akses Penuh)</option>
                </select>
                <p className="text-xs text-gray-400 mt-2">
                  Peringatan: Memberikan status administrator akan mengizinkan
                  pengguna mengakses dasbor ini.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-700 mt-4">
                <button
                  onClick={() => handleDeleteUser(selectedUser.id)}
                  className="px-4 py-2.5 bg-transparent border border-rose-500/50 text-rose-500 hover:bg-rose-500 hover:text-white font-bold rounded-lg transition-colors flex-1"
                >
                  Hapus Profil
                </button>
                <button
                  onClick={handleUpdateUser}
                  disabled={isProcessing}
                  className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-lg transition-colors flex-[2] disabled:opacity-50"
                >
                  {isProcessing ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
