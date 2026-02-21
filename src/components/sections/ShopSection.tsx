"use client";

import { useState, MouseEvent } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { products, Product } from "@/lib/data";
import SectionContainer from "@/components/layout/SectionContainer";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/Icons";

// 1. Tambahkan Interface baru untuk CartItem yang mendukung kuantitas
export interface CartItem extends Product {
  quantity: number;
}

export default function ShopSection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  const [popupProduct, setPopupProduct] = useState<Product | null>(null);

  // State baru untuk menampilkan detail di Popup
  const [popupQuantity, setPopupQuantity] = useState(0);
  const [popupSubtotal, setPopupSubtotal] = useState("");

  const currentProduct = products[currentIndex];

  const handleBuyClick = async (e: MouseEvent<HTMLButtonElement>) => {
    window.dispatchEvent(new Event("cartPing"));

    const cartIcon = document.querySelector(".cart-icon");
    if (cartIcon) {
      const img = document.createElement("img");
      img.src = currentProduct.image;
      img.className =
        "fixed w-24 h-24 object-cover rounded-full z-[999] transition-all duration-700 ease-in-out pointer-events-none";
      img.style.left = `${e.clientX - 48}px`;
      img.style.top = `${e.clientY - 48}px`;
      document.body.appendChild(img);
      setTimeout(() => {
        const rect = cartIcon.getBoundingClientRect();
        img.style.left = `${rect.left + rect.width / 2 - 20}px`;
        img.style.top = `${rect.top + rect.height / 2 - 20}px`;
        img.style.opacity = "0";
        img.style.transform = "scale(0.2)";
      }, 100);
      setTimeout(() => img.remove(), 800);
    }

    // 2. Logika Penambahan Quantity
    const currentCart: CartItem[] = JSON.parse(
      localStorage.getItem("cart") || "[]",
    );

    // Cari apakah produk sudah ada di keranjang
    const existingItemIndex = currentCart.findIndex(
      (item) => item.id === currentProduct.id,
    );
    let newQuantity = 1;

    if (existingItemIndex >= 0) {
      // Jika ada, tambahkan quantity
      currentCart[existingItemIndex].quantity += 1;
      newQuantity = currentCart[existingItemIndex].quantity;
    } else {
      // Jika belum ada, masukkan dengan quantity 1
      currentCart.push({ ...currentProduct, quantity: 1 });
    }

    localStorage.setItem("cart", JSON.stringify(currentCart));
    window.dispatchEvent(new Event("cartUpdated"));

    // 3. Kalkulasi harga untuk ditampilkan di Popup
    const numericPrice = Number(currentProduct.price.replace(/\./g, ""));
    const totalItemPrice = numericPrice * newQuantity;

    setPopupQuantity(newQuantity);
    setPopupSubtotal(new Intl.NumberFormat("id-ID").format(totalItemPrice));

    setPopupProduct(currentProduct);
    setShowPopup(true);

    // CATATAN: Kode addDoc ke koleksi "orders" DIHAPUS dari sini.
    // Pembuatan order hanya boleh dilakukan di saat proses Checkout (di Header/Cart),
    // bukan saat sekadar menambahkan produk ke keranjang.
  };

  return (
    <SectionContainer id="shop" title="Find Your Essence">
      <p className="max-w-4xl mx-auto text-center text-lg mb-12 text-gray-700 dark:text-gray-300">
        Fragrance is more than a scent; it is a story, a memory, and a
        signature. Each creation is made to define you.
      </p>
      <div className="relative flex items-center justify-center">
        <motion.button
          onClick={() =>
            setCurrentIndex(
              (prev) => (prev - 1 + products.length) % products.length,
            )
          }
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="absolute left-0 md:-left-16 p-3 z-30 rounded-full bg-blue-600 dark:bg-cyan-500 text-white shadow-xl"
        >
          <ChevronLeftIcon className="w-6 h-6" />
        </motion.button>
        <div className="relative w-full max-w-5xl p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentProduct.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="grid md:grid-cols-2 gap-10 items-center"
            >
              <div className="relative h-80 md:h-96 rounded-2xl overflow-hidden border border-gray-300/30 dark:border-gray-600/40 shadow-[0_4px_20px_rgba(0,0,0,0.08)] backdrop-blur-sm transition-all duration-500 hover:shadow-[0_8px_40px_rgba(0,0,0,0.15)] ">
                <Image
                  src={currentProduct.image}
                  alt={currentProduct.name}
                  fill
                  className="object-cover transition-transform duration-500 hover:scale-105"
                />
              </div>
              <div className="text-left space-y-4">
                <h3 className="text-3xl font-bold dark:text-white">
                  {currentProduct.name}
                </h3>
                <p className="text-md text-gray-600 dark:text-gray-400 leading-relaxed">
                  {currentProduct.desc}
                </p>
                <p className="text-3xl font-black text-blue-500 dark:text-cyan-400">
                  Rp {currentProduct.price}
                </p>
                <motion.button
                  onClick={handleBuyClick}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full md:w-auto px-10 py-4 bg-blue-600 text-white rounded-full font-bold shadow-lg shadow-blue-500/50 dark:bg-cyan-500 dark:shadow-cyan-500/50 transition-all"
                >
                  Buy Now
                </motion.button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
        <motion.button
          onClick={() =>
            setCurrentIndex((prev) => (prev + 1) % products.length)
          }
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="absolute right-0 md:-right-16 p-3 z-30 rounded-full bg-blue-600 dark:bg-cyan-500 text-white shadow-xl"
        >
          <ChevronRightIcon className="w-6 h-6" />
        </motion.button>
      </div>
      <AnimatePresence>
        {showPopup && popupProduct && (
          <motion.div
            key="cart-product-popup"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ y: 20 }}
              animate={{ y: 0 }}
              exit={{ y: 20 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center"
            >
              <h3 className="text-2xl font-bold dark:text-white mb-4">
                Added to Cart 🛒
              </h3>
              <Image
                src={popupProduct.image}
                alt={popupProduct.name}
                width={160}
                height={160}
                className="object-cover mx-auto rounded-lg mb-4"
              />
              <p className="font-semibold text-lg dark:text-white">
                {popupProduct.name}
              </p>

              {/* 4. Tampilkan Quantity dan Total Subtotal Item di Popup */}
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg my-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Total in Cart
                </p>
                <p className="text-xl font-bold text-gray-800 dark:text-gray-200">
                  {popupQuantity}x
                </p>
                <p className="text-blue-500 dark:text-cyan-400 text-xl font-bold mt-1">
                  Rp {popupSubtotal}
                </p>
              </div>

              <button
                onClick={() => setShowPopup(false)}
                className="w-full py-3 bg-blue-600 dark:bg-cyan-500 text-white rounded-full font-semibold transition"
              >
                Continue Shopping
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </SectionContainer>
  );
}
