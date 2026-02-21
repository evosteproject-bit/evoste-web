import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mengabaikan error ESLint saat deployment Vercel
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Mengabaikan error tipe data TypeScript saat deployment Vercel
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
