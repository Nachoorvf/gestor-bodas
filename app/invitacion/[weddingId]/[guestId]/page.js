'use client';
import { useState, useEffect } from 'react';
import { db } from '../../../../firebase/config'; // Ajusta la ruta si es necesario
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useParams } from 'next/navigation';

export default function PaginaInvitacion() {
  const { weddingId, guestId } = useParams();
  const [guest, setGuest] = useState(null);
  const [boda, setBoda] = useState(null); // Nuevo: Necesitamos los nombres de los novios
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!weddingId || !guestId) return;

    const fetchData = async () => {
      try {
        // 1. Cargar datos de la boda (para saber nombres de novios y fecha)
        const bodaRef = doc(db, 'weddings', weddingId);
        const bodaSnap = await getDoc(bodaRef);
        
        // 2. Cargar datos del invitado
        const guestRef = doc(db, 'weddings', weddingId, 'guests', guestId);
        const guestSnap = await getDoc(guestRef);

        if (bodaSnap.exists() && guestSnap.exists()) {
          setBoda(bodaSnap.data());
          setGuest(guestSnap.data());
        }
      } catch (error) {
        console.error(error);
      }
      setLoading(false);
    };

    fetchData();
  }, [weddingId, guestId]);

  const responder = async (asiste) => {
    setEnviando(true);
    try {
      const docRef = doc(db, 'weddings', weddingId, 'guests', guestId);
      await updateDoc(docRef, {
        confirmado: asiste,
        bus: asiste ? (guest.bus || false) : false 
      });
      setGuest(prev => ({ ...prev, confirmado: asiste }));
    } catch (error) {
      alert("Error al guardar");
    }
    setEnviando(false);
  };

  const toggleBus = async () => {
    if (!guest.confirmado) return;
    const nuevoEstado = !guest.bus;
    const docRef = doc(db, 'weddings', weddingId, 'guests', guestId);
    await updateDoc(docRef, { bus: nuevoEstado });
    setGuest(prev => ({ ...prev, bus: nuevoEstado }));
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-boda-bg text-boda-green font-bold animate-pulse">Cargando invitación...</div>;
  if (!boda || !guest) return <div className="text-center p-10">Invitación no encontrada</div>;

  return (
    // FONDO GENERAL
    <div className="min-h-screen bg-boda-bg flex items-center justify-center p-4 md:p-8">
      
      {/* TARJETA BLANCA CENTRADA */}
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden relative">
        
        {/* Adorno floral superior (puedes poner una imagen real aquí luego) */}
        <div className="h-32 bg-gradient-to-b from-boda-green-light/30 to-white flex items-center justify-center">
            <span className="text-4xl">🌿</span>
        </div>

        <div className="px-8 pb-10 text-center space-y-6">
            
            {/* CABECERA: FECHA Y NOVIOS */}
            <div>
                <p className="text-boda-text-light text-sm tracking-[0.2em] uppercase font-bold mb-2">
                    {boda.fecha}
                </p>
                <h1 className="font-script text-6xl text-boda-text mb-4 leading-tight">
                    {boda.novios[0]} <span className="text-4xl">&</span> {boda.novios[1]}
                </h1>
                <p className="text-boda-green font-medium tracking-widest text-xs uppercase border-y border-boda-green/30 py-2 inline-block px-4">
                    ¡Nos casamos!
                </p>
            </div>

            {/* BIENVENIDA PERSONALIZADA */}
            <div className="pt-4">
                <h2 className="text-2xl font-serif text-boda-text mb-4">
                    Hola, {guest.nombre}
                </h2>
                <p className="text-boda-text-light text-sm leading-relaxed px-2">
                    Nos haría muy felices que fueras parte de este momento tan especial para nosotros. <br/>
                    <strong>¿Podemos contar contigo?</strong>
                </p>
            </div>

            {/* BOTONES DE CONFIRMACIÓN */}
            <div className="grid grid-cols-2 gap-4 pt-2">
                <button 
                    onClick={() => responder(true)}
                    className={`py-3 rounded-xl border-2 transition-all duration-300 font-bold text-sm ${
                        guest.confirmado === true 
                        ? 'bg-boda-green text-white border-boda-green shadow-lg scale-105' 
                        : 'border-boda-green/30 text-boda-text-light hover:border-boda-green hover:text-boda-green'
                    }`}
                >
                    Sí, asistiré 🥂
                </button>

                <button 
                    onClick={() => responder(false)}
                    className={`py-3 rounded-xl border-2 transition-all duration-300 font-bold text-sm ${
                        guest.confirmado === false 
                        ? 'bg-boda-pink text-white border-boda-pink shadow-lg scale-105' 
                        : 'border-boda-pink/30 text-boda-text-light hover:border-boda-pink hover:text-boda-pink'
                    }`}
                >
                    No podré ir 😢
                </button>
            </div>

            {/* OPCIÓN DE AUTOBÚS (Solo si asiste) */}
            {guest.confirmado === true && (
                <div 
                    onClick={toggleBus}
                    className={`mt-4 p-4 rounded-xl cursor-pointer transition-colors flex items-center justify-between group ${
                        guest.bus ? 'bg-boda-green/10 border border-boda-green/30' : 'bg-gray-50 border border-gray-100'
                    }`}
                >
                    <div className="flex items-center gap-3 text-left">
                        <span className="text-2xl">🚌</span>
                        <div>
                            <p className="text-sm font-bold text-boda-text">Servicio de Autobús</p>
                            <p className="text-xs text-boda-text-light">Ida y vuelta incluida</p>
                        </div>
                    </div>
                    
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                        guest.bus ? 'bg-boda-green border-boda-green' : 'border-gray-300'
                    }`}>
                        {guest.bus && <span className="text-white text-xs">✓</span>}
                    </div>
                </div>
            )}

            {/* Footer */}
            <p className="text-[10px] text-gray-300 pt-8 uppercase tracking-widest">
                Gestor de Bodas 2026
            </p>
        </div>
      </div>
    </div>
  );
}