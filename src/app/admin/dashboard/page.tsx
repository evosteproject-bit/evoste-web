"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdmin } from "@/app/context/AdminContext";
import { motion, AnimatePresence } from "framer-motion";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/services/firebaseConfig";

interface Transaction {
  id: string;
  orderId: string;
  total: number;
  status: string;
  createdAt: any;
  items: any[];
}

// Ikon
const Icons = {
  Total: () => (
    <svg
      className="w-6 h-6 text-blue-600"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
      />
    </svg>
  ),
  Pending: () => (
    <svg
      className="w-6 h-6 text-amber-600"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  Completed: () => (
    <svg
      className="w-6 h-6 text-emerald-600"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  Failed: () => (
    <svg
      className="w-6 h-6 text-rose-600"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  Revenue: () => (
    <svg
      className="w-8 h-8 text-cyan-400"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
};

export default function AdminDashboard() {
  const router = useRouter();
  const { admin, loading: authLoading, logout } = useAdmin();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [newTransactionNotif, setNewTransactionNotif] = useState<string | null>(
    null,
  );

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (!authLoading && !admin) {
      router.push("/admin/login");
    }
  }, [admin, authLoading, router]);

  // Reset pagination ke halaman 1 setiap kali filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  // Firestore listener
  useEffect(() => {
    if (!admin) return;

    const ordersRef = collection(db, "orders");
    const q = query(ordersRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newTransactions = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Transaction[];

      setTransactions(newTransactions);
      setLoading(false);

      // Notifikasi
      newTransactions.forEach((tx) => {
        if (
          tx.status === "settlement" &&
          !localStorage.getItem(`notif-${tx.id}`)
        ) {
          setNewTransactionNotif(tx.orderId);
          localStorage.setItem(`notif-${tx.id}`, "true");
          setTimeout(() => setNewTransactionNotif(null), 5000);
        }
      });
    });

    return () => unsubscribe();
  }, [admin]);

  // Logika Filter & Pagination
  const filteredTransactions = transactions.filter(
    (t) => filter === "all" || t.status === filter,
  );

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentTransactions = filteredTransactions.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  const stats = {
    total: transactions.length,
    pending: transactions.filter((t) => t.status === "pending").length,
    completed: transactions.filter((t) => t.status === "settlement").length,
    failed: transactions.filter((t) => t.status === "failed").length,
  };

  const totalRevenue = transactions
    .filter((t) => t.status === "settlement")
    .reduce((sum, t) => sum + (typeof t.total === "number" ? t.total : 0), 0);

  const formatIDR = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (authLoading)
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );

  if (!admin) return null;

  return (
    <div className="min-h-screen text-slate-500 font-sans bg-gray-800">
      {/* Toast Notification */}
      <AnimatePresence>
        {newTransactionNotif && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-6 right-6 bg-slate-900 text-white px-6 py-4 rounded-xl shadow-2xl z-50 flex items-center gap-3 border border-slate-700"
          >
            <div className="bg-emerald-500 rounded-full p-1">
              <Icons.Completed />
            </div>
            <div>
              <p className="text-sm font-semibold">Payment Received</p>
              <p className="text-xs text-slate-300 font-mono">
                {newTransactionNotif}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="bg-gray-900 border-b border-slate-200 sticky top-0 z-30 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-900 text-white rounded-lg flex items-center justify-center font-bold text-xl tracking-tighter">
              EV
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">
                EVOSTE Portal
              </h1>
              <p className="text-sm text-slate-500 font-medium">
                Welcome back, {admin.name}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="text-sm font-medium text-white hover:text-rose-600 px-4 py-2 rounded-lg hover:bg-rose-50 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Revenue Hero Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 rounded-2xl p-8 mb-8 shadow-xl shadow-slate-900/10 border border-slate-800 relative overflow-hidden"
        >
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-slate-400 font-medium mb-1">
                Total Net Revenue (Settled)
              </p>
              <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">
                {formatIDR(totalRevenue)}
              </h2>
            </div>
            <div className="hidden md:flex bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
              <Icons.Revenue />
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {[
            {
              label: "Total Orders",
              value: stats.total,
              icon: <Icons.Total />,
              bg: "bg-blue-50",
            },
            {
              label: "Pending",
              value: stats.pending,
              icon: <Icons.Pending />,
              bg: "bg-amber-50",
            },
            {
              label: "Completed",
              value: stats.completed,
              icon: <Icons.Completed />,
              bg: "bg-emerald-50",
            },
            {
              label: "Failed",
              value: stats.failed,
              icon: <Icons.Failed />,
              bg: "bg-rose-50",
            },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow"
            >
              <div className={`p-4 rounded-xl ${stat.bg}`}>{stat.icon}</div>
              <div>
                <p className="text-sm font-medium text-slate-500">
                  {stat.label}
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {stat.value}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Filters & Data Table Area */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col">
          <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50 rounded-t-2xl">
            <h2 className="text-lg font-bold text-slate-900">
              Recent Transactions
            </h2>
            <div className="flex bg-slate-100 p-1 rounded-xl w-max">
              {["all", "pending", "settlement", "failed"].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    filter === status
                      ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="px-6 py-4">Order ID</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Items</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-12 text-center text-slate-500"
                    >
                      <div className="flex flex-col items-center gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
                        <p>Loading transactions...</p>
                      </div>
                    </td>
                  </tr>
                ) : currentTransactions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-12 text-center text-slate-500"
                    >
                      <p className="text-lg">No transactions found</p>
                      <p className="text-sm">
                        Try changing your filter settings.
                      </p>
                    </td>
                  </tr>
                ) : (
                  currentTransactions.map((tx, i) => {
                    const total = typeof tx.total === "number" ? tx.total : 0;
                    const createdDate =
                      tx.createdAt?.toDate?.() || new Date(tx.createdAt);

                    const formattedDate = new Intl.DateTimeFormat("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(createdDate);

                    return (
                      <motion.tr
                        key={tx.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm font-medium text-slate-700 group-hover:text-slate-900">
                            {tx.orderId || "N/A"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {formattedDate}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                          {tx.items?.length || 0}{" "}
                          <span className="text-slate-400 font-normal">
                            items
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-900">
                          {formatIDR(total)}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ring-1 ring-inset ${
                              tx.status === "settlement"
                                ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
                                : tx.status === "pending"
                                  ? "bg-amber-50 text-amber-700 ring-amber-600/20"
                                  : "bg-rose-50 text-rose-700 ring-rose-600/20"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                tx.status === "settlement"
                                  ? "bg-emerald-500"
                                  : tx.status === "pending"
                                    ? "bg-amber-500"
                                    : "bg-rose-500"
                              }`}
                            ></span>
                            {tx.status === "settlement"
                              ? "Paid"
                              : tx.status.charAt(0).toUpperCase() +
                                tx.status.slice(1)}
                          </span>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalPages > 0 && (
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between rounded-b-2xl">
              <span className="text-sm text-slate-500">
                Showing{" "}
                <span className="font-medium text-slate-900">
                  {filteredTransactions.length === 0 ? 0 : startIndex + 1}
                </span>{" "}
                to{" "}
                <span className="font-medium text-slate-900">
                  {Math.min(
                    startIndex + itemsPerPage,
                    filteredTransactions.length,
                  )}
                </span>{" "}
                of{" "}
                <span className="font-medium text-slate-900">
                  {filteredTransactions.length}
                </span>{" "}
                results
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 border border-slate-200 bg-white text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <div className="text-sm text-slate-600 font-medium px-2">
                  Page {currentPage} of {totalPages}
                </div>
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 border border-slate-200 bg-white text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
