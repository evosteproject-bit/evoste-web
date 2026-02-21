export default function Footer() {
  return (
    <footer className="py-10 bg-gray-900 dark:bg-black text-gray-400 font-orbitron border-t border-blue-600/50 dark:border-cyan-500/50">
      <div className="container mx-auto px-6 max-w-7xl text-center">
        <p className="mb-6 text-xl font-black text-blue-500 dark:text-cyan-200">
          EVOSTE
        </p>
        <div className="flex justify-center space-x-8 mb-6 text-sm">
          <a href="#shop" className="hover:text-white">
            Catalog
          </a>
          <a href="#about" className="hover:text-white">
            Vision
          </a>
          <a href="#" className="hover:text-white">
            Contact
          </a>
        </div>
        <p className="text-xs">
          &copy; {new Date().getFullYear()} EVOSTE - Matrix Sync. All Rights
          Reserved.
        </p>
      </div>
    </footer>
  );
}
