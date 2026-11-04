// Firebase-free orchestration: reuse ONLY complete, server-confirmed listener data.
export async function loadMesasPrint({ weddingId, getState, getWrites, readServer, onPhase = () => {}, timeoutMs = 15000 }) {
    let timer, phase = 'writes', active = true;
    const initialVersion = getWrites().version;
    const assertStable = () => {
        if (!active) throw new Error('La preparación del documento ha caducado. Vuelve a intentarlo.');
        const writes = getWrites();
        if (writes.failed) throw new Error('Un guardado del editor ha fallado. Recarga y revisa los datos antes de imprimir.');
        if (writes.pending || writes.version !== initialVersion) throw new Error('Hay cambios de mesas sin confirmar. Espera y vuelve a intentarlo.');
    };
    const confirmed = entry => entry && !entry.error && entry.metadata?.fromCache === false && entry.metadata?.hasPendingWrites === false;
    try {
        return await Promise.race([
            (async () => {
                if (getWrites().failed) assertStable();
                const promises = [...getWrites().promises];
                if (promises.length) {
                    onPhase('Esperando a que se guarden los cambios de mesas…');
                    await Promise.all(promises);
                }
                assertStable();
                const state = getState();
                if (state.weddingId === weddingId && ['wedding', 'tables', 'guests'].every(key => confirmed(state[key]))) {
                    if (!state.wedding.data) throw new Error('No se encuentra la boda.');
                    return { wedding: state.wedding.data, tables: state.tables.data, guests: state.guests.data };
                }
                phase = 'read';
                onPhase('Confirmando los datos de la boda con el servidor…');
                const result = await readServer();
                assertStable();
                if (!result.confirmed) throw new Error('Los datos todavía tienen cambios pendientes o proceden de caché. Vuelve a intentarlo.');
                if (!result.wedding) throw new Error('No se encuentra la boda.');
                return result;
            })(),
            new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(phase === 'writes'
                ? 'Los cambios de mesas todavía no se han confirmado. Espera a que termine el guardado y vuelve a intentarlo.'
                : 'El servidor no ha confirmado la lectura de la boda a tiempo. Vuelve a intentarlo.')), timeoutMs); })
        ]);
    } catch (error) {
        if (error.code === 'permission-denied') throw new Error(phase === 'writes'
            ? 'Tu sesión no tiene permiso para guardar estos cambios. Revisa con qué usuario has iniciado sesión.'
            : 'Tu sesión no tiene permiso para leer esta boda. Revisa con qué usuario has iniciado sesión.');
        throw error;
    } finally { active = false; clearTimeout(timer); }
}
