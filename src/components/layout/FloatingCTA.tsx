"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function FloatingCTA() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {open && (
          <motion.div
            key="cta-popup"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-16 right-0 w-48 bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-xl shadow-2xl p-4 space-y-3"
          >
            <a
              href="https://www.instagram.com/andyalfian21?igsh=MW9kbnFydmFlamNhMA=="
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white py-2 px-4 rounded-lg hover:opacity-90 transition"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 24 24"
              >
                <rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line
                  x1="17.5"
                  y1="6.5"
                  x2="17.51"
                  y2="6.5"
                  strokeWidth="2"
                ></line>
              </svg>
              <span>Instagram</span>
            </a>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button
        onClick={() => setOpen(!open)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="w-14 h-14 rounded-full bg-blue-600 dark:bg-cyan-500 text-white shadow-lg flex items-center justify-center hover:shadow-xl transition-all"
        aria-label="Contact Options"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={open ? "close" : "open"}
            initial={{ rotate: -45, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 45, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <i
              className={`fas ${open ? "fa-seedling" : "fa-rocket"} text-2xl`}
            ></i>
          </motion.div>
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
