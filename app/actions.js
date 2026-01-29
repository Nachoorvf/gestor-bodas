'use server'; // ESTO ES OBLIGATORIO: Indica que este código corre en el servidor

import { authAdmin, dbAdmin } from '../firebase/admin';

export async function createNewWedding(data) {
  const DOMINIO = '@boda.com';
  const emailCompleto = data.usuario + DOMINIO;

  try {
    // 1. Crear el usuario en Firebase Authentication (El Portero)
    const userRecord = await authAdmin.createUser({
      email: emailCompleto,
      password: data.password,
      displayName: `${data.nombre1} & ${data.nombre2}`
    });

    const uid = userRecord.uid; // El ID único que Firebase le ha dado

    // 2. Crear la boda en la base de datos (Colección 'weddings')
    // Creamos un ID bonito para la boda (ej: juan-y-maria)
    const weddingId = data.usuario; 
    
    await dbAdmin.collection('weddings').doc(weddingId).set({
      novios: [data.nombre1, data.nombre2],
      fecha: data.fecha,
      creadoEn: new Date().toISOString(),
      invitados: [] // Lista vacía por ahora
    });

    // 3. Crear el perfil del usuario (Colección 'users')
    // Aquí es donde le decimos que NO es admin, sino 'couple' (novios)
    await dbAdmin.collection('users').doc(uid).set({
      role: 'couple',     // ROL CLAVE
      weddingId: weddingId, // Vinculamos al usuario con SU boda
      email: emailCompleto
    });

    // Si todo va bien, devolvemos éxito
    return { success: true, message: `Boda de ${data.nombre1} y ${data.nombre2} creada correctamente.` };

  } catch (error) {
    console.error("Error creando boda:", error);
    // Devolvemos el error para mostrarlo en pantalla
    return { success: false, message: error.message };
  }
}// ... (Mantén los imports y la función createNewWedding que ya tenías)

export async function deleteWedding(weddingId) {
  try {
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