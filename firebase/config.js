// Importamos las funciones que necesitamos
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDyj5xeaaBRX1ko1i8flUpUkwxMKpEZOBQ",
  authDomain: "gestorbodas2026.firebaseapp.com",
  projectId: "gestorbodas2026",
  storageBucket: "gestorbodas2026.firebasestorage.app",
  messagingSenderId: "1064155940785",
  appId: "1:1064155940785:web:92fc9f733882c01cf59f90"
};

// Iniciamos Firebase
const app = initializeApp(firebaseConfig);

// Exportamos las herramientas para usarlas en el resto de la app
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();