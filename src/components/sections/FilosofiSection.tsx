"use client";

import { motion } from "framer-motion";
import SectionContainer from "@/components/layout/SectionContainer";

export default function FilosofiSection() {
  return (
    <SectionContainer
      id="philosophy"
      title="Philosophy: The Essences"
      isAlternate={true}
    >
      <div className="relative max-w-5xl mx-auto text-center space-y-10 px-8 py-12 leading-relaxed">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-2xl md:text-3xl font-semibold italic text-gray-900 dark:text-white"
        >
          Perfume is not merely worn; it is lived, remembered, and passed on.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          viewport={{ once: true }}
          className="space-y-6 text-lg md:text-xl font-light text-gray-700 dark:text-gray-300"
        >
          <p>
            We believe that scent is an eternal trace that lingers in memory.
            Each drop carries a story, every layer unfolds a journey, and every
            impression becomes a legacy.
          </p>
          <p>
            Guided by the vision{" "}
            <em>“Be Timeless. Craft Your Scent Legacy,”</em> every creation is
            designed to transcend time, weaving fleeting moments into memories
            that never fade. Parfume is not only meant to be worn, but to be
            lived as an unspoken language, as a presence that leaves a mark, and
            as a legacy passed from one generation to the next.
          </p>
        </motion.div>
      </div>
    </SectionContainer>
  );
}
