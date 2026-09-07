'use client';
import { useState, useEffect, useRef } from 'react';
import { db } from '../../../../firebase/config';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { useParams, useSearchParams } from 'next/navigation';
import { MapPin, Gift, Calendar, ExternalLink, ChevronDown, Check, Copy, Clock, Image as ImageIcon, Music, MessageSquare, Send, Bus, ArrowRight, ArrowLeft, X, ChevronRight, Lock } from 'lucide-react';

// ─── BUS SELECTION SHEET ─────────────────────────────────────────────────────
function BusSheet({ guest, busConfig, onUpdate, onClose }) {
    if (!guest || !busConfig) return null;

    const busObj = (typeof guest.bus === 'object' && guest.bus) ? guest.bus : { ida: null, vuelta: null };
    const hasIda = busConfig.ida?.enabled && busConfig.ida?.stops?.length > 0;
    const hasVuelta = busConfig.vuelta?.enabled && busConfig.vuelta?.stops?.length > 0;

    const StopOption = ({ stop, selected, onClick }) => (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 text-left ${
                selected
                    ? 'border-[var(--primary)] bg-[var(--primary)]/5 shadow-sm'
                    : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'
            }`}
        >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                selected ? 'bg-[var(--primary)] text-white' : 'bg-gray-100 text-gray-400'
            }`}>
                <Clock size={18} />
            </div>
            <div className="flex-1 min-w-0">
                {stop.time && <p className={`text-xl font-bold ${selected ? 'text-[var(--primary)]' : 'text-[#333]'}`}>{stop.time}</p>}
                {stop.location && <p className="text-sm text-gray-500 truncate">{stop.location}</p>}
            </div>
            {selected && (
                <div className="w-6 h-6 rounded-full bg-[var(--primary)] flex items-center justify-center shrink-0">
                    <Check size={12} className="text-white" />
                </div>
            )}
        </button>
    );

    return (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
                style={{ animation: 'fadeIn 0.2s ease' }}
            />
            {/* Sheet */}
            <div
                className="relative bg-white w-full max-w-lg rounded-t-[2.5rem] shadow-2xl flex flex-col max-h-[85vh]"
                style={{ animation: 'slideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
            >
                {/* Handle */}
                <div className="flex justify-center pt-4 pb-2 shrink-0">
                    <div className="w-10 h-1 rounded-full bg-gray-200" />
                </div>

                {/* Header */}
                <div className="px-6 pb-4 pt-2 flex items-center justify-between shrink-0">
                    <div>
                        <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-0.5">Autobús para</p>
                        <h3 className="font-serif text-2xl text-[#333]">{guest.nombre}</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 transition"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto px-6 pb-8 space-y-8">
                    {hasIda && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <ArrowRight size={14} className="text-gray-400" />
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Parada de Ida</p>
                            </div>
                            <div className="space-y-2">
                                {busConfig.ida.stops.map(stop => (
                                    <StopOption
                                        key={stop.id}
                                        stop={stop}
                                        selected={busObj.ida === stop.id}
                                        onClick={() => {
                                            const newId = busObj.ida === stop.id ? null : stop.id;
                                            onUpdate(guest.id, 'busStop', { dir: 'ida', stopId: newId });
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {hasVuelta && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <ArrowLeft size={14} className="text-gray-400" />
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Parada de Vuelta</p>
                            </div>
                            <div className="space-y-2">
                                {busConfig.vuelta.stops.map(stop => (
                                    <StopOption
                                        key={stop.id}
                                        stop={stop}
                                        selected={busObj.vuelta === stop.id}
                                        onClick={() => {
                                            const newId = busObj.vuelta === stop.id ? null : stop.id;
                                            onUpdate(guest.id, 'busStop', { dir: 'vuelta', stopId: newId });
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {busConfig.notes && (
                        <div className="bg-stone-50 rounded-2xl p-4">
                            <p className="text-xs text-gray-500 italic leading-relaxed">{busConfig.notes}</p>
                        </div>
                    )}

                    {/* Confirm */}
                    <button
                        onClick={onClose}
                        className="w-full bg-[var(--primary)] text-white py-4 rounded-2xl font-bold uppercase tracking-[0.15em] text-sm transition hover:opacity-90 active:scale-[0.98]"
                    >
                        Confirmar Paradas
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            `}</style>
        </div>
    );
}

export default function InvitationPublicPage() {
    const { weddingId, invitationId } = useParams();

    const [invitation, setInvitation] = useState(null);
    const [guests, setGuests] = useState([]);
    const [weddingData, setWeddingData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // MODAL STATES
    const [activeModal, setActiveModal] = useState(null); // 'rsvp' | 'timeline'
    const [notification, setNotification] = useState(null); // { message, type: 'success'|'error' }
    const [isGiftExpanded, setIsGiftExpanded] = useState(false);
    // BUS SHEET: which guest's bus is being edited (null = closed)
    const [busSheetGuestId, setBusSheetGuestId] = useState(null);
    const busSheetGuest = guests.find(g => g.id === busSheetGuestId) || null;

    // INDEPENDENT BLOCKS STATE
    const [songInputs, setSongInputs] = useState({});
    const [messageInputs, setMessageInputs] = useState({});
    const [selectedGuestForSong, setSelectedGuestForSong] = useState('');
    const [selectedGuestForMessage, setSelectedGuestForMessage] = useState('');
    const [submittingSong, setSubmittingSong] = useState(false);
    const [submittingMessage, setSubmittingMessage] = useState(false);

    useEffect(() => {
        if (guests && guests.length > 0) {
            if (!selectedGuestForSong) setSelectedGuestForSong(guests[0].id);
            if (!selectedGuestForMessage) setSelectedGuestForMessage(guests[0].id);
        }
    }, [guests]);

    // Toast Timer
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    const searchParams = useSearchParams();
    const isEditor = searchParams.get('editor') === 'true';

    useEffect(() => {
        if (!weddingId || !invitationId) return;

        const loadData = async () => {
            try {
                // Fetch wedding data first to get invitationConfig and names even in preview/editor
                const wSnap = await getDoc(doc(db, 'weddings', weddingId));
                let wData = null;
                if (wSnap.exists()) {
                    wData = wSnap.data();
                    setWeddingData(wData);
                }

                if (invitationId === 'preview' || isEditor) {
                    setInvitation({ id: 'preview', guestInfo: { name: 'Familia García' }, name: 'Familia García' });
                    setGuests([
                        { id: 'demo1', nombre: 'Carlos García' },
                        { id: 'demo2', nombre: 'Laura Martínez' }
                    ]);
                    if (!wData) {
                        setWeddingData({ invitationConfig: {} });
                    }
                    setLoading(false);
                    return;
                }

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

    // REAL-TIME PREVIEW LISTENER
    useEffect(() => {
        const handleMessage = (event) => {
            if (event.data?.type === 'UPDATE_CONFIG') {
                setWeddingData(prev => ({
                    ...(prev || {}),
                    invitationConfig: event.data.config
                }));
            }
        };

        window.addEventListener('message', handleMessage);
        
        // Notify parent that the iframe is ready to receive configuration
        window.parent.postMessage({ type: 'IFRAME_READY' }, '*');

        return () => window.removeEventListener('message', handleMessage);
    }, []);

    // Handlers
    const handleSaveSongBlock = async (blockId) => {
        if (!selectedGuestForSong || !songInputs[blockId]) return;
        setSubmittingSong(true);
        try {
            if (invitationId !== 'preview') {
                const guestRef = doc(db, 'weddings', weddingId, 'guests', selectedGuestForSong);
                await updateDoc(guestRef, { cancion: songInputs[blockId] });
            }
            setNotification({ message: "¡Canción enviada a la lista!", type: 'success' });
            setSongInputs(prev => ({ ...prev, [blockId]: '' }));
        } catch (error) {
            console.error(error);
            setNotification({ message: "Error al enviar la canción", type: 'error' });
        } finally {
            setSubmittingSong(false);
        }
    };

    const handleSaveMessageBlock = async (blockId) => {
        if (!selectedGuestForMessage || !messageInputs[blockId]) return;
        setSubmittingMessage(true);
        try {
            if (invitationId !== 'preview') {
                const guestRef = doc(db, 'weddings', weddingId, 'guests', selectedGuestForMessage);
                await updateDoc(guestRef, { mensaje: messageInputs[blockId] });
            }
            setNotification({ message: "¡Mensaje guardado en el libro!", type: 'success' });
            setMessageInputs(prev => ({ ...prev, [blockId]: '' }));
        } catch (error) {
            console.error(error);
            setNotification({ message: "Error al enviar el mensaje", type: 'error' });
        } finally {
            setSubmittingMessage(false);
        }
    };
    const updateGuestState = (guestId, field, value) => {
        setGuests(prev => prev.map(g => {
            if (g.id !== guestId) return g;
            if (field === 'confirmado' && value === false) {
                return { ...g, confirmado: false, bus: null, alergias: '' };
            }
            if (field === 'busEnabled') {
                return { ...g, bus: value ? { ida: null, vuelta: null } : null };
            }
            if (field === 'busStop') {
                // value = { dir: 'ida'|'vuelta', stopId }
                const currentBus = (typeof g.bus === 'object' && g.bus) ? g.bus : { ida: null, vuelta: null };
                return { ...g, bus: { ...currentBus, [value.dir]: value.stopId } };
            }
            return { ...g, [field]: value };
        }));
    };

    const handleSaveAll = async () => {
        setSaving(true);
        try {
            const batch = writeBatch(db);
            guests.forEach(g => {
                const guestRef = doc(db, 'weddings', weddingId, 'guests', g.id);
                batch.update(guestRef, {
                    confirmado: g.confirmado,
                    bus: g.bus ?? null,
                    alergias: g.alergias || ''
                });
            });
            await batch.commit();
            setNotification({ message: "¡Muchas gracias! Asistencia confirmada.", type: 'success' });
            setTimeout(() => setActiveModal(null), 1500);
        } catch (err) {
            console.error(err);
            setNotification({ message: "Hubo un problema al guardar.", type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    // Helper for IBAN copy
    const [copiedIban, setCopiedIban] = useState(false);
    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setCopiedIban(true);
        setTimeout(() => setCopiedIban(false), 2000);
        setNotification({ message: "IBAN copiado al portapapeles", type: 'success' });
    };

    // Render Helpers
    const renderModules = () => {
        const config = weddingData?.invitationConfig;
        if (!config) return null;

        // UNIFIED LIST — includes RSVP so it respects user-defined order
        const fixed = ['location', 'timeline', 'bank', 'rsvp'].map(key => ({
            id: key,
            type: 'fixed',
            order: config[key]?.order || 99,
            ...config[key]
        }));
        const custom = (config.customBlocks || []).map(b => ({
            ...b,
            isCustom: true
        }));

        // Filter: location/timeline/bank require enabled; rsvp is always shown
        const allItems = [...fixed, ...custom]
            .filter(item => item.id === 'rsvp' || item.isCustom || item.enabled)
            .sort((a, b) => a.order - b.order);

        return (
            <div className="flex flex-col items-center gap-6 mt-12 w-full max-w-lg mx-auto">
                {allItems.map((item, index) => {

                    // --- FIXED MODULES ---
                    if (item.id === 'location') {
                        return (
                            <ScrollReveal key={item.id} delay={index * 80}>
                                <a href={item.mapUrl || '#'} target="_blank" rel="noopener noreferrer" className="w-full flex items-center gap-4 bg-white/60 backdrop-blur px-6 py-5 rounded-2xl border border-white/50 shadow-sm hover:bg-white hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
                                    <div className="w-12 h-12 rounded-full bg-[var(--primary)] text-white flex items-center justify-center group-hover:scale-110 transition-transform shrink-0"><MapPin size={20} /></div>
                                    <div className="text-left">
                                        <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">{item.title || 'Ubicación'}</p>
                                        <p className="font-serif text-[#333] text-lg">{item.address || "Ver Mapa"}</p>
                                    </div>
                                </a>
                            </ScrollReveal>
                        );
                    }
                    if (item.id === 'timeline') {
                        return (
                            <ScrollReveal key={item.id} delay={index * 80}>
                                <button onClick={() => setActiveModal('timeline')} className="w-full flex items-center gap-4 bg-white/60 backdrop-blur px-6 py-5 rounded-2xl border border-white/50 shadow-sm hover:bg-white hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
                                    <div className="w-12 h-12 rounded-full bg-[var(--primary)] text-white flex items-center justify-center group-hover:scale-110 transition-transform shrink-0"><Calendar size={20} /></div>
                                    <div className="text-left">
                                        <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">{item.title || 'Agenda'}</p>
                                        <p className="font-serif text-[#333] text-lg">Ver Horarios</p>
                                    </div>
                                </button>
                            </ScrollReveal>
                        );
                    }
                    if (item.id === 'bank') {
                        return (
                            <ScrollReveal key={item.id} delay={index * 80}>
                                <div className="w-full">
                                    {/* Collapsed trigger — card style matching other modules */}
                                    <button
                                        onClick={() => setIsGiftExpanded(!isGiftExpanded)}
                                        className={`w-full flex items-center gap-4 px-6 py-5 rounded-2xl border shadow-sm transition-all duration-300 group
                                            ${isGiftExpanded
                                                ? 'bg-[var(--primary)]/5 border-[var(--primary)]/30'
                                                : 'bg-white/60 backdrop-blur border-white/50 hover:bg-white hover:shadow-md hover:-translate-y-0.5'}`}
                                    >
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-all duration-300
                                            ${isGiftExpanded ? 'bg-[var(--primary)] text-white' : 'bg-[var(--primary)] text-white group-hover:scale-110'}`}>
                                            <Gift size={20} />
                                        </div>
                                        <div className="text-left flex-1 min-w-0">
                                            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">{item.title || 'Lista de Bodas'}</p>
                                            <p className="font-serif text-[#333] text-lg">{isGiftExpanded ? 'Ver detalles' : (item.subtitle || 'Hacernos un regalo')}</p>
                                        </div>
                                        <div className={`w-7 h-7 rounded-full border border-gray-200 bg-white flex items-center justify-center transition-transform duration-300 ${isGiftExpanded ? 'rotate-180' : ''}`}>
                                            <ChevronDown size={14} className="text-gray-400" />
                                        </div>
                                    </button>

                                    {/* Expanded content */}
                                    <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isGiftExpanded ? 'max-h-[400px] opacity-100 mt-2' : 'max-h-0 opacity-0 mt-0'}`}>
                                        <div className="bg-white/70 backdrop-blur border border-[var(--primary)]/15 rounded-2xl px-6 py-5 space-y-4 shadow-sm">
                                            {(item.message) && (
                                                <p className="font-serif text-sm text-[#333] leading-relaxed text-center italic opacity-80">
                                                    &ldquo;{item.message}&rdquo;
                                                </p>
                                            )}
                                            {item.iban && (
                                                <div
                                                    onClick={() => copyToClipboard(item.iban)}
                                                    className="cursor-pointer group/iban bg-white rounded-2xl p-4 border border-[var(--primary)]/20 hover:border-[var(--primary)]/50 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col items-center gap-2"
                                                >
                                                    <p className="text-[10px] uppercase tracking-[0.18em] text-gray-400 font-bold">Número de Cuenta</p>
                                                    <div className="flex items-center gap-3">
                                                        <p className="font-mono text-base text-[#333] font-semibold tracking-wider">{item.iban}</p>
                                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200
                                                            ${copiedIban ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400 group-hover/iban:bg-[var(--primary)]/10 group-hover/iban:text-[var(--primary)]'}`}>
                                                            {copiedIban ? <Check size={14} /> : <Copy size={14} />}
                                                        </div>
                                                    </div>
                                                    <p className="text-[10px] text-gray-400 font-medium">
                                                        {copiedIban ? '✓ Copiado al portapapeles' : 'Toca para copiar el IBAN'}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </ScrollReveal>
                        );
                    }
                    // RSVP button in-order
                    if (item.id === 'rsvp') {
                        return (
                            <ScrollReveal key={item.id} delay={index * 80}>
                                <button
                                    onClick={() => setActiveModal('rsvp')}
                                    className="group relative w-full max-w-sm bg-[var(--primary)] text-white px-10 py-5 rounded-full font-bold uppercase tracking-[0.2em] text-sm hover:opacity-95 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 overflow-hidden"
                                >
                                    <span className="relative z-10 flex items-center justify-center gap-2">
                                        Confirmar Asistencia <ChevronDown size={16} className="animate-bounce" />
                                    </span>
                                    <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                </button>
                            </ScrollReveal>
                        );
                    }

                    // --- CUSTOM BLOCKS ---
                    if (item.isCustom) {
                        return (
                            <ScrollReveal key={item.id} delay={index * 80}>
                                <div className="w-full">
                                    {item.type === 'text' && (
                                        <div className="text-center space-y-4 py-4">
                                            {item.title && <h3 className="font-display text-3xl text-[#333]">{item.title}</h3>}
                                            <p className="font-serif text-gray-600 leading-relaxed whitespace-pre-wrap">{item.content}</p>
                                        </div>
                                    )}
                                    {item.type === 'image' && (
                                        <div className="rounded-2xl overflow-hidden shadow-lg border-4 border-white transform rotate-1 hover:rotate-0 transition duration-500">
                                            {item.content ? (
                                                <img src={item.content} alt={item.title} loading="lazy" className="w-full h-auto object-cover" />
                                            ) : (
                                                <div className="w-full aspect-video bg-gray-100 flex flex-col items-center justify-center text-gray-400">
                                                    <ImageIcon size={48} className="mb-2 opacity-50" />
                                                </div>
                                            )}
                                            {item.title && <p className="bg-white text-center py-2 font-display text-xl text-[#333]">{item.title}</p>}
                                        </div>
                                    )}
                                    {item.type === 'video' && (
                                        <div className="rounded-2xl overflow-hidden shadow-lg border-4 border-white aspect-video bg-black">
                                            <iframe src={item.content} className="w-full h-full" allowFullScreen title={item.title} />
                                        </div>
                                    )}

                                    {item.type === 'countdown' && (
                                        <CountdownBlock targetDate={item.content} title={item.title} />
                                    )}

                                    {item.type === 'gallery' && (
                                        <GalleryBlock images={item.content} title={item.title} />
                                    )}

                                    {item.type === 'song' && (
                                        <div className="bg-white/60 backdrop-blur rounded-2xl p-6 border border-white/50 shadow-sm space-y-4">
                                            <div className="flex items-center gap-3 justify-center mb-2">
                                                <Music className="text-[var(--primary)]" size={24} />
                                                <h3 className="font-display text-2xl text-[#333]">{item.title || 'Sugerir Canción'}</h3>
                                            </div>
                                            {guests.length > 1 && (
                                                <div className="relative">
                                                    <select
                                                        value={selectedGuestForSong}
                                                        onChange={(e) => setSelectedGuestForSong(e.target.value)}
                                                        className="w-full bg-white/50 border border-white/80 text-[#333] text-sm rounded-xl px-4 py-3 appearance-none outline-none focus:border-[var(--primary)] transition shadow-inner font-serif"
                                                    >
                                                        {guests.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                                                    </select>
                                                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                                </div>
                                            )}
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="Ej: Danza Kuduro - Don Omar"
                                                    value={songInputs[item.id] || ''}
                                                    onChange={(e) => setSongInputs(prev => ({ ...prev, [item.id]: e.target.value }))}
                                                    className="flex-1 bg-white border border-white/80 rounded-xl px-4 py-3 text-sm outline-none focus:border-[var(--primary)] transition shadow-inner"
                                                />
                                                <button
                                                    onClick={() => handleSaveSongBlock(item.id)}
                                                    disabled={!songInputs[item.id] || submittingSong}
                                                    className="bg-[#333] text-white px-4 rounded-xl hover:bg-black transition flex items-center justify-center disabled:opacity-50"
                                                >
                                                    {submittingSong ? <div className="w-5 h-5 border-2 border-white rounded-full border-t-transparent animate-spin" /> : <Send size={18} />}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {item.type === 'message' && (
                                        <div className="bg-white/60 backdrop-blur rounded-2xl p-6 border border-white/50 shadow-sm space-y-4">
                                            <div className="flex items-center gap-3 justify-center mb-2">
                                                <MessageSquare className="text-[var(--primary)]" size={24} />
                                                <h3 className="font-display text-2xl text-[#333]">{item.title || 'Libro de Firmas'}</h3>
                                            </div>
                                            {guests.length > 1 && (
                                                <div className="relative">
                                                    <select
                                                        value={selectedGuestForMessage}
                                                        onChange={(e) => setSelectedGuestForMessage(e.target.value)}
                                                        className="w-full bg-white/50 border border-white/80 text-[#333] text-sm rounded-xl px-4 py-3 appearance-none outline-none focus:border-[var(--primary)] transition shadow-inner font-serif"
                                                    >
                                                        {guests.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                                                    </select>
                                                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                                </div>
                                            )}
                                            <div className="space-y-3">
                                                <textarea
                                                    placeholder="Dejad aquí vuestros mejores deseos..."
                                                    value={messageInputs[item.id] || ''}
                                                    onChange={(e) => setMessageInputs(prev => ({ ...prev, [item.id]: e.target.value }))}
                                                    className="w-full bg-white border border-white/80 rounded-xl px-4 py-3 text-sm outline-none focus:border-[var(--primary)] transition shadow-inner resize-none h-24"
                                                />
                                                <button
                                                    onClick={() => handleSaveMessageBlock(item.id)}
                                                    disabled={!messageInputs[item.id] || submittingMessage}
                                                    className="w-full bg-[#333] text-white py-3 rounded-xl font-bold uppercase tracking-wider text-xs hover:bg-black transition flex items-center justify-center gap-2 disabled:opacity-50"
                                                >
                                                    {submittingMessage ? 'Enviando...' : <>Dejar Mensaje <Send size={14} /></>}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </ScrollReveal>
                        );
                    }
                    return null;
                })}
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

    // Design Config Defaults
    const design = weddingData?.invitationConfig?.design || {};
    const primaryColor = design.primaryColor || '#333';
    const bgImage = design.backgroundImage || 'https://images.unsplash.com/photo-1606800052052-a08af7148866?q=80&w=2070&auto=format&fit=crop';
    const overlayOp = (design.overlayOpacity ?? 50) / 100;

    // Font Mapping
    const fontMap = {
        'serif': 'font-serif', // Playfair
        'sans': 'font-sans',   // Inter
        'script': 'font-display' // Cormorant (using display var for script feel)
    };
    const activeFont = fontMap[design.fontPair] || 'font-serif';

    return (
        <div
            className={`min-h-screen bg-[#FDFBF7] text-[#333] ${activeFont} selection:bg-[var(--primary)] selection:text-white flex flex-col`}
            style={{ '--primary': primaryColor }}
        >

            {/* HERO SECTION */}
            <div className="min-h-screen flex flex-col relative overflow-hidden py-10">
                <div
                    className="absolute inset-0 bg-cover bg-center transition-all duration-700"
                    style={{ backgroundImage: `url('${bgImage}')` }}
                ></div>
                <div
                    className="absolute inset-0 bg-[#FDFBF7] transition-all duration-500"
                    style={{ opacity: 1 - overlayOp, mixBlendMode: 'normal' }} // Simple overlay
                ></div>
                <div className="absolute inset-0 bg-gradient-to-b from-[#FDFBF7]/0 via-[#FDFBF7]/50 to-[#FDFBF7]"></div>

                <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center p-8 space-y-6 animate-fade-in-up">
                    <p className="uppercase tracking-[0.4em] text-xs font-bold text-gray-500">{design.welcomeMessage || "Estás invitado a la boda de"}</p>

                    <h1 className="font-display text-5xl md:text-8xl text-[#333] leading-tight">
                        {partner1} <span className="text-3xl md:text-5xl font-serif italic text-gray-400">&</span><br />{partner2}
                    </h1>

                    <div className="w-10 h-[1px] bg-[#333] my-6"></div>

                    <div className="font-serif italic text-xl text-gray-600 max-w-md leading-relaxed px-4">
                        "{design.celebrationMessage || "¡Queremos celebrar el amor con la gente que más queremos!"}"
                    </div>

                    {/* ENVELOPE & RECIPIENTS PRESENTATION CARD */}
                    {(() => {
                        const validGuests = (guests || []).filter(g => g.nombre && g.nombre.trim() !== '');
                        const count = validGuests.length;
                        const envelopeName = (invitation?.name || '').trim();

                        // Formateo del encabezado principal
                        let mainTitle = envelopeName || 'Queridos Invitados';
                        const isFamilyOrGroup = envelopeName.toLowerCase().includes('familia') ||
                            envelopeName.toLowerCase().includes('pareja') ||
                            envelopeName.toLowerCase().includes('los ') ||
                            envelopeName.toLowerCase().includes('las ');

                        if (count === 1) {
                            mainTitle = validGuests[0].nombre;
                        } else if (count === 2) {
                            mainTitle = `${validGuests[0].nombre} & ${validGuests[1].nombre}`;
                        } else if (count > 2) {
                            if (!isFamilyOrGroup && validGuests.length > 0) {
                                mainTitle = `${validGuests[0].nombre} y familia`;
                            }
                        }

                        // Comprobar si el nombre del sobre aporta información adicional (ej. "Familia Gómez" vs los nombres de los miembros)
                        const showEnvelopeTag = envelopeName &&
                            !validGuests.some(g => g.nombre.toLowerCase() === envelopeName.toLowerCase()) &&
                            mainTitle.toLowerCase() !== envelopeName.toLowerCase();

                        return (
                            <div className="mt-8 bg-white/85 backdrop-blur-md p-6 sm:p-8 rounded-3xl shadow-sm border border-stone-200/60 max-w-md w-full mx-auto transform hover:scale-[1.02] transition-all duration-500">
                                <div className="flex items-center justify-center gap-2 mb-2">
                                    <span className="h-[1px] w-5 bg-stone-300"></span>
                                    <p className="text-[10px] uppercase tracking-[0.25em] text-stone-500 font-bold">
                                        Invitación para
                                    </p>
                                    <span className="h-[1px] w-5 bg-stone-300"></span>
                                </div>

                                {/* Título principal con los nombres de los invitados */}
                                {count === 2 ? (
                                    <h2 className="text-2xl sm:text-3xl font-display text-[#333] leading-snug">
                                        {validGuests[0].nombre} <span className="font-serif italic text-stone-400 font-light">&</span><br className="hidden sm:inline" /> {validGuests[1].nombre}
                                    </h2>
                                ) : (
                                    <h2 className="text-2xl sm:text-3xl font-display text-[#333] leading-snug">
                                        {mainTitle}
                                    </h2>
                                )}

                                {/* Subtítulo opcional si el sobre tiene un nombre especial como "Familia X" */}
                                {showEnvelopeTag && (
                                    <p className="text-xs text-stone-500 font-serif italic mt-1.5">
                                        Sobre: {envelopeName}
                                    </p>
                                )}

                                {/* Desglose visual de todos los miembros incluidos en el sobre */}
                                {count > 1 && (
                                    <div className="mt-4 pt-4 border-t border-stone-100">
                                        <p className="text-[10px] uppercase tracking-widest text-stone-400 font-semibold mb-2.5">
                                            {count === 2 ? 'Invitados incluidos en este sobre' : 'Miembros de la familia incluidos'}:
                                        </p>
                                        <div className="flex flex-wrap justify-center gap-1.5">
                                            {validGuests.map((g, i) => (
                                                <span
                                                    key={g.id || i}
                                                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-serif bg-stone-50 border border-stone-200/70 text-stone-700 shadow-2xs"
                                                >
                                                    {g.nombre}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Indicador de plazas reservadas */}
                                <div className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-stone-100/80 text-[11px] font-medium text-stone-600">
                                    <span>{count <= 1 ? '1 plaza reservada' : `${count} plazas reservadas`}</span>
                                </div>
                            </div>
                        );
                    })()}

                    {renderModules()}
                </div>
            </div>

            {/* SHARED MODAL OVERLAY */}
            {activeModal && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-backdrop-fade" onClick={() => setActiveModal(null)}></div>

                    <div className="bg-white w-full md:max-w-2xl h-[85vh] md:h-auto md:max-h-[90vh] rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl relative flex flex-col animate-slide-up-mobile md:animate-fade-in-up">

                        {/* Modal Header */}
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center shrink-0">
                            <div>
                                {activeModal === 'rsvp' && <h3 className="font-serif text-2xl text-[#333]">Vuestra Asistencia</h3>}
                                {activeModal === 'timeline' && <h3 className="font-serif text-2xl text-[#333]">{weddingData?.invitationConfig?.timeline?.title || 'Agenda del Día'}</h3>}
                            </div>
                            <button onClick={() => setActiveModal(null)} className="w-10 h-10 rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 flex items-center justify-center transition">✕</button>
                        </div>

                        {/* CONTENT AREA */}
                        <div className="flex-1 overflow-y-auto p-6 md:p-8">

                            {/* RSVP CONTENT */}
                            {activeModal === 'rsvp' && (() => {
                                const rsvpDeadline = weddingData?.invitationConfig?.rsvp?.deadline;
                                const isDeadlinePassed = rsvpDeadline && new Date() > new Date(rsvpDeadline);

                                if (isDeadlinePassed) {
                                    return (
                                        <div className="text-center py-12 space-y-4">
                                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-400">
                                                <Lock size={24} />
                                            </div>
                                            <h4 className="font-serif text-2xl text-[#333]">Plazo finalizado</h4>
                                            <p className="text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">
                                                Ya no se permiten cambios en la confirmación de asistencia. Si necesitas modificar algo, por favor contacta directamente con los novios.
                                            </p>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="space-y-6">
                                        {guests.map((guest, idx) => (
                                        <div key={guest.id} className="flex flex-col gap-3 py-2 border-b border-gray-50 last:border-0">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-serif italic text-gray-400 text-sm">{idx + 1}</div>
                                                <span className="text-lg font-bold text-[#333]">{guest.nombre}</span>
                                            </div>
                                            <div className="pl-11 grid grid-cols-2 gap-3">
                                                <button onClick={() => updateGuestState(guest.id, 'confirmado', true)} className={`py-3 px-4 rounded-xl border-2 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${guest.confirmado === true ? 'border-[var(--primary)] bg-[var(--primary)] text-white' : 'border-gray-100 bg-white text-gray-400 hover:border-gray-300'}`}>{guest.confirmado === true && <Check size={14} />} Sí, voy</button>
                                                <button onClick={() => updateGuestState(guest.id, 'confirmado', false)} className={`py-3 px-4 rounded-xl border-2 text-xs font-bold uppercase tracking-wider transition-all ${guest.confirmado === false ? 'border-gray-200 bg-gray-100 text-gray-500' : 'border-gray-100 bg-white text-gray-400 hover:border-gray-300'}`}>No puedo</button>
                                            </div>
                                            <div className={`pl-11 transition-all duration-500 overflow-hidden ${guest.confirmado === true ? 'max-h-[900px] opacity-100 mt-4 space-y-4' : 'max-h-0 opacity-0 mt-0 space-y-0'}`}>
                                                {weddingData?.busConfig?.enabled && (() => {
                                                    const bc = weddingData.busConfig;
                                                    const busEnabled = guest.bus !== null && guest.bus !== false && guest.bus !== undefined;
                                                    const busObj = (typeof guest.bus === 'object' && guest.bus) ? guest.bus : { ida: null, vuelta: null };
                                                    const hasIda = bc.ida?.enabled && bc.ida?.stops?.length > 0;
                                                    const hasVuelta = bc.vuelta?.enabled && bc.vuelta?.stops?.length > 0;

                                                    // Count selected stops for summary
                                                    const selectedCount = [busObj.ida, busObj.vuelta].filter(Boolean).length;
                                                    const totalDirs = [hasIda, hasVuelta].filter(Boolean).length;

                                                    return (
                                                        <div className="space-y-2">
                                                            {/* Toggle row */}
                                                            <label className="flex items-center justify-between p-3 bg-stone-50 rounded-xl cursor-pointer hover:bg-stone-100 transition border border-transparent hover:border-stone-200">
                                                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">🚌 Necesitaré Autobús</span>
                                                                <div
                                                                    onClick={() => updateGuestState(guest.id, 'busEnabled', !busEnabled)}
                                                                    className={`w-10 h-5 rounded-full relative transition-colors cursor-pointer ${busEnabled ? 'bg-[var(--primary)]' : 'bg-gray-200'}`}
                                                                >
                                                                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300 ${busEnabled ? 'left-5' : 'left-0.5'}`} />
                                                                </div>
                                                            </label>

                                                            {/* When enabled: compact summary + edit button */}
                                                            {busEnabled && (hasIda || hasVuelta) && (
                                                                <button
                                                                    onClick={() => setBusSheetGuestId(guest.id)}
                                                                    className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-white rounded-xl border-2 border-[var(--primary)]/20 hover:border-[var(--primary)]/50 transition group"
                                                                >
                                                                    <div className="flex items-center gap-3 min-w-0">
                                                                        <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
                                                                            <Bus size={14} className="text-[var(--primary)]" />
                                                                        </div>
                                                                        <div className="text-left min-w-0">
                                                                            {selectedCount === 0 ? (
                                                                                <p className="text-xs font-bold text-gray-400">Toca para elegir paradas</p>
                                                                            ) : (
                                                                                <>
                                                                                    <p className="text-[10px] text-gray-400 uppercase tracking-widest">{selectedCount} de {totalDirs} elegidas</p>
                                                                                    <div className="flex flex-wrap gap-1 mt-0.5">
                                                                                        {hasIda && busObj.ida && (
                                                                                            <span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">
                                                                                                ↑ {bc.ida.stops.find(s => s.id === busObj.ida)?.time}
                                                                                            </span>
                                                                                        )}
                                                                                        {hasVuelta && busObj.vuelta && (
                                                                                            <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                                                                                                ↓ {bc.vuelta.stops.find(s => s.id === busObj.vuelta)?.time}
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <ChevronRight size={16} className="text-gray-300 group-hover:text-[var(--primary)] transition shrink-0" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })()}

                                                {weddingData?.invitationConfig?.rsvp?.askAllergies !== false && (
                                                    <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Alergias o Menú Especial</p>
                                                        <input type="text" placeholder="Ej: Celíaco, Vegano, etc..." className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[var(--primary)] focus:bg-white transition shadow-inner" value={guest.alergias || ''} onChange={(e) => updateGuestState(guest.id, 'alergias', e.target.value)} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    <div className="pt-6">
                                        <button onClick={handleSaveAll} disabled={saving} className="w-full bg-[var(--primary)] text-white py-4 rounded-xl font-bold uppercase tracking-[0.2em] text-sm hover:opacity-90 transition-all shadow-lg active:scale-[0.98]">{saving ? 'Guardando...' : 'Enviar Respuesta'}</button>
                                    </div>
                                </div>
                                );
                            })()}

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

                        </div>
                    </div>
                </div>
            )}
            {/* TOAST NOTIFICATION */}
            {notification && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] animate-fade-in-up">
                    <div className={`px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 ${notification.type === 'error' ? 'bg-red-500 text-white' : 'bg-[#333] text-white'}`}>
                        {notification.type === 'success' ? <Check size={16} /> : null}
                        <span className="text-sm font-bold">{notification.message}</span>
                    </div>
                </div>
            )}
            {/* BUS SELECTION SHEET */}
            {busSheetGuestId && weddingData?.busConfig && (
                <BusSheet
                    guest={busSheetGuest}
                    busConfig={weddingData.busConfig}
                    onUpdate={updateGuestState}
                    onClose={() => setBusSheetGuestId(null)}
                />
            )}
        </div>
    );
}

// --- NEW COMPONENTS ---

function CountdownBlock({ targetDate, title }) {
    const [timeLeft, setTimeLeft] = useState(null);
    const [status, setStatus] = useState('loading'); // loading, active, finished, invalid

    useEffect(() => {
        if (!targetDate) {
            setStatus('invalid');
            return;
        }

        const calculate = () => {
            const now = new Date().getTime();
            const target = new Date(targetDate).getTime();

            if (isNaN(target)) {
                setStatus('invalid');
                return null;
            }

            const diff = target - now;
            if (diff <= 0) {
                setStatus('finished');
                return null;
            }

            setStatus('active');
            return {
                días: Math.floor(diff / (1000 * 60 * 60 * 24)),
                horas: Math.floor((diff / (1000 * 60 * 60)) % 24),
                min: Math.floor((diff / 1000 / 60) % 60),
                seg: Math.floor((diff / 1000) % 60),
            };
        };

        const initial = calculate();
        if (initial) setTimeLeft(initial);

        const timer = setInterval(() => {
            setTimeLeft(calculate());
        }, 1000);

        return () => clearInterval(timer);
    }, [targetDate]);

    // RENDER STATES
    if (status === 'invalid') return null; // Or placeholder for admin?

    if (status === 'finished') {
        return (
            <div className="py-10 text-center animate-fade-in-up">
                <p className="font-display text-4xl text-[#333] mb-2">¡Es Hoy!</p>
                <p className="font-serif italic text-gray-500">Que empiece la fiesta</p>
            </div>
        );
    }

    if (!timeLeft) return null;

    return (
        <div className="py-8 w-full max-w-sm mx-auto">
            {title && <h3 className="text-center font-display text-2xl text-[#333] mb-6">{title}</h3>}
            <div className="flex justify-center gap-3 text-center">
                {Object.keys(timeLeft).map((interval) => (
                    <div key={interval} className="flex flex-col items-center bg-white/80 backdrop-blur-sm p-3 rounded-xl shadow-sm border border-white/50 w-20">
                        <span className="font-display text-3xl text-[#333] leading-none mb-1">
                            {timeLeft[interval] < 10 ? `0${timeLeft[interval]}` : timeLeft[interval]}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                            {interval}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function GalleryBlock({ images, title }) {
    if (!images || !Array.isArray(images) || images.length === 0) {
        return (
            <div className="py-6 w-full opacity-50">
                {title && <h3 className="text-center font-display text-3xl text-[#333] mb-6">{title}</h3>}
                <div className="w-full aspect-video bg-gray-100 rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center p-8 text-gray-400">
                    <ImageIcon size={48} className="mb-2" />
                    <p className="font-serif text-sm">Galería vacía</p>
                    <p className="text-[10px] uppercase tracking-widest mt-1">Añade fotos desde el editor</p>
                </div>
            </div>
        );
    }

    return (
        <div className="py-6 w-full">
            {title && <h3 className="text-center font-display text-3xl text-[#333] mb-6">{title}</h3>}

            <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-6 -mx-6 px-6 scrollbar-hide">
                {images.map((img, idx) => (
                    <div key={idx} className="snap-center shrink-0 w-[85%] md:w-[60%] aspect-[3/4] rounded-2xl overflow-hidden shadow-lg border-4 border-white relative">
                        <img
                            src={img}
                            alt={`Gallery ${idx}`}
                            loading="lazy"
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded-full backdrop-blur-sm">
                            {idx + 1} / {images.length}
                        </div>
                    </div>
                ))}
            </div>
            <p className="text-center text-[10px] text-gray-400 uppercase tracking-widest opacity-60">Desliza para ver más</p>
        </div>
    );
}

function ScrollReveal({ children, delay = 0 }) {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.unobserve(entry.target);
                }
            },
            {
                threshold: 0.05,
                rootMargin: '0px 0px -50px 0px'
            }
        );

        if (ref.current) {
            observer.observe(ref.current);
        }

        return () => {
            if (ref.current) {
                observer.unobserve(ref.current);
            }
        };
    }, []);

    return (
        <div
            ref={ref}
            className={`w-full transition-all duration-700 ease-out transform ${
                isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-[0.98]'
            }`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {children}
        </div>
    );
}

