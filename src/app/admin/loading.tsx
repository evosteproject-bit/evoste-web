export default function AdminLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-cyan-500 font-bold tracking-widest text-sm font-orbitron animate-pulse">
          MEMUAT DATA...
        </p>
      </div>
    </div>
  );
}
