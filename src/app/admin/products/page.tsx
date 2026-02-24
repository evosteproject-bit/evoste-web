"use client";

import { useEffect, useState, useMemo } from "react";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/services/firebaseConfig";

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  description: string;
  image: string;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // State Modal & Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Inisialisasi string kosong untuk mencegah bug input angka 0
  const [formData, setFormData] = useState({
    name: "",
    price: "" as string | number,
    stock: "" as string | number,
    description: "",
    image: "",
  });

  // State Pencarian & Paginasi
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "products"));
      const data: Product[] = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Product);
      });
      data.sort((a, b) => a.name.localeCompare(b.name));
      setProducts(data);
    } catch (error) {
      console.error("Gagal memuat produk:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter((product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [products, searchQuery]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProducts, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({ name: "", price: "", stock: "", description: "", image: "" });
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingId(product.id);
    setFormData({
      name: product.name,
      price: product.price,
      stock: product.stock,
      description: product.description || "",
      image: product.image || "",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      const payload = {
        name: formData.name,
        price: Number(formData.price), // Konversi paksa ke tipe Number untuk database
        stock: Number(formData.stock), // Konversi paksa ke tipe Number untuk database
        description: formData.description,
        image: formData.image,
      };

      if (editingId) {
        const docRef = doc(db, "products", editingId);
        await updateDoc(docRef, payload);
        setProducts(
          products.map((p) =>
            p.id === editingId ? ({ ...p, ...payload } as Product) : p,
          ),
        );
        alert("Produk berhasil diperbarui.");
      } else {
        const docRef = await addDoc(collection(db, "products"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        setProducts([...products, { id: docRef.id, ...payload } as Product]);
        alert("Produk baru berhasil ditambahkan.");
      }
      setIsModalOpen(false);
    } catch (error) {
      alert("Terjadi kesalahan saat menyimpan produk.");
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus produk ini secara permanen dari basis data?")) return;
    try {
      await deleteDoc(doc(db, "products", id));
      setProducts(products.filter((p) => p.id !== id));
    } catch (error) {
      alert("Gagal menghapus produk.");
    }
  };

  const formatIDR = (amount: number) =>
    new Intl.NumberFormat("id-ID").format(amount);

  if (loading)
    return (
      <div className="text-cyan-400 font-orbitron animate-pulse">
        Memuat katalog produk...
      </div>
    );

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-white">Kelola Produk</h2>
        <button
          onClick={openAddModal}
          className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-lg transition-colors shadow-lg shadow-cyan-500/30 flex items-center gap-2"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Tambah Produk
        </button>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Cari nama produk..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full md:w-1/3 bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block p-3 outline-none"
        />
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="bg-gray-900/50 text-gray-300 uppercase text-xs border-b border-gray-700">
              <tr>
                <th className="px-6 py-4">Produk</th>
                <th className="px-6 py-4">Harga</th>
                <th className="px-6 py-4">Stok</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    Katalog produk kosong.
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((product) => (
                  <tr
                    key={product.id}
                    className="border-b border-gray-700 hover:bg-gray-700/30 transition-colors"
                  >
                    <td className="px-6 py-4 flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-900 rounded-lg overflow-hidden relative flex-shrink-0 border border-gray-600">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="object-cover w-full h-full"
                          onError={(e) => {
                            e.currentTarget.src = "/logo.jpeg";
                          }}
                        />
                      </div>
                      <span className="font-bold text-white">
                        {product.name}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-cyan-400">
                      Rp {formatIDR(product.price)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          product.stock > 10
                            ? "bg-emerald-500/20 text-emerald-400"
                            : product.stock > 0
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-rose-500/20 text-rose-400"
                        }`}
                      >
                        {product.stock} Unit
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => openEditModal(product)}
                          className="text-blue-400 hover:text-blue-300 font-bold transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="text-rose-500 hover:text-rose-400 font-bold transition-colors"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
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

      {/* Modal Form Produk */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl custom-scrollbar">
            <div className="p-6 border-b border-gray-700 flex justify-between items-center sticky top-0 bg-gray-800 z-10">
              <h3 className="text-xl font-bold text-white">
                {editingId ? "Edit Detail Produk" : "Tambah Produk Baru"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1">
                  Nama Produk
                </label>
                <input
                  required
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-600 bg-gray-700 text-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-1">
                    Harga (Rp)
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    placeholder="0"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-600 bg-gray-700 text-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-1">
                    Jumlah Stok
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    name="stock"
                    value={formData.stock}
                    onChange={handleInputChange}
                    placeholder="0"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-600 bg-gray-700 text-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1">
                  Path Gambar / URL Eksternal
                </label>
                <input
                  required
                  type="text"
                  name="image"
                  value={formData.image}
                  onChange={handleInputChange}
                  placeholder="Contoh: /products/nama_file.png"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-600 bg-gray-700 text-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Gunakan tautan gambar eksternal atau lokasi file di dalam
                  folder publik proyek Anda.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1">
                  Deskripsi Singkat
                </label>
                <textarea
                  required
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-600 bg-gray-700 text-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all resize-none"
                />
              </div>

              <div className="pt-6 border-t border-gray-700 mt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 bg-transparent border border-gray-500 text-gray-300 hover:bg-gray-700 font-bold rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
                >
                  {isProcessing ? "Menyimpan..." : "Simpan Produk"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
