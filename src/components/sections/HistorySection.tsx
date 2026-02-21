"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import SectionContainer from "@/components/layout/SectionContainer";

const TimelineEvent = ({
  year,
  title,
  children,
}: {
  year: string;
  title: string;
  children: ReactNode;
}) => (
  <motion.div
    initial={{ x: -100, opacity: 0 }}
    whileInView={{ x: 0, opacity: 1 }}
    transition={{ duration: 0.6 }}
    viewport={{ once: true }}
    className="relative md:w-1/2 md:even:ml-auto md:odd:pr-8 md:even:pl-8"
  >
    <div className="absolute top-0 -left-[23px] w-5 h-5 bg-blue-600 dark:bg-cyan-500 rounded-full z-10 md:left-1/2 md:-translate-x-1/2"></div>
    <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-800">
      <h4 className="text-xl font-bold mb-2 text-blue-600 dark:text-cyan-400">
        {year} - {title}
      </h4>
      <p className="text-sm text-gray-600 dark:text-gray-400">{children}</p>
    </div>
  </motion.div>
);

export default function HistorySection() {
  return (
    <SectionContainer id="history" title="Our History">
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="max-w-4xl mx-auto"
      >
        <div className="space-y-36 relative before:content-[''] before:absolute before:left-1/2 before:-translate-x-1/2 before:top-0 before:bottom-0 before:w-1 before:bg-gray-200 dark:before:bg-gray-700">
          <TimelineEvent year="2000" title="A Timeless Beginning">
            The story began with a vision to create perfumes that are more than
            just scents they are timeless legacies. EVOSTE was born to redefine
            how fragrance captures emotion and memory.
          </TimelineEvent>
          <TimelineEvent year="2008" title="Crafting with Soul">
            Over the years, only the finest and most unique ingredients were
            carefully selected, ensuring each creation carried authenticity,
            elegance, and depth.
          </TimelineEvent>
          <TimelineEvent year="2015" title="The Art of Composition">
            Each variant is the result of years of dedication blending more than
            200 carefully chosen notes into a single harmonious composition.
          </TimelineEvent>
          <TimelineEvent year="2023" title="Be Timeless. Craft Your Legacy.">
            Today, the collection stands as a testament to that vision. With the
            philosophy <em>“Be Timeless. Craft Your Scent Legacy,”</em> every
            creation is designed to transcend time.
          </TimelineEvent>
        </div>
      </motion.div>
    </SectionContainer>
  );
}
