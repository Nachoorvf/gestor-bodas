import admin from 'firebase-admin';

// CONFIGURACIÓN PARA VERCEL (PRODUCCIÓN)
// Usamos variables de entorno para no subir archivos secretos
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  // ESTO ES CLAVE: Vercel a veces estropea los saltos de línea (\n), esto lo arregla:
  privateKey: process.env.FIREBASE_PRIVATE_KEY 
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') 
    : undefined,
};

if (!admin.apps.length) {
  // Si estamos en Vercel y tenemos las variables, usamos esto:
  if (serviceAccount.projectId) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } 
  // Si estamos en tu ordenador y tienes el archivo json (opcional para el futuro)
  else {
    try {
      const serviceAccountJson = require("./service-account.json");
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccountJson)
      });
    } catch (e) {
      console.error("No se encontraron credenciales de Admin.");
    }
  }
}

// En vez de exportar directamente las instancias (lo que crashea si falla initializeApp),
// exportamos funciones getter o comprobamos si hay apps inicializadas.

let dbAdmin;
let authAdmin;

if (admin.apps.length > 0) {
    dbAdmin = admin.firestore();
    authAdmin = admin.auth();
} else {
    // Si no hay app inicializada, creamos proxies o funciones que lancen el error solo al USARLAS, no al IMPORTARLAS.
    const throwError = () => { throw new Error("Firebase Admin no está inicializado. Falta el archivo service-account.json."); };
    dbAdmin = { collection: throwError, batch: throwError };
    authAdmin = { verifyIdToken: throwError, deleteUser: throwError };
}

export { dbAdmin, authAdmin };