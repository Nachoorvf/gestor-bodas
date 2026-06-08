'use client';
import { useState, useEffect, useCallback } from 'react';
import { db } from '../../../firebase/config';
import { doc, getDoc, updateDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../../../context/AuthContext';
import DashboardSkeleton from '../../../components/loaders/DashboardSkeleton';
import { Bus, MapPin, Clock, Users, ArrowRight, ArrowLeft, Check, Plus, Trash2, CheckCircle2, X, Filter } from 'lucide-react';

// ─── TOAST ───────────────────────────────────────────────────────────────────
function Toast({ message, type = 'success', onClose }) {
    useEffect(() => {
        const t = setTimeout(onClose, 3000);
        return () => clearTimeout(t);
    }, [onClose]);
    return (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-sm font-bold animate-fade-in-up
            ${type === 'success' ? 'bg-[#1a1a1a] text-white border-white/10' : 'bg-red-500 text-white border-red-400'}`}>
            {type === 'success' ? <CheckCircle2 size={16} className="text-green-400" /> : <X size={16} />}
            {message}
        </div>
    );
}

// ─── MIGRATE LEGACY FORMAT ────────────────────────────────────────────────────
function migrateLegacyConfig(raw) {
    // Already new format
    if (raw?.ida || raw?.vuelta) return raw;

    // Legacy format: { enabled, routes: [{id, type:'ida'|'vuelta', time, location}], notes }
    const legacyRoutes = raw?.routes || [];
    const ida = legacyRoutes.filter(r => r.type === 'ida');
    const vuelta = legacyRoutes.filter(r => r.type === 'vuelta');

    return {
        enabled: raw?.enabled ?? false,
        ida: {
            enabled: ida.length > 0 && (ida[0].time || ida[0].location),
            stops: ida.map((r, i) => ({
                id: `ida_${Date.now()}_${i}`,
                time: r.time || '',
                location: r.location || ''
            }))
        },
        vuelta: {
            enabled: vuelta.length > 0 && (vuelta[0].time || vuelta[0].location),
            stops: vuelta.map((r, i) => ({
                id: `vuelta_${Date.now()}_${i}`,
                time: r.time || '',
                location: r.location || ''
            }))
        },
        notes: raw?.notes || ''
    };
}

const DEFAULT_CONFIG = {
    enabled: false,
    ida: { enabled: false, stops: [] },
    vuelta: { enabled: false, stops: [] },
    notes: ''
};

// ─── STOP CARD COMPONENT ─────────────────────────────────────────────────────
function StopCard({ stop, index, direction, onUpdate, onDelete, isOnly }) {
    return (
        <div className="group flex gap-3 items-start bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-200">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-xs font-bold mt-0.5">
                {index + 1}
            </div>
            <div className="flex-1 grid sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl border border-transparent focus-within:border-black focus-within:bg-white transition-all px-3 py-2">
                    <Clock size={13} className="text-gray-400 shrink-0" />
                    <input
                        type="time"
                        value={stop.time}
                        onChange={e => onUpdate(stop.id, 'time', e.target.value)}
                        className="bg-transparent text-sm font-bold text-[#333] outline-none w-full"
                    />
                </div>
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl border border-transparent focus-within:border-black focus-within:bg-white transition-all px-3 py-2">
                    <MapPin size={13} className="text-gray-400 shrink-0" />
                    <input
                        type="text"
                        placeholder="Punto de encuentro..."
                        value={stop.location}
                        onChange={e => onUpdate(stop.id, 'location', e.target.value)}
                        className="bg-transparent text-sm text-gray-700 placeholder-gray-300 outline-none w-full"
                    />
                </div>
            </div>
            {!isOnly && (
                <button
                    onClick={() => onDelete(stop.id)}
                    className="flex-shrink-0 w-7 h-7 rounded-xl flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 transition mt-0.5"
                >
                    <Trash2 size={13} />
                </button>
            )}
        </div>
    );
}

// ─── DIRECTION SECTION ────────────────────────────────────────────────────────
function DirectionSection({ title, icon, direction, data, onToggle, onUpdate, onAddStop, onDeleteStop }) {
    return (
        <div className={`rounded-3xl border transition-all duration-300 overflow-hidden ${data.enabled ? 'border-gray-200 shadow-sm bg-white' : 'border-dashed border-gray-200 bg-gray-50/50'}`}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${data.enabled ? 'bg-black text-white' : 'bg-gray-100 text-gray-400'}`}>
                        {icon}
                    </div>
                    <div>
                        <h3 className="font-serif text-xl text-[#333]">{title}</h3>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest">
                            {data.enabled ? `${data.stops.length} parada${data.stops.length !== 1 ? 's' : ''}` : 'Desactivado'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={onToggle}
                    className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${data.enabled ? 'bg-black' : 'bg-gray-200'}`}
                >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300 ${data.enabled ? 'left-7' : 'left-1'}`} />
                </button>
            </div>

            {/* Content */}
            {data.enabled && (
                <div className="px-6 pb-6 space-y-3 border-t border-gray-50 pt-4">
                    {data.stops.map((stop, i) => (
                        <StopCard
                            key={stop.id}
                            stop={stop}
                            index={i}
                            direction={direction}
                            onUpdate={onUpdate}
                            onDelete={onDeleteStop}
                            isOnly={data.stops.length === 1}
                        />
                    ))}
                    <button
                        onClick={onAddStop}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 text-xs font-bold uppercase tracking-wider hover:border-black hover:text-black transition-all duration-200"
                    >
                        <Plus size={14} /> Añadir Parada
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function BusPage() {
    const { user, userData, loading: authLoading } = useAuth();
    const weddingId = userData?.weddingId;

    const [dataLoading, setDataLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('config');
    const [busConfig, setBusConfig] = useState(DEFAULT_CONFIG);
    const [passengers, setPassengers] = useState([]);
    const [toast, setToast] = useState(null);
    const [saving, setSaving] = useState(false);

    // Passenger filtering/sorting
    const [sortBy, setSortBy] = useState('name'); // 'name' | 'ida' | 'vuelta'
    const [filterStop, setFilterStop] = useState('all'); // 'all' | stop.id

    // Fetch data
    useEffect(() => {
        if (!weddingId) return;
        const fetchData = async () => {
            const wDoc = await getDoc(doc(db, 'weddings', weddingId));
            if (wDoc.exists() && wDoc.data().busConfig) {
                setBusConfig(migrateLegacyConfig(wDoc.data().busConfig));
            }

            const q = query(collection(db, 'weddings', weddingId, 'guests'), where('bus', '!=', null));
            const unsub = onSnapshot(q, (snap) => {
                // Include both old-style bus:true and new-style bus:{ida,vuelta}
                const all = snap.docs
                    .map(d => ({ id: d.id, ...d.data() }))
                    .filter(g => g.bus === true || (typeof g.bus === 'object' && g.bus !== null && (g.bus.ida || g.bus.vuelta)));
                setPassengers(all);
            });
            setDataLoading(false);
            return () => unsub();
        };
        fetchData();
    }, [weddingId]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateDoc(doc(db, 'weddings', weddingId), { busConfig });
            setToast({ message: 'Configuración guardada ✓', type: 'success' });
        } catch {
            setToast({ message: 'Error al guardar', type: 'error' });
        } finally { setSaving(false); }
    };

    const toggleBus = () => setBusConfig(p => ({ ...p, enabled: !p.enabled }));

    const toggleDirection = (dir) => {
        setBusConfig(p => {
            const updated = { ...p[dir], enabled: !p[dir].enabled };
            if (updated.enabled && updated.stops.length === 0) {
                updated.stops = [{ id: `${dir}_${Date.now()}`, time: '', location: '' }];
            }
            return { ...p, [dir]: updated };
        });
    };

    const addStop = (dir) => {
        setBusConfig(p => ({
            ...p,
            [dir]: { ...p[dir], stops: [...p[dir].stops, { id: `${dir}_${Date.now()}`, time: '', location: '' }] }
        }));
    };

    const updateStop = useCallback((dir, stopId, field, value) => {
        setBusConfig(p => ({
            ...p,
            [dir]: {
                ...p[dir],
                stops: p[dir].stops.map(s => s.id === stopId ? { ...s, [field]: value } : s)
            }
        }));
    }, []);

    const deleteStop = (dir, stopId) => {
        setBusConfig(p => ({
            ...p,
            [dir]: { ...p[dir], stops: p[dir].stops.filter(s => s.id !== stopId) }
        }));
    };

    // All stops for filter UI
    const allStops = [
        ...(busConfig.ida?.stops || []).map(s => ({ ...s, dir: 'ida', dirLabel: 'Ida' })),
        ...(busConfig.vuelta?.stops || []).map(s => ({ ...s, dir: 'vuelta', dirLabel: 'Vuelta' }))
    ];

    // Helper: get stop label for a guest
    const getPassengerStopLabel = (guest, dir) => {
        const busData = guest.bus;
        if (busData === true) return { label: 'Sin especificar', legacy: true };
        const stopId = busData?.[dir];
        if (!stopId) return null;
        const stop = allStops.find(s => s.id === stopId);
        return stop ? { label: `${stop.time} · ${stop.location}`, legacy: false } : { label: stopId, legacy: false };
    };

    // Sort & filter passengers
    const processedPassengers = [...passengers]
        .filter(g => {
            if (filterStop === 'all') return true;
            const busData = g.bus;
            if (busData === true) return false;
            return busData?.ida === filterStop || busData?.vuelta === filterStop;
        })
        .sort((a, b) => {
            if (sortBy === 'name') return (a.nombre || '').localeCompare(b.nombre || '');
            if (sortBy === 'ida') {
                const aId = typeof a.bus === 'object' ? a.bus?.ida || '' : '';
                const bId = typeof b.bus === 'object' ? b.bus?.ida || '' : '';
                return aId.localeCompare(bId);
            }
            if (sortBy === 'vuelta') {
                const aId = typeof a.bus === 'object' ? a.bus?.vuelta || '' : '';
                const bId = typeof b.bus === 'object' ? b.bus?.vuelta || '' : '';
                return aId.localeCompare(bId);
            }
            return 0;
        });

    // Count per stop
    const countPerStop = allStops.reduce((acc, stop) => {
        acc[stop.id] = passengers.filter(g => typeof g.bus === 'object' && (g.bus?.ida === stop.id || g.bus?.vuelta === stop.id)).length;
        return acc;
    }, {});

    if (authLoading || dataLoading) return <DashboardSkeleton />;

    return (
        <div className="max-w-6xl mx-auto flex flex-col pb-20 animate-fade-in">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 md:mb-12">
                <div>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 block">Logística</span>
                    <h1 className="text-4xl md:text-5xl font-serif text-[#333] leading-tight">Transporte</h1>
                </div>
                <div
                    onClick={toggleBus}
                    className={`cursor-pointer flex items-center gap-4 px-6 py-3 rounded-full border transition-all duration-300
                        ${busConfig.enabled ? 'bg-black border-black text-white shadow-lg' : 'bg-white border-gray-200 hover:border-gray-300 text-gray-400'}`}
                >
                    <div className="text-right">
                        <span className="block text-xs font-bold uppercase tracking-widest">{busConfig.enabled ? 'Servicio Activo' : 'Servicio Inactivo'}</span>
                        <span className="text-[10px] opacity-70 block">{busConfig.enabled ? 'Visible en invitaciones' : 'Oculto para invitados'}</span>
                    </div>
                    <div className={`w-10 h-6 rounded-full relative transition-colors ${busConfig.enabled ? 'bg-white/20' : 'bg-gray-100'}`}>
                        <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${busConfig.enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                </div>
            </div>

            {busConfig.enabled && (
                <>
                    {/* TABS */}
                    <div className="flex gap-8 border-b border-gray-100 mb-10">
                        {[
                            { id: 'config', label: 'Rutas & Paradas' },
                            { id: 'passengers', label: 'Pasajeros', badge: passengers.length }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`pb-4 text-xs font-bold uppercase tracking-[0.15em] transition-all relative ${activeTab === tab.id
                                    ? 'text-[#333] after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-black'
                                    : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                {tab.label}
                                {tab.badge !== undefined && (
                                    <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[9px] align-middle">{tab.badge}</span>
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="animate-fade-in-up">

                        {/* ── TAB: CONFIG ────────────────────────────────────────────── */}
                        {activeTab === 'config' && (
                            <div className="space-y-6">
                                <DirectionSection
                                    title="Ida / Salida"
                                    icon={<ArrowRight size={18} />}
                                    direction="ida"
                                    data={busConfig.ida}
                                    onToggle={() => toggleDirection('ida')}
                                    onUpdate={(stopId, field, value) => updateStop('ida', stopId, field, value)}
                                    onAddStop={() => addStop('ida')}
                                    onDeleteStop={(stopId) => deleteStop('ida', stopId)}
                                />
                                <DirectionSection
                                    title="Vuelta / Regreso"
                                    icon={<ArrowLeft size={18} />}
                                    direction="vuelta"
                                    data={busConfig.vuelta}
                                    onToggle={() => toggleDirection('vuelta')}
                                    onUpdate={(stopId, field, value) => updateStop('vuelta', stopId, field, value)}
                                    onAddStop={() => addStop('vuelta')}
                                    onDeleteStop={(stopId) => deleteStop('vuelta', stopId)}
                                />

                                {/* NOTES */}
                                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                    <h3 className="font-serif text-xl text-[#333] mb-1">Notas Adicionales</h3>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-4">Información visible para los invitados</p>
                                    <textarea
                                        placeholder="Escribe aquí instrucciones adicionales, información del conductor, etc..."
                                        className="w-full p-4 bg-gray-50/50 rounded-xl border border-transparent focus:bg-white focus:border-black outline-none transition-all resize-none text-gray-600 text-sm leading-relaxed"
                                        rows={4}
                                        value={busConfig.notes}
                                        onChange={e => setBusConfig(p => ({ ...p, notes: e.target.value }))}
                                    />
                                </div>

                                {/* SAVE */}
                                <div className="flex justify-end pt-2">
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="bg-black text-white px-8 py-3 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-gray-800 transition-all shadow-xl disabled:opacity-60 flex items-center gap-2"
                                    >
                                        {saving ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Guardando...</> : 'Guardar Cambios'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ── TAB: PASSENGERS ──────────────────────────────────────────── */}
                        {activeTab === 'passengers' && (
                            <div className="space-y-6">

                                {/* STATS: per-stop counts */}
                                {allStops.length > 0 && (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <div className="bg-black text-white p-5 rounded-2xl">
                                            <span className="text-3xl font-serif block">{passengers.length}</span>
                                            <span className="text-[10px] uppercase tracking-widest opacity-60">Total Pasajeros</span>
                                        </div>
                                        {allStops.filter(s => s.time || s.location).map(stop => (
                                            <div key={stop.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                                <span className="text-2xl font-serif block text-[#333]">{countPerStop[stop.id] || 0}</span>
                                                <span className="text-[10px] uppercase tracking-widest text-gray-400 block mt-0.5">{stop.dirLabel}</span>
                                                <span className="text-xs text-gray-500 font-medium truncate block">{stop.time} {stop.location && `· ${stop.location}`}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* FILTERS & SORT */}
                                <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-wrap gap-3 items-center">
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                        <Filter size={11} /> Filtrar por parada:
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={() => setFilterStop('all')}
                                            className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${filterStop === 'all' ? 'bg-black text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                        >
                                            Todos
                                        </button>
                                        {allStops.filter(s => s.time || s.location).map(stop => (
                                            <button
                                                key={stop.id}
                                                onClick={() => setFilterStop(stop.id)}
                                                className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${filterStop === stop.id ? 'bg-black text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                            >
                                                {stop.dirLabel}: {stop.time} {stop.location && `· ${stop.location.slice(0, 16)}${stop.location.length > 16 ? '…' : ''}`}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="ml-auto flex items-center gap-2">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Ordenar:</span>
                                        {[
                                            { id: 'name', label: 'Nombre' },
                                            { id: 'ida', label: 'Parada Ida' },
                                            { id: 'vuelta', label: 'Parada Vuelta' }
                                        ].map(opt => (
                                            <button
                                                key={opt.id}
                                                onClick={() => setSortBy(opt.id)}
                                                className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${sortBy === opt.id ? 'bg-[#333] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* TABLE */}
                                <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                                    {processedPassengers.length === 0 ? (
                                        <div className="p-20 text-center flex flex-col items-center opacity-40">
                                            <Bus size={48} className="mb-4 text-gray-300" strokeWidth={1} />
                                            <p className="text-gray-500 font-serif text-xl">
                                                {filterStop !== 'all' ? 'Sin pasajeros en esta parada' : 'Aún no hay pasajeros confirmados'}
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Desktop */}
                                            <div className="hidden md:block overflow-x-auto">
                                                <table className="w-full text-left">
                                                    <thead className="bg-gray-50/50 border-b border-gray-100">
                                                        <tr>
                                                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nombre</th>
                                                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                                <div className="flex items-center gap-1"><ArrowRight size={10} /> Parada Ida</div>
                                                            </th>
                                                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                                <div className="flex items-center gap-1"><ArrowLeft size={10} /> Parada Vuelta</div>
                                                            </th>
                                                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Estado</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50">
                                                        {processedPassengers.map(guest => {
                                                            const idaStop = getPassengerStopLabel(guest, 'ida');
                                                            const vueltaStop = getPassengerStopLabel(guest, 'vuelta');
                                                            return (
                                                                <tr key={guest.id} className="hover:bg-gray-50/30 transition-colors">
                                                                    <td className="px-6 py-4">
                                                                        <span className="font-bold text-[#333] block">{guest.nombre}</span>
                                                                        <span className="text-xs text-gray-400">{guest.role || 'Invitado'}</span>
                                                                    </td>
                                                                    <td className="px-6 py-4">
                                                                        {idaStop ? (
                                                                            <span className={`text-xs px-2 py-1 rounded-lg inline-block ${idaStop.legacy ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-700 font-medium'}`}>
                                                                                {idaStop.label}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-xs text-gray-300 italic">—</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-6 py-4">
                                                                        {vueltaStop ? (
                                                                            <span className={`text-xs px-2 py-1 rounded-lg inline-block ${vueltaStop.legacy ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-700 font-medium'}`}>
                                                                                {vueltaStop.label}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-xs text-gray-300 italic">—</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-6 py-4 text-right">
                                                                        <div className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide">
                                                                            <Check size={10} /> Confirmado
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* Mobile */}
                                            <div className="block md:hidden divide-y divide-gray-50">
                                                {processedPassengers.map(guest => {
                                                    const idaStop = getPassengerStopLabel(guest, 'ida');
                                                    const vueltaStop = getPassengerStopLabel(guest, 'vuelta');
                                                    return (
                                                        <div key={guest.id} className="p-4 space-y-2">
                                                            <div className="flex justify-between items-start">
                                                                <span className="font-bold text-[#333]">{guest.nombre}</span>
                                                                <div className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                                                                    <Check size={10} /> Sí
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-wrap gap-2">
                                                                {idaStop && (
                                                                    <span className="text-[10px] bg-green-50 text-green-700 px-2 py-1 rounded-lg font-medium flex items-center gap-1">
                                                                        <ArrowRight size={9} /> {idaStop.label}
                                                                    </span>
                                                                )}
                                                                {vueltaStop && (
                                                                    <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-1 rounded-lg font-medium flex items-center gap-1">
                                                                        <ArrowLeft size={9} /> {vueltaStop.label}
                                                                    </span>
                                                                )}
                                                                {!idaStop && !vueltaStop && (
                                                                    <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-1 rounded-lg">Sin parada especificada</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </>
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
