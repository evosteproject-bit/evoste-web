"use client";

import { ReactNode } from "react";
import { motion, Variants } from "framer-motion";

const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 50 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 50, damping: 20 },
  },
};

interface SectionContainerProps {
  id: string;
  title: string;
  children: ReactNode;
  isAlternate?: boolean;
}

export default function SectionContainer({
  id,
  title,
  children,
  isAlternate = false,
}: SectionContainerProps) {
  return (
    <motion.section
      id={id}
      variants={sectionVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      className={`py-24 font-orbitron ${
        isAlternate
          ? "bg-gray-100 dark:bg-gray-800"
          : "bg-white dark:bg-gray-900"
      }`}
    >
      <div className="container mx-auto px-6 max-w-7xl">
        <h2 className="text-4xl md:text-5xl font-extrabold text-center mb-16 text-gray-900 dark:text-cyan-300">
          {title}
        </h2>
        {children}
      </div>
    </motion.section>
  );
}
