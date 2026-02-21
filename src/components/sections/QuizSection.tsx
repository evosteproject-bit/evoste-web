"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import SectionContainer from "@/components/layout/SectionContainer";

// Deklarasi Global untuk Google Tag Manager (Opsional tapi bagus untuk Analytics)
declare global {
  interface Window {
    dataLayer: any[];
  }
}

// Tipe Data untuk Logika Kuis
type PerfumeKey =
  | "Citrine Flame"
  | "Ivory Bloom"
  | "Or du Soir"
  | "Oud Legendaire"
  | "Midnight Cherry";

export default function QuizSection() {
  const [step, setStep] = useState(0);
  // Kita simpan skor untuk setiap parfum.
  // Logikanya: Setiap jawaban user akan menambah poin ke salah satu/beberapa parfum.
  const [scores, setScores] = useState<Record<PerfumeKey, number>>({
    "Ivory Bloom": 0,
    "Or du Soir": 0,
    "Oud Legendaire": 0,
    "Midnight Cherry": 0,
    "Citrine Flame": 0,
  });

  const [result, setResult] = useState<PerfumeKey | null>(null);

  // --- DATA PERTANYAAN BERDASARKAN RISET ---
  // Q1: Extraversion vs Introversion (Mensing & Beck, 1988)
  // Q2: Mood Regulation (Calming vs Stimulating)
  // Q3: Fragrance Wheel Preference (Floral/Woody/Fresh/Oriental)
  // Q4: Occasion / Context (Siang/Malam/Formal/Casual)

  const questions = [
    {
      q: "How would you describe your ideal energy?",
      options: [
        { label: "Energetic, Bright & Active", points: ["Citrine Flame"] }, // Extraversion
        { label: "Calm, Warm & Cozy", points: ["Or du Soir"] }, // Introversion/Comfort
        { label: "Romantic, Soft & Graceful", points: ["Ivory Bloom"] }, // Agreeableness
        {
          label: "Bold, Daring & Seductive",
          points: ["Midnight Cherry", "Oud Legendaire"],
        }, // Confidence
      ],
    },
    {
      q: "When do you usually wear perfume?",
      options: [
        {
          label: "Sunny Mornings & Daily Activities",
          points: ["Citrine Flame", "Ivory Bloom"],
        },
        {
          label: "Evening Dates or Night Outs",
          points: ["Midnight Cherry", "Or du Soir"],
        },
        {
          label: "Special Occasions & Formal Events",
          points: ["Oud Legendaire", "Midnight Cherry"],
        },
        {
          label: "Relaxing at Home or Intimate Moments",
          points: ["Or du Soir"],
        },
      ],
    },
    {
      q: "Which scent notes appeal to you most?",
      options: [
        {
          label: "Fresh & Uplifting (Bergamot, Apple, Lychee)",
          points: ["Citrine Flame", "Ivory Bloom"], // Mewakili kesegaran buah dan sitrus
        },
        {
          label: "Warm, Sweet & Gourmand (Vanilla, Coffee, Almond)",
          points: ["Or du Soir", "Midnight Cherry"], // Mewakili aroma manis dan hangat
        },
        {
          label: "Bold Dark Fruits (Cherry Liqueur, Plum)",
          points: ["Midnight Cherry", "Citrine Flame"], // Mewakili buah gelap yang dominan
        },
        {
          label: "Tropical & Exotic (Mango, Passion Fruit, Pineapple)",
          points: ["Oud Legendaire"], // Spesifik untuk aroma tropis Oud Legendaire
        },
        {
          label: "Elegant Floral & Woods (Rose, Saffron, Cedarwood)",
          points: ["Ivory Bloom", "Citrine Flame"], // Mewakili keanggunan bunga dan kayu
        },
      ],
    },
    {
      q: "What impression do you want to leave?",
      options: [
        { label: "Fresh & Approachable", points: ["Citrine Flame"] },
        { label: "Elegant & Memorable", points: ["Ivory Bloom"] },
        { label: "Mysterious & Unique", points: ["Oud Legendaire"] },
        { label: "Warm & Trustworthy", points: ["Or du Soir"] },
        { label: "Sexy & Addictive", points: ["Midnight Cherry"] },
      ],
    },
  ];

  useEffect(() => {
    const savedResult = localStorage.getItem("quizResult");
    if (savedResult) setResult(savedResult as PerfumeKey);
  }, []);

  const handleAnswer = (points: string[]) => {
    const newScores = { ...scores };
    // Tambahkan poin ke parfum yang relevan
    points.forEach((p) => {
      if (newScores[p as PerfumeKey] !== undefined) {
        newScores[p as PerfumeKey] += 1;
      }
    });
    setScores(newScores);

    if (step < questions.length - 1) {
      setStep(step + 1);
    } else {
      calculateResult(newScores);
    }
  };

  const calculateResult = (finalScores: Record<PerfumeKey, number>) => {
    let maxScore = -1;
    let topPerfumes: PerfumeKey[] = [];

    // Evaluasi skor tertinggi dan kumpulkan kandidat yang seri
    (Object.keys(finalScores) as PerfumeKey[]).forEach((key) => {
      if (finalScores[key] > maxScore) {
        maxScore = finalScores[key];
        topPerfumes = [key]; // Reset daftar jika menemukan skor baru yang lebih tinggi
      } else if (finalScores[key] === maxScore) {
        topPerfumes.push(key); // Tambahkan kandidat jika skor sama (seri)
      }
    });

    // Jika terjadi seri, pilih secara acak dari parfum dengan skor tertinggi
    const randomIndex = Math.floor(Math.random() * topPerfumes.length);
    const winner = topPerfumes[randomIndex];

    setResult(winner);
    localStorage.setItem("quizResult", winner);

    // Tracking GTM
    if (typeof window !== "undefined" && window.dataLayer) {
      window.dataLayer.push({
        event: "quiz_complete",
        quiz_result: winner,
      });
    }
  };

  const handleRestart = () => {
    setStep(0);
    setScores({
      "Ivory Bloom": 0,
      "Or du Soir": 0,
      "Oud Legendaire": 0,
      "Midnight Cherry": 0,
      "Citrine Flame": 0,
    });
    setResult(null);
    localStorage.removeItem("quizResult");
  };

  const progress = ((step + 1) / questions.length) * 100;

  const perfumeImages: Record<string, string> = {
    "Midnight Cherry": "/products/mc1.png",
    "Ivory Bloom": "/products/ib1.png",
    "Citrine Flame": "/products/cf1.png",
    "Oud Legendaire": "/products/ol1.png",
    "Or du Soir": "/products/ods1.png",
  };

  const perfumeDescriptions: Record<string, string> = {
    "Midnight Cherry":
      "A bold fusion for the daring soul. Perfect for night outs and making a statement.",
    "Ivory Bloom":
      "Soft, floral elegance. Captures the essence of romance and serenity.",
    "Citrine Flame":
      "Energetic and fresh. A daily booster for the active and optimistic spirit.",
    "Oud Legendaire":
      "Deep and mysterious. For those who value uniqueness and strong character.",
    "Or du Soir":
      "Warm and intimate. Like a cozy embrace of coffee and vanilla.",
  };

  return (
    <SectionContainer
      id="quiz"
      title="Find Your Signature Scent"
      isAlternate={true}
    >
      <div className="relative max-w-3xl mx-auto text-center text-gray-700 dark:text-gray-300 overflow-hidden rounded-2xl">
        {/* Background Animation */}
        <motion.div
          className="absolute inset-0 z-0 opacity-30 blur-2xl bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 dark:from-cyan-600 dark:via-blue-800 dark:to-purple-700"
          animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
          transition={{ duration: 10, ease: "linear", repeat: Infinity }}
          style={{ backgroundSize: "200% 200%" }}
        />

        <div className="relative z-10 p-6 md:p-10">
          {!result && (
            <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full mb-10 overflow-hidden">
              <motion.div
                className="h-2 bg-gradient-to-r from-blue-600 to-cyan-400"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          )}

          <AnimatePresence mode="wait">
            {!result ? (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
              >
                <h3 className="text-2xl font-semibold mb-8 font-orbitron">
                  {questions[step].q}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {questions[step].options.map((opt, idx) => (
                    <motion.button
                      key={idx}
                      onClick={() => handleAnswer(opt.points)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="py-4 px-6 bg-white dark:bg-gray-800 border-2 border-transparent hover:border-blue-500 dark:hover:border-cyan-400 rounded-xl font-medium shadow-md transition-all text-left flex items-center justify-between group"
                    >
                      <span>{opt.label}</span>
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-500">
                        ➜
                      </span>
                    </motion.button>
                  ))}
                </div>
                <p className="mt-8 text-sm opacity-50">
                  Question {step + 1} of {questions.length}
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6 py-8"
              >
                <h3 className="text-2xl font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                  Your Soul Scent Is
                </h3>
                <motion.h2
                  className="text-4xl md:text-5xl font-black text-transparent bg-clip-text py-2 bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-cyan-300 dark:to-blue-500"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  {result}
                </motion.h2>

                <motion.div
                  initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 100, delay: 0.3 }}
                  className="relative mx-auto w-64 h-64 my-5"
                >
                  <div className="absolute inset-0 bg-blue-500/20 dark:bg-cyan-500/20 blur-3xl rounded-full" />
                  <Image
                    src={perfumeImages[result]}
                    alt={result}
                    fill
                    className="object-contain drop-shadow-2xl"
                  />
                </motion.div>

                <p className="text-lg text-gray-700 dark:text-gray-300 max-w-lg mx-auto leading-relaxed italic">
                  &quot;{perfumeDescriptions[result]}&quot;
                </p>

                <motion.div
                  className="flex flex-col md:flex-row justify-center gap-4 mt-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  <a
                    href="#shop"
                    className="px-8 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full font-bold hover:shadow-lg hover:scale-105 transition transform"
                  >
                    Shop Now
                  </a>
                  <button
                    onClick={handleRestart}
                    className="px-8 py-3 bg-transparent border-2 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-full font-bold hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                  >
                    Retake Quiz
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </SectionContainer>
  );
}
