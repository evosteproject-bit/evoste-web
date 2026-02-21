"use client";

import { motion } from "framer-motion";

export default function HeroSection() {
  return (
    <section
      id="hero"
      className="relative flex items-center justify-center h-[80vh] min-h-[500px] overflow-hidden bg-cover bg-center"
      style={{ backgroundImage: "url('/home1.png')" }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-white via-white/50 to-transparent dark:from-gray-900 dark:via-gray-900/50 dark:to-transparent" />
      <div className="relative z-10 container mx-auto px-10 max-w-7xl text-center">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-6xl md:text-8xl font-black mb-4 text-gray-900 dark:text-white drop-shadow-lg"
        >
          EVOSTE
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-xl md:text-3xl font-light text-blue-600 dark:text-cyan-200 tracking-widest mb-8"
        >
          Be Timeless Crafted Your Scent Legacy
        </motion.p>
        <motion.a
          href="#shop"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 150, delay: 0.4 }}
          className="inline-block px-10 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full font-bold text-lg shadow-xl hover:bg-blue-700 dark:hover:bg-gray-200 transition"
        >
          Explore Now
        </motion.a>
      </div>
    </section>
  );
}
