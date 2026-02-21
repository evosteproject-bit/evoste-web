"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  initDB,
  loginAdmin,
  registerAdmin,
  getAdminById,
} from "@/services/adminStorage";

interface Admin {
  id: string;
  name: string;
  email: string;
}

interface AdminContextType {
  admin: Admin | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error("useAdmin must be used within AdminProvider");
  }
  return context;
};

export const AdminProvider = ({ children }: { children: ReactNode }) => {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ Initialize DB dan check stored admin
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Initialize IndexedDB
        await initDB();

        // Check if ada admin di localStorage
        const storedAdminId = localStorage.getItem("adminId");
        if (storedAdminId) {
          const adminData = await getAdminById(storedAdminId);
          if (adminData) {
            setAdmin({
              id: adminData.id,
              name: adminData.name,
              email: adminData.email,
            });
          } else {
            // Admin data tidak ada, hapus stored ID
            localStorage.removeItem("adminId");
          }
        }
      } catch (error) {
        console.error("❌ Error initializing auth:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const register = async (name: string, email: string, password: string) => {
    try {
      const newAdmin = await registerAdmin(name, email, password);

      // Save admin ID to localStorage
      localStorage.setItem("adminId", newAdmin.id);

      setAdmin({
        id: newAdmin.id,
        name: newAdmin.name,
        email: newAdmin.email,
      });

      console.log("✅ Registration successful");
    } catch (error: any) {
      console.error("❌ Register error:", error.message);
      throw new Error(error.message || "Registration failed");
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const adminData = await loginAdmin(email, password);

      // Save admin ID to localStorage
      localStorage.setItem("adminId", adminData.id);

      setAdmin({
        id: adminData.id,
        name: adminData.name,
        email: adminData.email,
      });

      console.log("✅ Login successful");
    } catch (error: any) {
      console.error("❌ Login error:", error.message);
      throw new Error(error.message || "Login failed");
    }
  };

  const logout = async () => {
    try {
      localStorage.removeItem("adminId");
      setAdmin(null);
      console.log("✅ Logout successful");
    } catch (error: any) {
      console.error("❌ Logout error:", error.message);
      throw new Error(error.message || "Logout failed");
    }
  };

  return (
    <AdminContext.Provider value={{ admin, loading, login, register, logout }}>
      {children}
    </AdminContext.Provider>
  );
};
