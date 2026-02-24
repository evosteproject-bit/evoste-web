"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/services/firebaseConfig";

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  description: string;
  image: string;
}

export default function ShopSection() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Referensi untuk mengontrol pergeseran korsel
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "products"));
      const data: Product[] = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Product);
      });
      data.sort((a, b) => a.name.localeCompare(b.name));
      setProducts(data);
    } catch (error) {
      console.error("Gagal memuat katalog produk:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) {
      alert("Maaf, stok produk ini sedang habis.");
      return;
    }

    const stored = localStorage.getItem("cart");
    let cart = stored ? JSON.parse(stored) : [];

    const existingIndex = cart.findIndex((item: any) => item.id === product.id);

    if (existingIndex >= 0) {
      const currentQty = cart[existingIndex].quantity || 1;
      if (currentQty >= product.stock) {
        alert(
          `Anda tidak dapat menambahkan lebih dari ${product.stock} unit untuk produk ini.`,
        );
        return;
      }
      cart[existingIndex].quantity = currentQty + 1;
    } else {
      cart.push({ ...product, quantity: 1 });
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cartUpdated"));
    alert(`${product.name} berhasil ditambahkan ke keranjang!`);
  };

  const formatIDR = (amount: number) => {
    return new Intl.NumberFormat("id-ID").format(amount);
  };

  // Fungsi navigasi manual untuk desktop
  const scroll = (direction: "left" | "right") => {
    if (carouselRef.current) {
      const scrollAmount = direction === "left" ? -340 : 340; // Perkiraan lebar kartu + celah
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <section
      id="catalog"
      className="py-24 bg-gray-50 dark:bg-[#0f172a] transition-colors duration-300 relative overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12 gap-6">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white font-orbitron tracking-wide mb-4"
          >
            DISCOVER YOUR{" "}
            <span className="text-blue-600 dark:text-cyan-400">SIGNATURE</span>
          </motion.h2>
          <p className="text-gray-500 dark:text-gray-400">
            Jelajahi koleksi eksklusif kami. Setiap produk dirancang untuk
            memberikan identitas karakter yang kuat dan tak terlupakan.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-12 h-12 border-4 border-blue-600 dark:border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-gray-200 dark:border-slate-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Katalog Kosong
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Belum ada produk yang tersedia saat ini.
            </p>
          </div>
        ) : (
          <div className="relative -mx-6 px-6 md:mx-0 md:px-0">
            {/* Area Korsel Utama */}
            <div
              ref={carouselRef}
              className="flex overflow-x-auto gap-6 pb-8 snap-x snap-mandatory hide-scrollbar pt-4"
              style={{
                scrollbarWidth: "none" /* Firefox */,
                msOverflowStyle: "none" /* IE 10+ */,
              }}
            >
              {/* Inject CSS untuk menyembunyikan scrollbar di Webkit (Chrome/Safari) */}
              <style
                dangerouslySetInnerHTML={{
                  __html: `
                .hide-scrollbar::-webkit-scrollbar {
                  display: none;
                }
              `,
                }}
              />

              {products.map((product, index) => {
                const isOutOfStock = product.stock <= 0;

                return (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ delay: index * 0.05 }}
                    // Lebar kartu statis untuk menjamin bentuk korsel
                    className="group min-w-[85vw] sm:min-w-[300px] max-w-[85vw] sm:max-w-[300px] snap-center shrink-0 bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 dark:hover:shadow-cyan-500/10 border border-gray-100 dark:border-slate-700 transition-all duration-300 flex flex-col h-full"
                  >
                    <div className="relative w-full aspect-square mb-6 bg-gray-50 dark:bg-slate-900 rounded-2xl overflow-hidden flex items-center justify-center p-4">
                      <img
                        src={product.image || "/logo.jpeg"}
                        alt={product.name}
                        className={`object-contain w-full h-full absolute inset-0 p-4 transition-transform duration-500 group-hover:scale-110 ${isOutOfStock ? "opacity-50 grayscale" : ""}`}
                        onError={(e) => {
                          e.currentTarget.src = "/logo.jpeg";
                        }}
                      />
                      {isOutOfStock && (
                        <div className="absolute inset-0 flex items-center justify-center z-10">
                          <span className="bg-rose-500 text-white px-4 py-2 rounded-lg font-black tracking-widest uppercase transform -rotate-12 shadow-lg">
                            STOK HABIS
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-1">
                          {product.name}
                        </h3>
                      </div>

                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-4 flex-1">
                        {product.description}
                      </p>
                      {!isOutOfStock && product.stock <= 10 && (
                        <p className="text-xs text-amber-500 font-medium text-center mb-4">
                          Tersisa {product.stock} barang
                        </p>
                      )}
                      <div className="flex justify-between items-end mt-auto pt-4 border-t border-gray-100 dark:border-slate-700">
                        <div>
                          <p className="text-xs text-gray-400 font-semibold mb-1 uppercase tracking-wider">
                            Harga
                          </p>
                          <p className="text-xl font-black text-blue-600 dark:text-cyan-400">
                            Rp {formatIDR(product.price)}
                          </p>
                        </div>

                        <button
                          onClick={() => handleAddToCart(product)}
                          disabled={isOutOfStock}
                          className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all ${
                            isOutOfStock
                              ? "bg-gray-200 dark:bg-slate-700 text-gray-400 cursor-not-allowed"
                              : "bg-gray-900 dark:bg-cyan-500 text-white hover:bg-blue-600 dark:hover:bg-cyan-400 hover:shadow-lg hover:-translate-y-1"
                          }`}
                          title={
                            isOutOfStock ? "Stok Habis" : "Tambah ke Keranjang"
                          }
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
                              d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
            {/* Kontrol Navigasi Desktop (Disembunyikan di Mobile) */}
            <div className="hidden md:flex gap-3 content-center justify-center items-center">
              <button
                onClick={() => scroll("left")}
                className="w-12 h-12 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white hover:bg-blue-50 dark:hover:bg-cyan-900/30 transition-colors shadow-sm"
                aria-label="Geser ke kiri"
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
                    d="M15.75 19.5L8.25 12l7.5-7.5"
                  />
                </svg>
              </button>
              <button
                onClick={() => scroll("right")}
                className="w-12 h-12 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white hover:bg-blue-50 dark:hover:bg-cyan-900/30 transition-colors shadow-sm"
                aria-label="Geser ke kanan"
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
                    d="M8.25 4.5l7.5 7.5-7.5 7.5"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
