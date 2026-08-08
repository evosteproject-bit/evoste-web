"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import SectionContainer from "@/components/layout/SectionContainer";

export default function AboutSection() {
  return (
    <SectionContainer id="about" title="Tentang Saya" isAlternate={true}>
      <div
        className="relative rounded-3xl overflow-hidden"
        style={{
          backgroundImage: "url('/home2.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm" />
        <div className="relative grid md:grid-cols-3 gap-12 items-center text-gray-700 dark:text-gray-300 p-8 md:p-16">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            className="relative h-64 md:h-full rounded-2xl overflow-hidden border-4 border-dashed border-blue-400 dark:border-cyan-500"
          >
            <Image
              src="/about.png"
              alt="Alfian Parfume"
              fill
              className="object-cover"
            />
          </motion.div>
          <div className="md:col-span-2 space-y-6">
            <motion.div
              initial={{ x: 50, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              viewport={{ once: true }}
            >
              <h3 className="text-2xl md:text-3xl font-bold mb-4 dark:text-white">
                Halo, saya Andi Alfian 👋
              </h3>
              <p className="text-base md:text-lg leading-relaxed">
                Saya menjalankan Alfian Parfume sebagai reseller parfum
                personal. Fokus saya adalah menjual parfum original — termasuk
                membawa koleksi Evoste — dengan pelayanan yang bisa langsung
                diajak diskusi soal wangi, occasion, atau budget.
              </p>
            </motion.div>
            <motion.div
              initial={{ x: 50, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              viewport={{ once: true }}
              className="grid sm:grid-cols-3 gap-4 pt-2"
            >
              <div className="bg-white/60 dark:bg-slate-800/60 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
                <p className="text-2xl font-black text-blue-600 dark:text-cyan-400">
                  100%
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-wider font-semibold">
                  Original
                </p>
              </div>
              <div className="bg-white/60 dark:bg-slate-800/60 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
                <p className="text-2xl font-black text-blue-600 dark:text-cyan-400">
                  Personal
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-wider font-semibold">
                  Service
                </p>
              </div>
              <div className="bg-white/60 dark:bg-slate-800/60 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
                <p className="text-2xl font-black text-blue-600 dark:text-cyan-400">
                  Chat
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-wider font-semibold">
                  Ready
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </SectionContainer>
  );
}
