import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/sections/HeroSection";
import QuizSection from "@/components/sections/QuizSection";
import ShopSection from "@/components/sections/ShopSection";
import AboutSection from "@/components/sections/AboutSection";

export default function Home() {
  return (
    <>
      <main>
        <Header />
        <HeroSection />
        <QuizSection />
        <ShopSection />
        <AboutSection />
        <Footer />
      </main>
    </>
  );
}
