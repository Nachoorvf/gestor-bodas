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

    useEffect(() => {
        const q = query(collection(db, 'weddings', id, 'guests'), orderBy('creadoEn', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setGuests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, [id]);

    const totalInvitados = guests.length;
    const confirmados = guests.filter(g => g.confirmado === true).length;
    const autobus = guests.filter(g => g.bus === true).length;
    const porcentaje = totalInvitados > 0 ? (confirmados / totalInvitados) * 100 : 0;

    if (!bodaInfo) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400 font-bold animate-pulse">Cargando datos...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-6xl mx-auto space-y-8">

                {/* NAV */}
                <div className="flex justify-between items-center">
                    <Link href="/admin" className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-100 transition">
                        ← Volver al Panel
                    </Link>
                    <div className="text-right">
                        <span className="text-xs font-mono text-gray-400 bg-white px-2 py-1 rounded border border-gray-100">ID: {id}</span>
                    </div>
                </div>

                {/* HEADER */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center text-4xl shadow-inner">
                            💍
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Supervisando Boda</p>
                            <h1 className="text-4xl font-black text-gray-800">
                                {bodaInfo.novios[0]} <span className="text-purple-400">&</span> {bodaInfo.novios[1]}
                            </h1>
                            <p className="text-gray-500 text-sm mt-1">📅 Fecha del evento: <span className="font-bold text-gray-700">{bodaInfo.fecha}</span></p>
                        </div>
                    </div>
                </div>

                {/* STATS */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard icon="👥" label="Total Invitados" value={totalInvitados} color="bg-blue-50" />
                    <StatCard icon="✅" label="Confirmados" value={confirmados} color="bg-green-50" />
                    <StatCard icon="🚌" label="En Autobús" value={autobus} color="bg-orange-50" />

                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center relative overflow-hidden">
                        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider z-10 relative">Participación</p>
                        <p className="text-3xl font-black text-gray-800 z-10 relative mt-1">{Math.round(porcentaje)}%</p>
                        <div className="absolute bottom-0 left-0 h-1 bg-purple-500 transition-all duration-1000" style={{ width: `${porcentaje}%` }}></div>
                    </div>
                </div>

                {/* GUEST LIST */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <h2 className="font-bold text-gray-800 text-lg">Lista de Invitados</h2>
                        <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold">{guests.length} registros</span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Nombre</th>
                                    <th className="px-6 py-4">Estado</th>
                                    <th className="px-6 py-4 text-center">Bus</th>
                                    <th className="px-6 py-4 text-right">ID</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {guests.map(guest => (
                                    <tr key={guest.id} className="hover:bg-gray-50/50 transition">
                                        <td className="px-6 py-4 font-bold text-gray-700">{guest.nombre}</td>
                                        <td className="px-6 py-4">
                                            {guest.confirmado === true && <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>}
                                            {guest.confirmado === false && <span className="inline-block w-2 h-2 bg-red-400 rounded-full mr-2"></span>}
                                            {guest.confirmado === null && <span className="inline-block w-2 h-2 bg-gray-300 rounded-full mr-2"></span>}
                                            <span className="text-gray-600">
                                                {guest.confirmado === true ? 'Asiste' : guest.confirmado === false ? 'No viene' : 'Pendiente'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center text-xl">
                                            {guest.bus ? '🚌' : <span className="opacity-20">🚌</span>}
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-xs text-gray-400">
                                            {guest.id.substring(0, 6)}...
                                        </td>
                                    </tr>
                                ))}
                                {guests.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="text-center py-10 text-gray-400 italic">No hay invitados registrados aún.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
}

function StatCard({ icon, label, value, color }) {
    return (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className={`w-12 h-12 ${color} rounded-full flex items-center justify-center text-2xl`}>
                {icon}
            </div>
            <div>
                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">{label}</p>
                <p className="text-2xl font-black text-gray-800">{value}</p>
            </div>
        </div>
    );
}