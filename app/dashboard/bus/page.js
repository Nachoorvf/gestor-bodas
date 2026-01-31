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
        <div className="max-w-5xl mx-auto flex flex-col pb-20 fade-in">
            {/* HEADER - Editorial */}
            <div className="mb-12 border-b border-gray-100 pb-8 flex justify-between items-end">
                <div>
                    <p className="text-gray-400 uppercase tracking-[0.2em] text-[10px] font-bold mb-3">Logística & Transporte</p>
                    <h1 className="text-4xl md:text-5xl font-display text-boda-text leading-tight tracking-wide">
                        Gestión de Autobuses
                    </h1>
                </div>
                <div className="hidden md:block">
                    <span className="text-5xl">🚌</span>
                </div>
            </div>

            {/* CONTROL CARD (MASTER TOGGLE) */}
            <div className={`p-8 rounded-xl transition-all duration-700 mb-12 relative overflow-hidden group ${busConfig.enabled
                ? 'bg-[#333] text-white shadow-2xl shadow-gray-300/50'
                : 'bg-gray-50 text-gray-400 border border-gray-100'
                }`}>

                {busConfig.enabled && (
                    <div className="absolute top-0 right-0 w-64 h-64 bg-boda-accent/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                )}

                <div className="relative z-10 flex items-center justify-between">
                    <div>
                        <h2 className={`font-display text-2xl md:text-3xl mb-2 ${busConfig.enabled ? 'text-white' : 'text-gray-400'}`}>
                            Servicio de Transporte
                        </h2>
                        <p className={`text-xs uppercase tracking-widest ${busConfig.enabled ? 'text-boda-accent' : 'text-gray-400'}`}>
                            {busConfig.enabled
                                ? 'Activo — Visible en las invitaciones'
                                : 'Inactivo — Oculto para invitados'}
                        </p>
                    </div>

                    {/* CUSTOM TOGGLE SWITCH */}
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={busConfig.enabled} onChange={toggleBus} />
                        <div className={`w-14 h-8 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all duration-300 ${busConfig.enabled ? 'bg-boda-accent after:shadow-md' : 'bg-gray-200'}`}></div>
                    </label>
                </div>
            </div>

            {/* TABS - Minimalist */}
            {busConfig.enabled && (
                <>
                    <div className="flex gap-8 border-b border-gray-100 mb-10">
                        <button
                            onClick={() => setActiveTab('config')}
                            className={`pb-4 text-xs font-bold uppercase tracking-[0.15em] transition-all relative ${activeTab === 'config'
                                ? 'text-boda-text after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-boda-accent'
                                : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            Configuración de Rutas
                        </button>
                        <button
                            onClick={() => setActiveTab('passengers')}
                            className={`pb-4 text-xs font-bold uppercase tracking-[0.15em] transition-all relative ${activeTab === 'passengers'
                                ? 'text-boda-text after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-boda-accent'
                                : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            Lista de Pasajeros <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-[9px] align-middle">{passengers.length}</span>
                        </button>
                    </div>

                    <div className="animate-fade-in-up">

                        {/* CONFIG TAB */}
                        {activeTab === 'config' && (
                            <div className="space-y-10">
                                <div className="grid md:grid-cols-2 gap-8">
                                    {busConfig.routes.map((route, index) => (
                                        <div key={route.id} className="relative bg-white p-0 shadow-xl shadow-gray-200/50 group overflow-hidden transition-transform hover:-translate-y-1 duration-500">
                                            {/* TICKET VISUAL DESIGN */}
                                            <div className="absolute top-0 left-0 w-2 h-full bg-boda-accent"></div>
                                            <div className="absolute top-1/2 right-0 w-6 h-6 bg-[#FAFAFA] rounded-full translate-x-1/2 -translate-y-1/2 shadow-inner"></div>
                                            <div className="absolute top-1/2 left-0 w-6 h-6 bg-[#FAFAFA] rounded-full -translate-x-1/2 -translate-y-1/2 shadow-inner border-r border-gray-200"></div>

                                            <div className="p-8 pl-10">
                                                <div className="flex justify-between items-start mb-6">
                                                    <div>
                                                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1">Ruta {route.id}</span>
                                                        <h3 className="font-display text-2xl text-boda-text">{route.name}</h3>
                                                    </div>
                                                    <span className="text-2xl opacity-80">{route.type === 'ida' ? '🛫' : '🛬'}</span>
                                                </div>

                                                <div className="space-y-6">
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Hora de Salida</label>
                                                        <input
                                                            type="time"
                                                            className="w-full bg-transparent border-b border-gray-200 py-2 text-xl font-display text-boda-text focus:outline-none focus:border-boda-accent transition-colors"
                                                            value={route.time}
                                                            onChange={(e) => updateRoute(index, 'time', e.target.value)}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Punto de Encuentro</label>
                                                        <input
                                                            type="text"
                                                            placeholder="Ej. Plaza Mayor..."
                                                            className="w-full bg-transparent border-b border-gray-200 py-2 text-base font-body text-gray-600 focus:outline-none focus:border-boda-accent transition-colors placeholder-gray-300"
                                                            value={route.location}
                                                            onChange={(e) => updateRoute(index, 'location', e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Bottom decorative barcode-like lines */}
                                            <div className="h-2 w-full bg-[repeating-linear-gradient(90deg,transparent,transparent_4px,#eee_4px,#eee_6px)] opacity-50 mb-4 ml-8"></div>
                                        </div>
                                    ))}
                                </div>

                                <div className="bg-white p-8 border border-gray-100">
                                    <h3 className="font-display text-xl text-boda-text mb-4">Notas para los Invitados</h3>
                                    <textarea
                                        placeholder="Información adicional (paradas intermedias, recomendaciones...)"
                                        className="w-full p-4 bg-gray-50 border border-gray-100 text-sm font-body text-gray-600 focus:outline-none focus:border-boda-accent/50 focus:bg-white transition-all h-32 resize-none"
                                        value={busConfig.notes}
                                        onChange={(e) => setBusConfig({ ...busConfig, notes: e.target.value })}
                                    />
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        onClick={handleSave}
                                        className="bg-boda-text text-white px-10 py-4 font-bold text-xs uppercase tracking-widest hover:bg-black hover:shadow-xl transition-all duration-300"
                                    >
                                        Guardar Configuración
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* PASSENGERS TAB */}
                        {activeTab === 'passengers' && (
                            <div className="bg-white border border-gray-100 shadow-sm overflow-hidden">
                                {passengers.length === 0 ? (
                                    <div className="p-20 text-center flex flex-col items-center">
                                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-3xl mb-4 grayscale opacity-50">🚌</div>
                                        <p className="text-gray-400 font-display text-xl italic">
                                            Aún no hay reservas de asiento.
                                        </p>
                                    </div>
                                ) : (
                                    <table className="w-full text-left text-sm text-gray-600">
                                        <thead className="bg-gray-50/50 border-b border-gray-100">
                                            <tr>
                                                <th className="px-8 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Pasajero</th>
                                                <th className="px-8 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Ubicación (Mesa)</th>
                                                <th className="px-8 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] text-right">Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {passengers.map((guest) => (
                                                <tr key={guest.id} className="hover:bg-gray-50/30 transition-colors">
                                                    <td className="px-8 py-5 font-display text-lg text-boda-text">{guest.nombre}</td>
                                                    <td className="px-8 py-5 font-light text-gray-500">
                                                        {guest.tableId ? (
                                                            <span className="flex items-center gap-2">
                                                                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                                                                Mesa Asignada
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-2 text-gray-300">
                                                                <span className="w-2 h-2 bg-gray-200 rounded-full"></span>
                                                                Sin Mesa
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-8 py-5 text-right">
                                                        <span className="border border-boda-text text-boda-text px-3 py-1 text-[10px] font-bold uppercase tracking-widest">
                                                            Confirmado
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-gray-50/50 border-t border-gray-100">
                                            <tr>
                                                <td className="px-8 py-4 font-display text-boda-text text-lg">Total Pasajeros</td>
                                                <td colSpan="2" className="px-8 py-4 text-right font-bold text-xl font-display">{passengers.length}</td>
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
