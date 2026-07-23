export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f172a] flex items-center justify-center transition-colors duration-300">
      <div className="flex flex-col items-center gap-5">
        <div className="w-14 h-14 border-4 border-blue-600 dark:border-cyan-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-bold tracking-widest text-gray-500 dark:text-cyan-300 font-orbitron animate-pulse">
          EVOSTE...
        </p>
      </div>
    </div>
  );
}
