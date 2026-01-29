'use client';
import { useState, useEffect } from 'react';
import { db } from '../../../../firebase/config';
import { collection, onSnapshot, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function AdminWeddingView() {
  const { id } = useParams();
  const [guests, setGuests] = useState([]);
  const [bodaInfo, setBodaInfo] = useState(null);

  // 1. Cargar datos de la boda
  useEffect(() => {
    const getBoda = async () => {
        const docRef = doc(db, 'weddings', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            setBodaInfo(docSnap.data());
        }
    };
    getBoda();
  }, [id]);

  // 2. Cargar invitados en tiempo real
  useEffect(() => {
    const q = query(collection(db, 'weddings', id, 'guests'), orderBy('creadoEn', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setGuests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [id]);

  // Cálculos estadísticos
  const totalInvitados = guests.length;
  const confirmados = guests.filter(g => g.confirmado === true).length;
  const autobus = guests.filter(g => g.bus === true).length;
  
  // Cálculo de porcentaje para la barra
  const porcentaje = totalInvitados > 0 ? (confirmados / totalInvitados) * 100 : 0;

  if (!bodaInfo) return <div className="min-h-screen bg-boda-bg flex items-center justify-center text-boda-green font-bold animate-pulse">Cargando datos...</div>;

  return (
    <div className="min-h-screen bg-boda-bg p-8">
      <div className="max-w-5xl mx-auto">
        
        {/* BOTÓN VOLVER */}
        <Link href="/admin" className="inline-flex items-center gap-2 text-boda-text-light hover:text-boda-green font-bold text-sm mb-6 transition-colors">
          ← Volver al Panel General
        </Link>
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 pb-6 border-b border-boda-green/10">
          <div>
            <p className="text-xs uppercase tracking-widest text-boda-text-light mb-2">Supervisando Boda</p>
            <h1 className="text-5xl font-script text-boda-green">
                {bodaInfo.novios[0]} <span className="text-3xl text-boda-text-light">&</span> {bodaInfo.novios[1]}
            </h1>
          </div>
          <div className="mt-4 md:mt-0 text-right">
             <span className="bg-white border border-gray-200 px-4 py-2 rounded-xl text-boda-text-light text-xs font-mono">
                ID: {id}
             </span>
          </div>
        </div>

        {/* ESTADÍSTICAS RÁPIDAS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-boda-green/10 text-center">
              <p className="text-boda-text-light uppercase text-[10px] font-bold tracking-wider mb-2">Total Invitados</p>
              <p className="text-4xl font-serif text-boda-text">{totalInvitados}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-boda-green/10 text-center">
              <p className="text-boda-text-light uppercase text-[10px] font-bold tracking-wider mb-2">Confirmados</p>
              <p className="text-4xl font-serif text-boda-green">{confirmados}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-boda-green/10 text-center">
              <p className="text-boda-text-light uppercase text-[10px] font-bold tracking-wider mb-2">Autobús</p>
              <p className="text-4xl font-serif text-purple-400">{autobus}</p>
          </div>
          {/* Barra Circular o Progreso */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-boda-green/10 flex flex-col justify-center items-center">
              <p className="text-boda-text-light uppercase text-[10px] font-bold tracking-wider mb-2">Participación</p>
              <div className="relative w-12 h-12 flex items-center justify-center">
                 <svg className="w-full h-full" viewBox="0 0 36 36">
                    <path className="text-gray-100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                    <path className="text-boda-green" strokeDasharray={`${porcentaje}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                 </svg>
                 <span className="absolute text-[10px] font-bold text-boda-text">{Math.round(porcentaje)}%</span>
              </div>
          </div>
        </div>

        {/* LISTA DE INVITADOS */}
        <div className="bg-white p-8 rounded-3xl shadow-xl border-t-8 border-boda-green/20">
            <h2 className="font-serif text-xl text-boda-text mb-6">Detalle de Invitados</h2>
            
            <div className="flex flex-col gap-2">
                {guests.map(guest => (
                    <div key={guest.id} className="border-b border-gray-50 last:border-0 p-4 flex justify-between items-center hover:bg-boda-bg/30 rounded-lg transition-colors">
                        <div className="flex items-center gap-3">
                            {/* Bolita de estado */}
                            <div className={`w-2 h-2 rounded-full ${
                                guest.confirmado === true ? 'bg-green-500' : 
                                guest.confirmado === false ? 'bg-red-400' : 'bg-gray-300'
                            }`}></div>
                            
                            <div>
                                <span className="font-bold text-boda-text block">{guest.nombre}</span>
                                <span className="text-[10px] text-gray-400 uppercase tracking-widest">
                                    {guest.id.substring(0, 6)}...
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 text-sm">
                            {guest.confirmado === true && (
                                <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-bold border border-green-100">
                                    Asiste
                                </span>
                            )}
                            {guest.confirmado === false && (
                                <span className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-xs font-bold border border-red-100">
                                    No viene
                                </span>
                            )}
                            {guest.confirmado === null && (
                                <span className="px-3 py-1 bg-gray-50 text-gray-400 rounded-full text-xs font-bold border border-gray-200">
                                    Pendiente
                                </span>
                            )}
                            
                            {/* Icono Bus */}
                            {guest.bus && (
                                <span className="w-8 h-8 flex items-center justify-center bg-purple-50 text-purple-600 rounded-full border border-purple-100" title="Autobús requerido">
                                    🚌
                                </span>
                            )}
                        </div>
                    </div>
                ))}
                
                {guests.length === 0 && (
                    <div className="text-center py-10 text-boda-text-light italic">
                        Los novios aún no han añadido invitados.
                    </div>
                )}
            </div>
        </div>

      </div>
    </div>
  );
}