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

export const dbAdmin = admin.firestore();
export const authAdmin = admin.auth();