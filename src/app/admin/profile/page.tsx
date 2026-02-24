"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/services/firebaseConfig";

export default function AdminProfilePage() {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    role: "admin",
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data();
            setFormData({
              name: data.name || "",
              email: data.email || user.email || "",
              phone: data.phone || "",
              address: data.address || "",
              role: data.role || "admin",
            });
          }
        } catch (error) {
          console.error("Gagal mengambil profil administrator:", error);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setIsSaving(true);
    try {
      const docRef = doc(db, "users", userId);
      // Hanya mengizinkan pembaruan pada atribut yang aman
      await updateDoc(docRef, {
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
      });
      alert("Profil administrator berhasil diperbarui.");
    } catch (error) {
      alert("Terjadi kesalahan saat menyimpan profil.");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-cyan-400 font-orbitron animate-pulse">
        Memuat otorisasi profil...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-white mb-6">
        Profil Administrator
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Kolom Kiri: Kartu Identitas Visual */}
        <div className="col-span-1">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 flex flex-col items-center text-center shadow-lg">
            <div className="w-24 h-24 bg-cyan-500/20 text-cyan-400 rounded-full flex items-center justify-center text-4xl font-black mb-4 border-2 border-cyan-500/50 uppercase">
              {formData.name ? formData.name.charAt(0) : "A"}
            </div>
            <h3 className="text-xl font-bold text-white mb-1">
              {formData.name || "Admin EVOSTE"}
            </h3>
            <p className="text-sm text-gray-400 mb-4">{formData.email}</p>
            <span className="px-3 py-1 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-full text-xs font-bold uppercase tracking-wider">
              {formData.role}
            </span>
          </div>
        </div>

        {/* Kolom Kanan: Formulir Pembaruan Data */}
        <div className="col-span-1 md:col-span-2">
          <form
            onSubmit={handleSave}
            className="bg-gray-800 border border-gray-700 rounded-2xl p-6 md:p-8 shadow-lg space-y-6"
          >
            <div className="border-b border-gray-700 pb-4 mb-4">
              <h3 className="text-lg font-bold text-white">
                Informasi Pribadi
              </h3>
              <p className="text-sm text-gray-400">
                Perbarui detail kontak operasional Anda.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Email Akun (Read-Only)
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                disabled
                className="w-full px-4 py-3 rounded-lg border border-gray-600 bg-gray-900 text-gray-500 cursor-not-allowed outline-none"
              />
              <p className="text-xs text-gray-500 mt-2">
                Kredensial email diatur langsung melalui Firebase
                Authentication.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-600 bg-gray-700 text-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Nomor Telepon
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-600 bg-gray-700 text-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Alamat Operasional
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-3 rounded-lg border border-gray-600 bg-gray-700 text-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all resize-none"
              />
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-8 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-bold transition-all shadow-lg shadow-cyan-500/30 disabled:opacity-50"
              >
                {isSaving ? "Menyimpan Dokumen..." : "Simpan Pembaruan"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
