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
      // Usamos un batch para actualizar todos los usuarios asignados a esta boda (normalmente 1)
      const batchUsers = dbAdmin.batch();
      usersSnapshot.docs.forEach(userDoc => {
        batchUsers.update(userDoc.ref, { weddingId: null });
      });
      await batchUsers.commit();
      
      const uid = usersSnapshot.docs[0].id;
      // Borrar la solicitud de boda pendiente/aprobada de este usuario
      const requestsSnapshot = await dbAdmin.collection('wedding_requests')
        .where('userId', '==', uid)
        .get();
        
      if (!requestsSnapshot.empty) {
        const batchReq = dbAdmin.batch();
        requestsSnapshot.docs.forEach(doc => batchReq.delete(doc.ref));
        await batchReq.commit();
      }
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

    return { success: true, message: "Boda eliminada. El usuario ha sido devuelto al lobby." };

  } catch (error) {
    console.error("Error al borrar:", error);
    return { success: false, message: "Error borrando: " + error.message };
  }
}

export async function deleteUserAccount(token, targetUserId) {
  try {
    // 0. SECURITY CHECK 🛡️
    if (!token) throw new Error("No autenticado");
    const decodedToken = await authAdmin.verifyIdToken(token);
    const adminUid = decodedToken.uid;
    const adminDoc = await dbAdmin.collection('users').doc(adminUid).get();
    
    if (!adminDoc.exists || adminDoc.data().role !== 'admin') {
      throw new Error("No autorizado: Requiere permisos de Administrador");
    }

    // 1. OBTENER DATOS DEL USUARIO OBJETIVO
    const targetUserDoc = await dbAdmin.collection('users').doc(targetUserId).get();
    if (!targetUserDoc.exists) {
      throw new Error("El usuario no existe");
    }
    const targetUserData = targetUserDoc.data();
    
    if (targetUserData.role === 'admin') {
      throw new Error("No puedes borrar a un administrador por seguridad.");
    }

    // 2. SI TIENE BODA, BORRARLA (Reutilizamos la lógica, pero como es interna llamamos a las funciones)
    // Para simplificar, si tiene boda llamamos a deleteWedding internamente
    if (targetUserData.weddingId) {
      await deleteWedding(token, targetUserData.weddingId);
    }

    // 3. BORRAR USUARIO DE AUTH Y FIRESTORE
    try {
      await authAdmin.deleteUser(targetUserId);
    } catch (authErr) {
      console.warn("Usuario ya no estaba en Auth:", authErr);
    }
    
    await dbAdmin.collection('users').doc(targetUserId).delete();

    // 4. LIMPIAR SOLICITUDES HUÉRFANAS POR SI ACASO
    const requestsSnapshot = await dbAdmin.collection('wedding_requests')
      .where('userId', '==', targetUserId)
      .get();
      
    if (!requestsSnapshot.empty) {
      const batchReq = dbAdmin.batch();
      requestsSnapshot.docs.forEach(doc => batchReq.delete(doc.ref));
      await batchReq.commit();
    }

    return { success: true, message: "Usuario y todos sus datos han sido eliminados." };

  } catch (error) {
    console.error("Error al borrar usuario:", error);
    return { success: false, message: "Error borrando usuario: " + error.message };
  }
}