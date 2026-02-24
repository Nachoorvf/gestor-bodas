'use client';
import { useState, useEffect } from 'react';
import { db } from '../../../firebase/config';
import { doc, getDoc, updateDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import DashboardSkeleton from '../../../components/loaders/DashboardSkeleton';
import { Bus, MapPin, Clock, Users, ArrowRight, ArrowLeft, Check, Calendar } from 'lucide-react';

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
        if (!authLoading) {
            if (!user) {
                router.push('/login');
            } else if (userData?.weddingId) {
                // Wait for weddingId to be set before fetching data
            }
        }
    }, [user, userData, authLoading, router]);

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
        <div className="max-w-6xl mx-auto flex flex-col pb-20 animate-fade-in">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 md:mb-12">
                <div>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 block">Logística</span>
                    <h1 className="text-4xl md:text-5xl font-serif text-boda-text leading-tight">
                        Transporte
                    </h1>
                </div>
                {/* GLOBAL ENABLE TOGGLE */}
                <div
                    onClick={toggleBus}
                    className={`
                        cursor-pointer group flex items-center gap-4 px-6 py-3 rounded-full border transition-all duration-300
                        ${busConfig.enabled ? 'bg-black border-black text-white shadow-lg' : 'bg-white border-gray-200 hover:border-gray-300 text-gray-400'}
                    `}
                >
                    <div className="text-right">
                        <span className="block text-xs font-bold uppercase tracking-widest">{busConfig.enabled ? 'Servicio Activo' : 'Servicio Inactivo'}</span>
                        <span className="text-[10px] opacity-70 block">{busConfig.enabled ? 'Visible en invitaciones' : 'Oculto para invitados'}</span>
                    </div>
                    <div className={`w-10 h-6 rounded-full relative transition-colors ${busConfig.enabled ? 'bg-white/20' : 'bg-gray-100'}`}>
                        <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${busConfig.enabled ? 'translate-x-4' : 'translate-x-0'}`}></div>
                    </div>
                </div>
            </div>


            {/* TABS (Minimalist) */}
            {busConfig.enabled && (
                <>
                    <div className="flex gap-8 border-b border-gray-100 mb-10">
                        <button
                            onClick={() => setActiveTab('config')}
                            className={`pb-4 text-xs font-bold uppercase tracking-[0.15em] transition-all relative ${activeTab === 'config'
                                ? 'text-boda-text after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-black'
                                : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            Rutas & Horarios
                        </button>
                        <button
                            onClick={() => setActiveTab('passengers')}
                            className={`pb-4 text-xs font-bold uppercase tracking-[0.15em] transition-all relative ${activeTab === 'passengers'
                                ? 'text-boda-text after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-black'
                                : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            Lista de Pasajeros <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[9px] align-middle">{passengers.length}</span>
                        </button>
                    </div>

                    <div className="animate-fade-in-up">
                        {/* CONFIG CONFIGURATION */}
                        {activeTab === 'config' && (
                            <div className="space-y-12">
                                <div className="grid lg:grid-cols-2 gap-6 md:gap-8">
                                    {busConfig.routes.map((route, index) => (
                                        <div key={route.id} className="group relative bg-white p-5 md:p-8 rounded-3xl border border-gray-100 shadow-sm transition-all hover:shadow-xl hover:border-gray-200">
                                            {/* Header */}
                                            <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-50">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-black group-hover:text-white transition-colors duration-500">
                                                        {route.type === 'ida' ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
                                                    </div>
                                                    <h3 className="font-serif text-2xl text-boda-text">{route.name}</h3>
                                                </div>
                                            </div>

                                            {/* Inputs */}
                                            <div className="space-y-6">
                                                <div className="relative">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest absolute -top-2 left-0 bg-white pr-2 z-10">Hora de Salida</label>
                                                    <div className="flex items-center gap-3 p-4 bg-gray-50/50 rounded-xl border border-transparent focus-within:bg-white focus-within:border-black focus-within:shadow-sm transition-all">
                                                        <Clock size={16} className="text-gray-400" />
                                                        <input
                                                            type="time"
                                                            className="bg-transparent text-lg font-bold text-boda-text outline-none w-full"
                                                            value={route.time}
                                                            onChange={(e) => updateRoute(index, 'time', e.target.value)}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="relative">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest absolute -top-2 left-0 bg-white pr-2 z-10">Punto de Encuentro</label>
                                                    <div className="flex items-center gap-3 p-4 bg-gray-50/50 rounded-xl border border-transparent focus-within:bg-white focus-within:border-black focus-within:shadow-sm transition-all">
                                                        <MapPin size={16} className="text-gray-400" />
                                                        <input
                                                            type="text"
                                                            placeholder="Ej. Plaza Mayor, Esquina Norte..."
                                                            className="bg-transparent text-base text-gray-700 outline-none w-full placeholder:text-gray-300"
                                                            value={route.location}
                                                            onChange={(e) => updateRoute(index, 'location', e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* NOTES SECTION */}
                                <div className="bg-white p-5 md:p-8 rounded-3xl border border-gray-100 shadow-sm">
                                    <h3 className="font-serif text-xl text-boda-text mb-2">Notas Adicionales</h3>
                                    <p className="text-xs text-gray-400 mb-4 uppercase tracking-widest">Información visible para los invitados</p>
                                    <textarea
                                        placeholder="Escribe aquí paradas adicionales, recomendaciones o detalles importantes..."
                                        className="w-full p-6 bg-gray-50/50 rounded-xl border border-transparent focus:bg-white focus:border-black focus:shadow-sm outline-none transition-all resize-none text-gray-600 font-light leading-relaxed"
                                        rows={4}
                                        value={busConfig.notes}
                                        onChange={(e) => setBusConfig({ ...busConfig, notes: e.target.value })}
                                    />
                                </div>

                                {/* ACTION BAR */}
                                <div className="fixed bottom-0 left-0 w-full bg-white/80 backdrop-blur-md border-t border-gray-200 p-4 lg:p-6 flex justify-end z-40 lg:static lg:bg-transparent lg:border-none lg:p-0">
                                    <button
                                        onClick={handleSave}
                                        className="bg-black text-white px-8 py-3 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-gray-800 hover:scale-105 transition-all shadow-xl"
                                    >
                                        Guardar Cambios
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* PASSENGERS LIST */}
                        {activeTab === 'passengers' && (
                            <div className="space-y-6">
                                {/* STATS SUMMARY */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-black text-white p-6 rounded-2xl">
                                        <span className="text-2xl font-serif block">{passengers.length}</span>
                                        <span className="text-[10px] uppercase tracking-widest opacity-60">Pasajeros Totales</span>
                                    </div>
                                </div>

                                {/* TABLE */}
                                <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                                    {passengers.length === 0 ? (
                                        <div className="p-20 text-center flex flex-col items-center opacity-40">
                                            <Bus size={48} className="mb-4 text-gray-300" strokeWidth={1} />
                                            <p className="text-gray-500 font-serif text-xl">
                                                Aún no hay pasajeros confirmados
                                            </p>
                                        </div>
                                    ) : (
                                        <div>
                                            {/* DESKTOP VIEW: TABLE */}
                                            <div className="hidden md:block overflow-x-auto">
                                                <table className="w-full text-left">
                                                    <thead className="bg-gray-50/50 border-b border-gray-100">
                                                        <tr>
                                                            <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nombre</th>
                                                            <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Mesa</th>
                                                            <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Confirmado</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50">
                                                        {passengers.map((guest) => (
                                                            <tr key={guest.id} className="hover:bg-gray-50/30 transition-colors cursor-default group">
                                                                <td className="px-8 py-4">
                                                                    <span className="font-bold text-boda-text block">{guest.nombre}</span>
                                                                    <span className="text-xs text-gray-400">{guest.role || 'Invitado'}</span>
                                                                </td>
                                                                <td className="px-8 py-4">
                                                                    {guest.tableId ? (
                                                                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded inline-block">Con Mesa</span>
                                                                    ) : (
                                                                        <span className="text-xs text-gray-300 italic">—</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-8 py-4 text-right">
                                                                    <div className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide">
                                                                        <Check size={10} /> Sí
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* MOBILE VIEW: CARDS */}
                                            <div className="block md:hidden divide-y divide-gray-50">
                                                {passengers.map((guest) => (
                                                    <div key={guest.id} className="p-4 flex flex-col gap-2">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <span className="font-bold text-[#333] block">{guest.nombre}</span>
                                                                <span className="text-xs text-gray-400">{guest.role || 'Invitado'}</span>
                                                            </div>
                                                            <div className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide">
                                                                <Check size={10} /> Sí
                                                            </div>
                                                        </div>
                                                        {guest.tableId && (
                                                            <div>
                                                                <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">En Mesa</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
