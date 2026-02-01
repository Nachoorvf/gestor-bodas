'use client';
import { useState, useEffect } from 'react';
import { auth, db } from '../../../firebase/config';
import { doc, getDoc, updateDoc, collection, query, limit, getDocs } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

export default function InvitationConfigPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [weddingId, setWeddingId] = useState(null);
    const [weddingData, setWeddingData] = useState(null); // Store full wedding data for preview
    const [previewUrl, setPreviewUrl] = useState(null);

    // CONFIG STATE
    const [config, setConfig] = useState({
        location: { enabled: false, address: '', mapUrl: '' },
        bank: { enabled: false, iban: '', message: '' },
        timeline: { enabled: false, events: [] },
        bus: { enabled: false }
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
                if (wDoc.exists()) {
                    setWeddingData(wDoc.data());
                    if (wDoc.data().invitationConfig) {
                        setConfig(wDoc.data().invitationConfig);
                    }

                    // FETCH A REAL INVITATION FOR PREVIEW
                    // We need a valid ID to render the page. We'll take the first one found.
                    const qInv = query(collection(db, 'weddings', wId, 'invitations'), limit(1));
                    const snapInv = await getDocs(qInv);
                    if (!snapInv.empty) {
                        const demoId = snapInv.docs[0].id;
                        // Construct local URL. In production this would be the full domain.
                        setPreviewUrl(`/invitacion/${wId}/${demoId}`);
                    }
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
            // Force reload iframe to see changes
            const currentUrl = previewUrl;
            setPreviewUrl(null);
            setTimeout(() => setPreviewUrl(currentUrl), 100);

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

    if (loading) return <div className="p-20 text-center font-serif text-[#333]">Cargando estudio de diseño...</div>;

    return (
        <div className="flex flex-col lg:flex-row gap-12 h-screen max-h-[calc(100vh-100px)] overflow-hidden">

            {/* LEFT: EDITOR PANEL */}
            <div className="flex-1 flex flex-col min-h-0 relative">
                <div className="flex-1 overflow-y-auto pr-4 pb-20 space-y-12 scrollbar-thin scrollbar-thumb-gray-200">
                    <div className="mb-4">
                        <p className="text-gray-400 uppercase tracking-[0.2em] text-[10px] font-bold mb-3">Estudio de Diseño</p>
                        <h1 className="text-4xl md:text-5xl font-display text-[#333] leading-tight">
                            Personaliza tu Invitación
                        </h1>
                    </div>

                    {/* MODULE: LOCATION */}
                    <div className={`p-8 rounded-xl transition-all duration-300 border ${config.location.enabled ? 'border-[#333]/20 bg-white shadow-sm' : 'border-gray-100 bg-gray-50/50'}`}>
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <span className="text-xl opacity-70">📍</span>
                                <h3 className="font-display text-xl text-[#333]">Ubicación y Mapa</h3>
                            </div>
                            <Switch checked={config.location.enabled} onChange={() => toggleModule('location')} />
                        </div>
                        {config.location.enabled && (
                            <div className="space-y-6 animate-fade-in-up">
                                <TextInput
                                    label="Dirección del Evento"
                                    placeholder="Ej: Finca El Olivar, Ctra. Antigua..."
                                    value={config.location.address}
                                    onChange={(e) => updateModule('location', 'address', e.target.value)}
                                />
                                <TextInput
                                    label="Enlace Google Maps"
                                    placeholder="https://maps.google.com/..."
                                    value={config.location.mapUrl}
                                    onChange={(e) => updateModule('location', 'mapUrl', e.target.value)}
                                />
                            </div>
                        )}
                    </div>

                    {/* MODULE: TIMELINE */}
                    <div className={`p-8 rounded-xl transition-all duration-300 border ${config.timeline.enabled ? 'border-[#333]/20 bg-white shadow-sm' : 'border-gray-100 bg-gray-50/50'}`}>
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <span className="text-xl opacity-70">📅</span>
                                <h3 className="font-display text-xl text-[#333]">Agenda (Timeline)</h3>
                            </div>
                            <Switch checked={config.timeline.enabled} onChange={() => toggleModule('timeline')} />
                        </div>
                        {config.timeline.enabled && (
                            <div className="space-y-6 animate-fade-in-up">
                                <div className="flex gap-4 items-end">
                                    <div className="w-32">
                                        <TextInput label="Hora" type="time" value={newEvent.time} onChange={e => setNewEvent({ ...newEvent, time: e.target.value })} />
                                    </div>
                                    <div className="flex-1">
                                        <TextInput label="Evento" placeholder="Ej: Ceremonia" value={newEvent.title} onChange={e => setNewEvent({ ...newEvent, title: e.target.value })} />
                                    </div>
                                    <button onClick={addEvent} className="h-[42px] px-4 bg-[#333] text-white rounded-lg hover:bg-black transition text-xl flex items-center justify-center mb-[1px]">+</button>
                                </div>

                                <div className="space-y-2 pt-2">
                                    {config.timeline.events?.map((ev, i) => (
                                        <div key={i} className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border border-gray-100">
                                            <div className="flex items-center gap-4">
                                                <span className="font-bold font-display text-[#333]">{ev.time}</span>
                                                <span className="text-sm text-gray-600 uppercase tracking-wider">{ev.title}</span>
                                            </div>
                                            <button onClick={() => removeEvent(i)} className="text-gray-300 hover:text-red-400 transition">×</button>
                                        </div>
                                    ))}
                                    {(!config.timeline.events || config.timeline.events.length === 0) && (
                                        <p className="text-xs text-center text-gray-400 italic py-2">Añade eventos para crear la agenda.</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>


                    {/* MODULE: BANK / GIFT */}
                    <div className={`p-8 rounded-xl transition-all duration-300 border ${config.bank.enabled ? 'border-[#333]/20 bg-white shadow-sm' : 'border-gray-100 bg-gray-50/50'}`}>
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <span className="text-xl opacity-70">🎁</span>
                                <h3 className="font-display text-xl text-[#333]">Regalos / Lista</h3>
                            </div>
                            <Switch checked={config.bank.enabled} onChange={() => toggleModule('bank')} />
                        </div>
                        {config.bank.enabled && (
                            <div className="space-y-6 animate-fade-in-up">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Mensaje Agradecimiento</label>
                                    <textarea
                                        placeholder="Vuestra presencia es nuestro mejor regalo..."
                                        className="w-full p-3 bg-transparent border-b border-gray-200 focus:border-[#333] outline-none transition text-sm font-serif h-24 resize-none placeholder-gray-300"
                                        value={config.bank.message}
                                        onChange={(e) => updateModule('bank', 'message', e.target.value)}
                                    />
                                </div>
                                <TextInput
                                    label="IBAN / Cuenta"
                                    placeholder="ESXX XXXX..."
                                    value={config.bank.iban}
                                    onChange={(e) => updateModule('bank', 'iban', e.target.value)}
                                />
                            </div>
                        )}
                    </div>

                    {/* MODULE: BUS SERVICE */}
                    <div className={`p-8 rounded-xl transition-all duration-300 border ${config.bus?.enabled ? 'border-[#333]/20 bg-white shadow-sm' : 'border-gray-100 bg-gray-50/50'}`}>
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <span className="text-xl opacity-70">🚌</span>
                                <h3 className="font-display text-xl text-[#333]">Servicio de Autobús</h3>
                            </div>
                            <Switch checked={config.bus?.enabled || false} onChange={() => toggleModule('bus')} />
                        </div>
                        {config.bus?.enabled && (
                            <div className="animate-fade-in-up text-sm text-gray-500 italic">
                                Al activar esta opción, los invitados verán una casilla para confirmar si necesitan transporte.
                            </div>
                        )}
                    </div>


                </div>

                <div className="pt-4 pb-6 bg-white border-t border-gray-100 z-10 sticky bottom-0">
                    <button onClick={handleSave} className="w-full py-4 bg-[#333] text-white font-bold text-xs uppercase tracking-[0.2em] rounded-lg shadow-xl hover:bg-black hover:scale-[1.01] transition-all duration-300">
                        Guardar y Publicar
                    </button>
                    <p className="text-center text-[10px] text-gray-400 mt-3">Los cambios se aplican instantáneamente en la invitación web.</p>
                </div>
            </div>

            {/* RIGHT: LIVE PREVIEW (IPHONE MOCKUP) */}
            <div className="hidden lg:flex flex-col items-center justify-center flex-1 bg-[#F9F9F9] rounded-3xl m-4 border border-gray-100 relative">
                <p className="absolute top-8 text-[10px] font-bold uppercase tracking-[0.3em] text-gray-300">Vista Previa en Vivo</p>

                <div className="w-[375px] h-[812px] bg-white border-[14px] border-[#333] rounded-[3rem] shadow-2xl relative overflow-hidden flex flex-col transform scale-90">
                    {/* CAMERA ISLAND */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 h-7 w-40 bg-[#333] rounded-b-2xl z-20"></div>

                    {/* LIVE CONTENT IFRAME */}
                    <div className="flex-1 bg-white relative">
                        {previewUrl ? (
                            <iframe
                                src={previewUrl}
                                className="w-full h-full border-none"
                                title="Live Preview"
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center text-gray-400">
                                <span className="text-4xl mb-4">✨</span>
                                <p className="text-sm font-medium">Crea al menos un invitado para generar una vista previa real.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
}

// UI COMPONENTS FOR EDITOR
function TextInput({ label, type = "text", value, onChange, placeholder }) {
    return (
        <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{label}</label>
            <input
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className="w-full pb-2 bg-transparent border-b border-gray-200 focus:border-[#333] outline-none transition text-sm font-medium text-[#333] placeholder-gray-300"
            />
        </div>
    );
}

function Switch({ checked, onChange }) {
    return (
        <button
            onClick={onChange}
            className={`w-12 h-6 rounded-full transition-all duration-300 relative ${checked ? 'bg-[#333]' : 'bg-gray-200'}`}
        >
            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm ${checked ? 'translate-x-6' : 'translate-x-0'}`}></div>
        </button>
    );
}

// UI COMPONENTS FOR MOCKUP
function MockupButton({ icon, label, enabled }) {
    if (!enabled) return null;
    return (
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-sm shadow-sm">{icon}</div>
            <span className="text-xs font-display text-[#333]">{label}</span>
            <div className="ml-auto text-[10px] text-gray-400">→</div>
        </div>
    );
}
