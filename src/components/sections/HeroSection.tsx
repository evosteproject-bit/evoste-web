"use client";

import { motion } from "framer-motion";

export default function HeroSection() {
  return (
    <section
      id="hero"
      className="relative flex items-center justify-center h-[80vh] min-h-[100lvh] overflow-hidden bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100 dark:from-slate-950 dark:via-blue-950 dark:to-slate-900 transition-colors duration-300"
    >
      {/* Decorative blobs — bukan foto, full CSS */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-[28rem] h-[28rem] rounded-full bg-blue-400/30 dark:bg-cyan-500/20 blur-3xl" />
        <div className="absolute top-1/3 -right-32 w-[26rem] h-[26rem] rounded-full bg-cyan-400/25 dark:bg-blue-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-[24rem] h-[24rem] rounded-full bg-indigo-400/20 dark:bg-cyan-400/10 blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-10 max-w-7xl text-center">
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-block mb-6 px-4 py-1.5 rounded-full bg-blue-100/70 dark:bg-cyan-500/10 border border-blue-200 dark:border-cyan-500/30 text-xs md:text-sm font-bold tracking-widest text-blue-700 dark:text-cyan-300 uppercase"
        >
          Personal Reseller · Personal Service
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-5xl md:text-8xl font-black mb-4 text-gray-900 dark:text-white drop-shadow-lg"
        >
          ALFIAN PARFUME
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-base md:text-xl font-light text-blue-600 dark:text-cyan-200 tracking-widest mb-10 max-w-3xl mx-auto"
        >
          Koleksi parfum pilihan · Reseller Evoste & parfum original
        </motion.p>
        <motion.a
          href="#catalog"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 150, delay: 0.4 }}
          className="inline-block px-10 py-4 bg-blue-600 hover:bg-blue-700 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white rounded-full font-bold text-lg shadow-xl shadow-blue-500/30 dark:shadow-cyan-500/30 transition"
        >
          Explore Now
        </motion.a>
      </div>
    </section>
  );
}
