export default function Footer() {
  return (
    <footer className="py-10 bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 font-orbitron border-t border-gray-200 dark:border-cyan-500/50 transition-colors duration-300">
      <div className="container mx-auto px-6 max-w-7xl text-center">
        <p className="mb-6 text-xl font-black text-blue-600 dark:text-cyan-200">
          EVOSTE
        </p>
        <div className="flex justify-center space-x-8 mb-6 text-sm">
          <a
            href="#shop"
            className="hover:text-blue-600 dark:hover:text-white transition-colors"
          >
            Catalog
          </a>
          <a
            href="#about"
            className="hover:text-blue-600 dark:hover:text-white transition-colors"
          >
            Vision
          </a>
          <a
            href="#"
            className="hover:text-blue-600 dark:hover:text-white transition-colors"
          >
            Contact
          </a>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-500">
          &copy; {new Date().getFullYear()} EVOSTE - Matrix Sync. All Rights
          Reserved.
        </p>
      </div>
    </footer>
  );
}
