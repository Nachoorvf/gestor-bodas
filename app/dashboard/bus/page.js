'use client';
import { useState, useEffect } from 'react';
import { db } from '../../../firebase/config';
import { doc, getDoc, updateDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import DashboardSkeleton from '../../../components/loaders/DashboardSkeleton';

export default function BusPage() {
    const router = useRouter();
    const { user, userData, loading: authLoading } = useAuth();
    const weddingId = userData?.weddingId;

    // Manage local loading for data fetching (since context only handles auth loading)
    const [dataLoading, setDataLoading] = useState(true);

    const [activeTab, setActiveTab] = useState('config'); // config | passengers

    // BUS CONFIG STATE
    const [busConfig, setBusConfig] = useState({
        enabled: false,
        routes: [
            { id: 1, type: 'ida', name: 'Ida (Recogida)', time: '', location: '' },
            { id: 2, type: 'vuelta', name: 'Vuelta (Regreso)', time: '', location: '' }
        ],
        notes: ''
    });

    // PASSENGERS STATE
    const [passengers, setPassengers] = useState([]);

    // 1. Auth Check
    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    // 2. Fetch Data
    useEffect(() => {
        if (!weddingId) return;

        const fetchData = async () => {
            // Fetch Bus Config
            const wDoc = await getDoc(doc(db, 'weddings', weddingId));
            if (wDoc.exists() && wDoc.data().busConfig) {
                setBusConfig(wDoc.data().busConfig);
            }

            // Fetch Passengers Real-time
            const q = query(collection(db, 'weddings', weddingId, 'guests'), where('bus', '==', true));
            const unsub = onSnapshot(q, (snap) => {
                const guests = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                setPassengers(guests);
            });

            setDataLoading(false);
            return () => unsub();
        };

        fetchData();
    }, [weddingId]);

    const handleSave = async () => {
        try {
            await updateDoc(doc(db, 'weddings', weddingId), {
                busConfig: busConfig
            });
            alert('Configuración guardada correctamente');
        } catch (e) {
            console.error(e);
            alert('Error al guardar');
        }
    };

    const toggleBus = () => {
        setBusConfig(prev => ({ ...prev, enabled: !prev.enabled }));
    };

    const updateRoute = (index, field, value) => {
        const newRoutes = [...busConfig.routes];
        newRoutes[index][field] = value;
        setBusConfig(prev => ({ ...prev, routes: newRoutes }));
    };

    if (authLoading || dataLoading) return <DashboardSkeleton />;

    return (
        <div className="max-w-4xl mx-auto h-[calc(100vh-100px)] flex flex-col">
            <h1 className="text-3xl font-serif text-boda-text mb-2">Gestión de Autobuses 🚌</h1>
            <p className="text-gray-500 text-sm mb-6">Configura el servicio y controla quién sube.</p>

            {/* MASTER TOGGLE CARD */}
            <div className={`p-6 rounded-2xl border transition-all duration-500 mb-8 flex items-center justify-between ${busConfig.enabled
                ? 'bg-purple-50 border-purple-200 shadow-md'
                : 'bg-white border-gray-200 grayscale opacity-80'
                }`}>
                <div>
                    <h2 className="font-bold text-xl text-boda-text">Servicio de Autobús</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        {busConfig.enabled
                            ? 'Activado. Tus invitados verán la opción en su invitación.'
                            : 'Desactivado. Nadie verá esta opción.'}
                    </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={busConfig.enabled} onChange={toggleBus} />
                    <div className="w-14 h-8 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-7 after:w-7 after:transition-all peer-checked:bg-purple-500"></div>
                </label>
            </div>

            {/* TABS */}
            {busConfig.enabled && (
                <>
                    <div className="flex gap-4 border-b border-gray-100 mb-6">
                        <button
                            onClick={() => setActiveTab('config')}
                            className={`pb-2 px-4 font-bold text-sm transition ${activeTab === 'config' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            ⚙️ Configuración
                        </button>
                        <button
                            onClick={() => setActiveTab('passengers')}
                            className={`pb-2 px-4 font-bold text-sm transition ${activeTab === 'passengers' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            📋 Pasajeros ({passengers.length})
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto pb-20">

                        {/* CONFIG TAB */}
                        {activeTab === 'config' && (
                            <div className="space-y-6 animate-fade-in-up">
                                <div className="grid md:grid-cols-2 gap-6">
                                    {busConfig.routes.map((route, index) => (
                                        <div key={route.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                            <div className="flex items-center gap-2 mb-4">
                                                <span className="text-2xl">{route.type === 'ida' ? '🛫' : '🛬'}</span>
                                                <h3 className="font-bold text-boda-text">{route.name}</h3>
                                            </div>
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="text-xs font-bold text-gray-400 uppercase">Hora</label>
                                                    <input
                                                        type="time"
                                                        className="w-full p-2 border rounded-lg bg-gray-50 text-sm"
                                                        value={route.time}
                                                        onChange={(e) => updateRoute(index, 'time', e.target.value)}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-gray-400 uppercase">Lugar</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Plaza Mayor, Hotel..."
                                                        className="w-full p-2 border rounded-lg bg-gray-50 text-sm"
                                                        value={route.location}
                                                        onChange={(e) => updateRoute(index, 'location', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                    <h3 className="font-bold text-boda-text mb-2">Notas Adicionales</h3>
                                    <textarea
                                        placeholder="Instrucciones extra para tus invitados..."
                                        className="w-full p-3 border rounded-lg bg-gray-50 text-sm h-24"
                                        value={busConfig.notes}
                                        onChange={(e) => setBusConfig({ ...busConfig, notes: e.target.value })}
                                    />
                                </div>

                                <button onClick={handleSave} className="bg-boda-text text-white px-8 py-3 rounded-xl font-bold hover:bg-black transition w-full md:w-auto">
                                    Guardar Cambios
                                </button>
                            </div>
                        )}

                        {/* PASSENGERS TAB */}
                        {activeTab === 'passengers' && (
                            <div className="animate-fade-in-up bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                {passengers.length === 0 ? (
                                    <div className="p-10 text-center text-gray-400 italic">
                                        Nadie ha solicitado autobús todavía.
                                    </div>
                                ) : (
                                    <table className="w-full text-left text-sm text-gray-600">
                                        <thead className="bg-gray-50 text-xs uppercase text-gray-400 font-bold">
                                            <tr>
                                                <th className="px-6 py-3">Nombre</th>
                                                <th className="px-6 py-3">Mesa</th>
                                                <th className="px-6 py-3 text-right">Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {passengers.map((guest) => (
                                                <tr key={guest.id} className="hover:bg-gray-50/50">
                                                    <td className="px-6 py-4 font-medium text-boda-text">{guest.nombre}</td>
                                                    <td className="px-6 py-4">{guest.tableId ? '✅ Asignado' : '❌ Sin mesa'}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className="bg-purple-100 text-purple-600 px-2 py-1 rounded-full text-xs font-bold">Bus Confirmado</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-gray-50 font-bold text-boda-text">
                                            <tr>
                                                <td className="px-6 py-3">Total</td>
                                                <td colSpan="2" className="px-6 py-3 text-right">{passengers.length} Pasajeros</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                )}
                            </div>
                        )}

                    </div>
                </>
            )}
        </div>
    );
}
