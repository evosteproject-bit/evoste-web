// Simple IndexedDB service untuk admin authentication

interface AdminUser {
  id: string;
  name: string;
  email: string;
  password: string; // ⚠️ Hash in production!
  createdAt: string;
}

const DB_NAME = 'EvosteDB';
const STORE_NAME = 'admins';
const DB_VERSION = 1;

let db: IDBDatabase;

// Initialize IndexedDB
export async function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      
      // Create admins store jika belum ada
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('email', 'email', { unique: true });
      }
    };
  });
}

// Register admin baru
export async function registerAdmin(name: string, email: string, password: string): Promise<AdminUser> {
  if (!db) await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const emailIndex = store.index('email');

    // Cek email sudah ada atau belum
    const checkEmail = emailIndex.get(email);

    checkEmail.onsuccess = () => {
      if (checkEmail.result) {
        reject(new Error('Email sudah terdaftar'));
        return;
      }

      // Buat admin baru
      const newAdmin: AdminUser = {
        id: crypto.randomUUID(),
        name,
        email,
        password, // Dalam production, hash password ini!
        createdAt: new Date().toISOString(),
      };

      const addRequest = store.add(newAdmin);

      addRequest.onsuccess = () => {
        console.log('✅ Admin registered:', email);
        resolve(newAdmin);
      };
      addRequest.onerror = () => reject(addRequest.error);
    };

    checkEmail.onerror = () => reject(checkEmail.error);
  });
}

// Login admin
export async function loginAdmin(email: string, password: string): Promise<AdminUser> {
  if (!db) await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const emailIndex = store.index('email');

    const request = emailIndex.get(email);

    request.onsuccess = () => {
      const admin = request.result;

      if (!admin) {
        reject(new Error('Email atau password salah'));
        return;
      }

      // Cek password (dalam production, gunakan bcrypt!)
      if (admin.password !== password) {
        reject(new Error('Email atau password salah'));
        return;
      }

      console.log('✅ Admin login:', email);
      resolve(admin);
    };

    request.onerror = () => reject(request.error);
  });
}

// Get admin by ID
export async function getAdminById(id: string): Promise<AdminUser | null> {
  if (!db) await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

// Get all admins (untuk debug)
export async function getAllAdmins(): Promise<AdminUser[]> {
  if (!db) await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}