// /lib/firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDk7jZrT7eArI4FD2emfRuiduJfqxHPuZA",
  authDomain: "evoste1.firebaseapp.com",
  projectId: "evoste1",
  storageBucket: "evoste1.firebasestorage.app",
  messagingSenderId: "760732382908",
  appId: "1:760732382908:web:36f5abfa090488511c02b9",
  measurementId: "G-068Y13YSNY"
};

const app = initializeApp(firebaseConfig);

// ✅ Hanya Firestore, tidak perlu Auth
const db = getFirestore(app);

export { app, db };
