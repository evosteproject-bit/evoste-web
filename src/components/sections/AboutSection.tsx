"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import SectionContainer from "@/components/layout/SectionContainer";

export default function AboutSection() {
  return (
    <SectionContainer id="about" title="About Us" isAlternate={true}>
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
              alt="About EVOSTE"
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
              <h3 className="text-3xl font-bold mb-4 dark:text-white">
                EVOSTE Vision
              </h3>
              <p className="text-lg leading-relaxed">
                Every drop holds a story. A scent is more than aroma it is
                memory woven into the soul. Guided by the vision “Be Timeless.
                Crafted Your Scent Legacy,” each creation is born to last.
              </p>
            </motion.div>
            <motion.div
              initial={{ x: 50, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              viewport={{ once: true }}
            >
              <p className="text-lg leading-relaxed border-l-4 border-blue-500 dark:border-cyan-500 pl-4 italic">
                Crafted with artistry, every note becomes a chapter of life’s
                journey. From fleeting moments to eternal impressions, it
                preserves what words cannot. Each layer is composed with
                harmony, precision, and depth that endures. It is a silent
                language of presence, confidence, and individuality. Not just to
                be worn, but to be lived and remembered. An invitation to leave
                traces that time itself cannot erase.
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </SectionContainer>
  );
}
