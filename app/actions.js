'use server'; // ESTO ES OBLIGATORIO: Indica que este código corre en el servidor

import { authAdmin, dbAdmin } from '../firebase/admin';

// createNewWedding Removed (Unused/Legacy)// ... (Mantén los imports y la función createNewWedding que ya tenías)

export async function deleteWedding(token, weddingId) {
  try {
    // 0. SECURITY CHECK 🛡️
    if (!token) throw new Error("No autenticado");

    // Verify ID Token
    const decodedToken = await authAdmin.verifyIdToken(token);
    const adminUid = decodedToken.uid;

    // Check if user is actually an admin in Firestore
    const adminDoc = await dbAdmin.collection('users').doc(adminUid).get();
    if (!adminDoc.exists || adminDoc.data().role !== 'admin') {
      throw new Error("No autorizado: Requiere permisos de Administrador");
    }

    // 1. LIMPIEZA DE USUARIO (Dueño de la boda)
    const usersSnapshot = await dbAdmin.collection('users')
      .where('weddingId', '==', weddingId)
      .get();

    if (!usersSnapshot.empty) {
      const userDoc = usersSnapshot.docs[0];
      const uid = userDoc.id;
      // Borrar de Auth y de DB
      await authAdmin.deleteUser(uid);
      await dbAdmin.collection('users').doc(uid).delete();
    }

    // 2. LIMPIEZA DE INVITADOS (¡NUEVO!) 🧹
    // Firestore no borra subcolecciones solo, hay que hacerlo a mano.
    const guestsRef = dbAdmin.collection('weddings').doc(weddingId).collection('guests');
    const guestsSnapshot = await guestsRef.get();

    // Usamos un "batch" (lote) para borrar muchos de golpe, es más eficiente
    const batch = dbAdmin.batch();

    guestsSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Ejecutamos el borrado masivo de invitados
    await batch.commit();

    // 3. BORRAR LA BODA
    await dbAdmin.collection('weddings').doc(weddingId).delete();

    return { success: true, message: "Boda, usuarios e invitados eliminados al 100%." };

  } catch (error) {
    console.error("Error al borrar:", error);
    return { success: false, message: "Error borrando: " + error.message };
  }
}