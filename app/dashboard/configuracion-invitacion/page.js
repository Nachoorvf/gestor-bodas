'use client';
import { useState, useEffect } from 'react';
import { auth, db } from '../../../firebase/config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Card from '../../../components/ui/Card';

export default function InvitationConfigPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [weddingId, setWeddingId] = useState(null);

    // CONFIG STATE
    const [config, setConfig] = useState({
        location: { enabled: false, address: '', mapUrl: '' },
        bank: { enabled: false, iban: '', message: '' },
        timeline: { enabled: false, events: [] },
    });

    // Timeline Event Input
    const [newEvent, setNewEvent] = useState({ time: '', title: '' });

    useEffect(() => {
        auth.onAuthStateChanged(async (user) => {
            if (!user) { router.push('/login'); return; }
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
                const wId = userDoc.data().weddingId;
                setWeddingId(wId);
                const wDoc = await getDoc(doc(db, 'weddings', wId));
                if (wDoc.exists() && wDoc.data().invitationConfig) {
                    setConfig(wDoc.data().invitationConfig);
                }
            }
            setLoading(false);
        });
    }, [router]);

    const handleSave = async () => {
        try {
            await updateDoc(doc(db, 'weddings', weddingId), {
                invitationConfig: config
            });
            alert('Configuración guardada correctamente');
        } catch (e) {
            console.error(e);
            alert('Error al guardar');
        }
    };

    const toggleModule = (module) => {
        setConfig(prev => ({
            ...prev,
            [module]: { ...prev[module], enabled: !prev[module].enabled }
        }));
    };

    const updateModule = (module, field, value) => {
        setConfig(prev => ({
            ...prev,
            [module]: { ...prev[module], [field]: value }
        }));
    };

    const addEvent = () => {
        if (!newEvent.time || !newEvent.title) return;
        setConfig(prev => ({
            ...prev,
            timeline: {
                ...prev.timeline,
                events: [...(prev.timeline.events || []), newEvent].sort((a, b) => a.time.localeCompare(b.time))
            }
        }));
        setNewEvent({ time: '', title: '' });
    };

    const removeEvent = (index) => {
        const newEvents = [...config.timeline.events];
        newEvents.splice(index, 1);
        setConfig(prev => ({
            ...prev,
            timeline: { ...prev.timeline, events: newEvents }
        }));
    };

    if (loading) return <div className="p-8 text-center">Cargando...</div>;

    return (
        <div className="grid lg:grid-cols-2 gap-8 h-[calc(100vh-100px)]">

            {/* LEFT: EDITOR */}
            <div className="overflow-y-auto pr-2 pb-20 space-y-6">
                <h1 className="text-3xl font-serif text-boda-text mb-6">Personalizar Invitación</h1>

                {/* MODULE: LOCATION */}
                <Card className={`transition border-2 ${config.location.enabled ? 'border-boda-green' : 'border-transparent'}`}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg flex items-center gap-2">📍 Ubicación <span className="text-xs font-normal text-gray-400">(Mapa y Dirección)</span></h3>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={config.location.enabled} onChange={() => toggleModule('location')} />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-boda-green"></div>
                        </label>
                    </div>
                    {config.location.enabled && (
                        <div className="space-y-3 animate-fade-in-up">
                            <input
                                type="text" placeholder="Dirección completa (Finca el Olivo...)"
                                className="w-full p-2 border rounded-lg text-sm"
                                value={config.location.address}
                                onChange={(e) => updateModule('location', 'address', e.target.value)}
                            />
                            <input
                                type="text" placeholder="URL de Google Maps"
                                className="w-full p-2 border rounded-lg text-sm"
                                value={config.location.mapUrl}
                                onChange={(e) => updateModule('location', 'mapUrl', e.target.value)}
                            />
                        </div>
                    )}
                </Card>

                {/* MODULE: BANK / GIFT */}
                <Card className={`transition border-2 ${config.bank.enabled ? 'border-boda-pink' : 'border-transparent'}`}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg flex items-center gap-2">🎁 Lista de Boda / Regalo</h3>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={config.bank.enabled} onChange={() => toggleModule('bank')} />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-boda-pink"></div>
                        </label>
                    </div>
                    {config.bank.enabled && (
                        <div className="space-y-3 animate-fade-in-up">
                            <textarea
                                placeholder="Mensaje para tus invitados (Ej: Vuestro mejor regalo es vuestra asistencia...)"
                                className="w-full p-2 border rounded-lg text-sm h-20"
                                value={config.bank.message}
                                onChange={(e) => updateModule('bank', 'message', e.target.value)}
                            />
                            <input
                                type="text" placeholder="IBAN o Número de Cuenta"
                                className="w-full p-2 border rounded-lg text-sm font-mono"
                                value={config.bank.iban}
                                onChange={(e) => updateModule('bank', 'iban', e.target.value)}
                            />
                        </div>
                    )}
                </Card>

                {/* MODULE: TIMELINE */}
                <Card className={`transition border-2 ${config.timeline.enabled ? 'border-purple-400' : 'border-transparent'}`}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg flex items-center gap-2">📅 Planning del Día</h3>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={config.timeline.enabled} onChange={() => toggleModule('timeline')} />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                        </label>
                    </div>
                    {config.timeline.enabled && (
                        <div className="space-y-3 animate-fade-in-up">
                            <div className="flex gap-2">
                                <input type="time" className="p-2 border rounded-lg" value={newEvent.time} onChange={e => setNewEvent({ ...newEvent, time: e.target.value })} />
                                <input type="text" className="p-2 border rounded-lg flex-1" placeholder="Ceremonia, Cóctel..." value={newEvent.title} onChange={e => setNewEvent({ ...newEvent, title: e.target.value })} />
                                <button onClick={addEvent} className="bg-purple-500 text-white px-3 rounded-lg">+</button>
                            </div>
                            <div className="space-y-2 mt-2">
                                {config.timeline.events?.map((ev, i) => (
                                    <div key={i} className="flex justify-between items-center bg-gray-50 p-2 rounded text-sm">
                                        <span><b>{ev.time}</b> - {ev.title}</span>
                                        <button onClick={() => removeEvent(i)} className="text-red-400 hover:text-red-600">×</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </Card>

                <button onClick={handleSave} className="w-full py-4 bg-boda-text text-white font-bold rounded-xl shadow-lg hover:bg-black transition sticky bottom-0 z-10">
                    Guardar Configuración
                </button>

            </div>

            {/* RIGHT: PREVIEW (NEW MOCKUP) */}
            <div className="hidden lg:flex justify-center items-start lg:sticky lg:top-4 h-full">
                <div className="w-[300px] h-[600px] bg-white border-8 border-gray-900 rounded-[3rem] shadow-2xl relative overflow-hidden flex flex-col scale-90 origin-top">
                    {/* STATUS BAR */}
                    <div className="h-6 bg-gray-900 w-full flex justify-center"><div className="w-20 h-4 bg-black rounded-b-xl"></div></div>

                    {/* UPDATED MOCKUP CONTENT */}
                    <div className="flex-1 overflow-y-auto p-4 bg-boda-bg scrollbar-hide relative pb-10">
                        {/* HEADER */}
                        <div className="h-32 bg-gray-50 flex items-center justify-center -m-4 mb-4">
                            <span className="text-4xl opacity-50">🌿</span>
                        </div>

                        <div className="text-center space-y-4 relative z-10">
                            <div>
                                <p className="text-[8px] uppercase tracking-[0.2em] font-bold text-gray-400">12/10/2026</p>
                                <p className="font-serif text-2xl text-boda-text leading-tight mt-1">Ana <span className="text-boda-green italic">&</span> Luis</p>
                            </div>

                            {/* COUNTDOWN */}
                            <div className="flex justify-center gap-2 scale-75">
                                <div className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-xs">20</div>
                                <div className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-xs">05</div>
                                <div className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-xs">43</div>
                            </div>

                            {/* TEXT */}
                            <div className="px-2">
                                <p className="font-serif italic text-sm text-boda-text mb-2">Querido invitado,</p>
                                <p className="text-[10px] text-gray-400 leading-relaxed font-light">Tenemos el inmenso placer de invitarte a celebrar nuestro enlace...</p>
                            </div>

                            {/* BUTTONS */}
                            <div className="flex justify-center gap-2 mt-2">
                                <div className="bg-boda-text text-white px-4 py-1.5 rounded-full text-[10px]">Asistiré</div>
                                <div className="bg-gray-100 text-gray-400 px-3 py-1.5 rounded-full text-[10px]">No podré</div>
                            </div>

                        </div>

                        {/* NEW: CIRCULAR ICONS ROW */}
                        <div className="flex justify-center gap-4 mt-8 pt-4 border-t border-gray-100 flex-wrap">
                            {config.location.enabled && (
                                <div className="flex flex-col items-center gap-1">
                                    <div className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center text-sm shadow-sm">📍</div>
                                    <span className="text-[8px] uppercase text-gray-300 tracking-widest">Mapa</span>
                                </div>
                            )}
                            {config.timeline.enabled && (
                                <div className="flex flex-col items-center gap-1">
                                    <div className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center text-sm shadow-sm">📅</div>
                                    <span className="text-[8px] uppercase text-gray-300 tracking-widest">Agenda</span>
                                </div>
                            )}
                            {config.bank.enabled && (
                                <div className="flex flex-col items-center gap-1">
                                    <div className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center text-sm shadow-sm">🎁</div>
                                    <span className="text-[8px] uppercase text-gray-300 tracking-widest">Regalo</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
