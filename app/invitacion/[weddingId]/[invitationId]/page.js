'use client';
import { useState, useEffect } from 'react';
import { db } from '../../../../firebase/config';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import { MapPin, Gift, Calendar, ExternalLink, ChevronDown, Check, Copy } from 'lucide-react'; // Added 'Copy'

export default function InvitationPublicPage() {
    const { weddingId, invitationId } = useParams();

    const [invitation, setInvitation] = useState(null);
    const [guests, setGuests] = useState([]);
    const [weddingData, setWeddingData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // MODAL STATES
    const [activeModal, setActiveModal] = useState(null); // 'rsvp' | 'timeline' | 'gift'

    // Load Data
    useEffect(() => {
        if (!weddingId || !invitationId) return;

        const loadData = async () => {
            try {
                const wSnap = await getDoc(doc(db, 'weddings', weddingId));
                if (wSnap.exists()) setWeddingData(wSnap.data());

                const invSnap = await getDoc(doc(db, 'weddings', weddingId, 'invitations', invitationId));
                if (!invSnap.exists()) {
                    setError('Invitación no encontrada');
                    setLoading(false);
                    return;
                }
                setInvitation({ id: invSnap.id, ...invSnap.data() });

                const q = query(collection(db, 'weddings', weddingId, 'guests'), where('invitationId', '==', invitationId));
                const gSnap = await getDocs(q);
                const guestsData = gSnap.docs.map(d => ({ id: d.id, ...d.data() }));

                setGuests(guestsData);
            } catch (err) {
                console.error(err);
                setError('Error al cargar la invitación');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [weddingId, invitationId]);

    // Handlers
    const updateGuestState = (guestId, field, value) => {
        setGuests(prev => prev.map(g => {
            if (g.id !== guestId) return g;
            if (field === 'confirmado' && value === false) {
                return { ...g, confirmado: false, bus: false };
            }
            return { ...g, [field]: value };
        }));
    };

    const handleSaveAll = async () => {
        setSaving(true);
        try {
            const batch = writeBatch(db);
            guests.forEach(g => {
                const ref = doc(db, 'weddings', weddingId, 'guests', g.id);
                batch.update(ref, { confirmado: g.confirmado, bus: g.bus });
            });
            await batch.commit();
            alert("¡Muchas gracias! Vuestra asistencia ha sido confirmada.");
            setActiveModal(null);
        } catch (err) {
            console.error(err);
            alert("Hubo un problema al guardar.");
        } finally {
            setSaving(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        alert("IBAN copiado al portapapeles");
    };

    // Render Helpers
    const renderModules = () => {
        const config = weddingData?.invitationConfig;
        if (!config) return null;

        return (
            <div className="flex flex-wrap justify-center gap-4 mt-8 animate-fade-in-up" style={{ animationDelay: '200ms' }}>

                {/* LOCATION MODULE */}
                {config.location?.enabled && (
                    <a
                        href={config.location.mapUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 bg-white/60 backdrop-blur px-6 py-4 rounded-2xl border border-white/50 shadow-sm hover:bg-white transition group"
                    >
                        <div className="w-10 h-10 rounded-full bg-[#333] text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                            <MapPin size={18} />
                        </div>
                        <div className="text-left">
                            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Ubicación</p>
                            <p className="font-serif text-[#333]">{config.location.address || "Ver Mapa"}</p>
                        </div>
                    </a>
                )}

                {/* TIMELINE MODULE */}
                {config.timeline?.enabled && (
                    <button
                        onClick={() => setActiveModal('timeline')}
                        className="flex items-center gap-3 bg-white/60 backdrop-blur px-6 py-4 rounded-2xl border border-white/50 shadow-sm hover:bg-white transition group"
                    >
                        <div className="w-10 h-10 rounded-full bg-[#333] text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Calendar size={18} />
                        </div>
                        <div className="text-left">
                            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Agenda</p>
                            <p className="font-serif text-[#333]">Ver Horarios</p>
                        </div>
                    </button>
                )}

                {/* GIFT / BANK MODULE */}
                {config.bank?.enabled && (
                    <button
                        onClick={() => setActiveModal('gift')}
                        className="flex items-center gap-3 bg-white/60 backdrop-blur px-6 py-4 rounded-2xl border border-white/50 shadow-sm hover:bg-white transition group"
                    >
                        <div className="w-10 h-10 rounded-full bg-[#333] text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Gift size={18} />
                        </div>
                        <div className="text-left">
                            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Regalo</p>
                            <p className="font-serif text-[#333]">Lista de Boda</p>
                        </div>
                    </button>
                )}
            </div>
        );
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-stone-100">
            <div className="animate-pulse flex flex-col items-center">
                <div className="w-12 h-12 border-4 border-[#333] border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="font-serif text-[#333]">Cargando invitación...</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="min-h-screen flex items-center justify-center bg-stone-100 text-center p-6">
            <div>
                <h1 className="text-3xl font-serif text-[#333] mb-2">Ops...</h1>
                <p className="text-gray-600">{error}</p>
            </div>
        </div>
    );

    // Dynamic Names
    const partner1 = weddingData?.novios?.[0] || "Ana";
    const partner2 = weddingData?.novios?.[1] || "Carlos";

    return (
        <div className="min-h-screen bg-[#FDFBF7] text-[#333] font-sans selection:bg-[#333] selection:text-white flex flex-col">

            {/* HERO SECTION */}
            <div className="min-h-screen flex flex-col relative overflow-hidden py-10">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1606800052052-a08af7148866?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-10 grayscale mix-blend-multiply"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-[#FDFBF7]/0 via-[#FDFBF7]/50 to-[#FDFBF7]"></div>

                <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center p-8 space-y-6 animate-fade-in-up">
                    <p className="uppercase tracking-[0.4em] text-xs font-bold text-gray-500">Estás invitado a la boda de</p>

                    <h1 className="font-display text-5xl md:text-8xl text-[#333] leading-tight">
                        {partner1} <span className="text-3xl md:text-5xl font-serif italic text-gray-400">&</span><br />{partner2}
                    </h1>

                    <div className="w-10 h-[1px] bg-[#333] my-6"></div>

                    <div className="font-serif italic text-xl text-gray-600 max-w-md leading-relaxed px-4">
                        "¡Queremos celebrar el amor con la gente que más queremos!"
                    </div>

                    <div className="mt-8 bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-white/50 max-w-sm w-full mx-auto transform hover:scale-105 transition-transform duration-500">
                        <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-2 font-bold">Invitación para</p>
                        <h2 className="text-2xl font-display text-[#333]">{invitation.name}</h2>
                    </div>

                    {renderModules()}
                </div>

                <div className="relative z-20 pb-12 px-6 flex justify-center mt-auto">
                    <button
                        onClick={() => setActiveModal('rsvp')}
                        className="group relative bg-[#333] text-white px-10 py-5 rounded-full font-bold uppercase tracking-[0.2em] text-sm hover:bg-black transition-all shadow-2xl hover:shadow-xl hover:-translate-y-1 w-full max-w-sm overflow-hidden"
                    >
                        <span className="relative z-10 flex items-center justify-center gap-2">
                            Confirmar Asistencia <ChevronDown size={16} className="animate-bounce" />
                        </span>
                        <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    </button>
                </div>
            </div>

            {/* SHARED MODAL OVERLAY */}
            {activeModal && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setActiveModal(null)}></div>

                    <div className="bg-white w-full md:max-w-2xl h-[85vh] md:h-auto md:max-h-[90vh] rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl relative flex flex-col animate-slide-up-mobile md:animate-fade-in-up">

                        {/* Modal Header */}
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center shrink-0">
                            <div>
                                {activeModal === 'rsvp' && <h3 className="font-serif text-2xl text-[#333]">Vuestra Asistencia</h3>}
                                {activeModal === 'timeline' && <h3 className="font-serif text-2xl text-[#333]">Agenda del Día</h3>}
                                {activeModal === 'gift' && <h3 className="font-serif text-2xl text-[#333]">Lista de Boda</h3>}
                            </div>
                            <button onClick={() => setActiveModal(null)} className="w-10 h-10 rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 flex items-center justify-center transition">✕</button>
                        </div>

                        {/* CONTENT AREA */}
                        <div className="flex-1 overflow-y-auto p-6 md:p-8">

                            {/* RSVP CONTENT */}
                            {activeModal === 'rsvp' && (
                                <div className="space-y-6">
                                    {guests.map((guest, idx) => (
                                        <div key={guest.id} className="flex flex-col gap-3 py-2 border-b border-gray-50 last:border-0">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-serif italic text-gray-400 text-sm">{idx + 1}</div>
                                                <span className="text-lg font-bold text-[#333]">{guest.nombre}</span>
                                            </div>
                                            <div className="pl-11 grid grid-cols-2 gap-3">
                                                <button onClick={() => updateGuestState(guest.id, 'confirmado', true)} className={`py-3 px-4 rounded-xl border-2 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${guest.confirmado === true ? 'border-[#333] bg-[#333] text-white' : 'border-gray-100 bg-white text-gray-400 hover:border-gray-300'}`}>{guest.confirmado === true && <Check size={14} />} Sí, voy</button>
                                                <button onClick={() => updateGuestState(guest.id, 'confirmado', false)} className={`py-3 px-4 rounded-xl border-2 text-xs font-bold uppercase tracking-wider transition-all ${guest.confirmado === false ? 'border-gray-200 bg-gray-100 text-gray-500' : 'border-gray-100 bg-white text-gray-400 hover:border-gray-300'}`}>No puedo</button>
                                            </div>
                                            {weddingData?.invitationConfig?.bus?.enabled && (
                                                <div className={`pl-11 transition-all duration-300 overflow-hidden ${guest.confirmado === true ? 'max-h-20 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
                                                    <label className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl cursor-pointer hover:bg-stone-100 transition border border-transparent hover:border-stone-200">
                                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition ${guest.bus ? 'bg-[#333] border-[#333]' : 'bg-white border-gray-300'}`}>{guest.bus && <Check size={12} className="text-white" />}</div>
                                                        <input type="checkbox" checked={guest.bus || false} onChange={(e) => updateGuestState(guest.id, 'bus', e.target.checked)} className="hidden" />
                                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Necesitaré Autobús</span>
                                                    </label>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    <div className="pt-6">
                                        <button onClick={handleSaveAll} disabled={saving} className="w-full bg-[#333] text-white py-4 rounded-xl font-bold uppercase tracking-[0.2em] text-sm hover:bg-black transition-all shadow-lg active:scale-[0.98]">{saving ? 'Guardando...' : 'Enviar Respuesta'}</button>
                                    </div>
                                </div>
                            )}

                            {/* TIMELINE CONTENT */}
                            {activeModal === 'timeline' && (
                                <div className="space-y-8 relative pl-4 border-l border-gray-100 ml-2">
                                    {weddingData?.invitationConfig?.timeline?.events?.length > 0 ? (
                                        weddingData.invitationConfig.timeline.events.map((evt, i) => (
                                            <div key={i} className="relative pl-6 animate-fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
                                                <div className="absolute -left-[21px] top-1 w-4 h-4 rounded-full border-2 border-[#333] bg-white"></div>
                                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{evt.time}</span>
                                                <h4 className="font-serif text-xl text-[#333] mt-1">{evt.title}</h4>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-center text-gray-400 italic">No hay eventos publicados aún.</p>
                                    )}
                                </div>
                            )}

                            {/* GIFT CONTENT */}
                            {activeModal === 'gift' && (
                                <div className="text-center space-y-6 py-6">
                                    <div className="w-16 h-16 bg-[#333] text-white rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Gift size={32} />
                                    </div>
                                    <p className="font-serif text-lg text-gray-600 leading-relaxed italic px-4">
                                        "{weddingData?.invitationConfig?.bank?.message || 'Vuestra presencia es nuestro mayor regalo.'}"
                                    </p>
                                    {weddingData?.invitationConfig?.bank?.iban && (
                                        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 flex flex-col items-center gap-2 group cursor-pointer hover:bg-gray-100 transition" onClick={() => copyToClipboard(weddingData.invitationConfig.bank.iban)}>
                                            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Número de Cuenta</p>
                                            <div className="flex items-center gap-3">
                                                <p className="font-mono text-xl md:text-2xl text-[#333] tracking-widest">{weddingData.invitationConfig.bank.iban}</p>
                                                <Copy size={16} className="text-gray-400 group-hover:text-[#333]" />
                                            </div>
                                            <p className="text-[10px] text-gray-400 mt-2">Click para copiar</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

