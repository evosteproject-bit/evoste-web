import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import FloatingCTA from "@/components/layout/FloatingCTA";
import HeroSection from "@/components/sections/HeroSection";
import QuizSection from "@/components/sections/QuizSection";
import ShopSection from "@/components/sections/ShopSection";
import AboutSection from "@/components/sections/AboutSection";
import HistorySection from "@/components/sections/HistorySection";
import FilosofiSection from "@/components/sections/FilosofiSection";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <QuizSection />
        <ShopSection />
        <AboutSection />
        <HistorySection />
        <FilosofiSection />
      </main>
      <Footer />
      <FloatingCTA />
    </>
  );
}
