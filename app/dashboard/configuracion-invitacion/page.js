'use client';
import { useState, useEffect, useCallback } from 'react';
import { db, storage } from '../../../firebase/config';
import { doc, getDoc, updateDoc, collection, query, limit, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import {
    MapPin, Calendar, Gift, Type, Image as ImageIcon, Video,
    Clock, Images, Trash2, Plus, ChevronUp, ChevronDown,
    Palette, Smartphone, AlignLeft, Eye, X, Check, Music, MessageSquare,
    ChevronRight, Sparkles, LayoutTemplate, CheckCircle2, Upload, Settings
} from 'lucide-react';

// ─── TOAST ────────────────────────────────────────────────────────────────────
function Toast({ message, type = 'success', onClose }) {
    useEffect(() => {
        const t = setTimeout(onClose, 3000);
        return () => clearTimeout(t);
    }, [onClose]);
    return (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-sm font-bold animate-fade-in-up
            ${type === 'success' ? 'bg-[#1a1a1a] text-white border-white/10' : 'bg-red-500 text-white border-red-400'}`}>
            {type === 'success' ? <CheckCircle2 size={16} className="text-[#C5A065]" /> : <X size={16} />}
            {message}
        </div>
    );
}

// ─── SMALL COMPONENTS ────────────────────────────────────────────────────────
function TabBtn({ active, onClick, icon, label }) {
    return (
        <button
            onClick={onClick}
            className={`relative flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-widest transition-all duration-200 border-b-2
                ${active
                    ? 'text-[#333] border-[#C5A065]'
                    : 'text-gray-400 border-transparent hover:text-[#333] hover:border-gray-200'}`}
        >
            <span className={active ? 'text-[#C5A065]' : 'text-gray-300'}>{icon}</span>
            {label}
        </button>
    );
}

function SectionLabel({ children }) {
    return (
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400 mb-3">{children}</p>
    );
}

function FieldGroup({ label, children }) {
    return (
        <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</label>
            {children}
        </div>
    );
}

function StyledInput({ value, onChange, placeholder, type = 'text', icon }) {
    return (
        <div className="relative">
            <input
                type={type}
                value={value || ''}
                onChange={onChange}
                placeholder={placeholder}
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-[#333] placeholder-gray-300 outline-none focus:border-[#C5A065] focus:ring-2 focus:ring-[#C5A065]/10 transition"
            />
            {icon && <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none">{icon}</div>}
        </div>
    );
}

function StyledTextarea({ value, onChange, placeholder, rows = 3 }) {
    return (
        <textarea
            value={value || ''}
            onChange={onChange}
            placeholder={placeholder}
            rows={rows}
            className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-[#333] placeholder-gray-300 outline-none focus:border-[#C5A065] focus:ring-2 focus:ring-[#C5A065]/10 transition resize-none"
        />
    );
}

function AddBlockButton({ icon, label, onClick, color = 'text-gray-500 bg-gray-50 hover:bg-gray-100 border-gray-100' }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all duration-200 hover:scale-[1.03] ${color}`}
        >
            <span>{icon}</span>
            {label}
        </button>
    );
}

// ─── SECTION ICON HELPER ──────────────────────────────────────────────────────
function getItemIcon(item) {
    if (!item.isCustom) {
        if (item.id === 'location') return { icon: <MapPin size={16} />, color: 'text-[#C5A065] bg-[#C5A065]/10' };
        if (item.id === 'timeline') return { icon: <Calendar size={16} />, color: 'text-[#C5A065] bg-[#C5A065]/10' };
        if (item.id === 'bank') return { icon: <Gift size={16} />, color: 'text-[#C5A065] bg-[#C5A065]/10' };
        if (item.id === 'rsvp') return { icon: <Check size={16} />, color: 'text-emerald-600 bg-emerald-50' };
    }
    if (item.type === 'text') return { icon: <AlignLeft size={16} />, color: 'text-blue-500 bg-blue-50' };
    if (item.type === 'image') return { icon: <ImageIcon size={16} />, color: 'text-violet-500 bg-violet-50' };
    if (item.type === 'video') return { icon: <Video size={16} />, color: 'text-red-500 bg-red-50' };
    if (item.type === 'countdown') return { icon: <Clock size={16} />, color: 'text-indigo-500 bg-indigo-50' };
    if (item.type === 'gallery') return { icon: <Images size={16} />, color: 'text-pink-500 bg-pink-50' };
    if (item.type === 'song') return { icon: <Music size={16} />, color: 'text-amber-500 bg-amber-50' };
    if (item.type === 'message') return { icon: <MessageSquare size={16} />, color: 'text-teal-500 bg-teal-50' };
    return { icon: <LayoutTemplate size={16} />, color: 'text-gray-400 bg-gray-100' };
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function InvitationConfigPage() {
    const router = useRouter();
    const { user, userData, loading: authLoading } = useAuth();

    const [loadingData, setLoadingData] = useState(true);
    const [weddingId, setWeddingId] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [newGalleryUrl, setNewGalleryUrl] = useState({});
    const [showMobilePreview, setShowMobilePreview] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [activeTab, setActiveTab] = useState('design');
    const [expandedId, setExpandedId] = useState(null);
    const [toast, setToast] = useState(null);
    const [saving, setSaving] = useState(false);

    const [config, setConfig] = useState({
        location: { enabled: false, address: '', mapUrl: '', title: 'Ubicación', order: 1 },
        bank: { enabled: false, iban: '', message: '', title: 'Regalo', subtitle: 'Un detalle para nosotros', order: 3 },
        timeline: { enabled: false, events: [], title: 'Agenda', order: 2 },
        rsvp: { enabled: true, askAllergies: true, askSong: true, askMessage: true, title: 'Formulario de Asistencia', whatsappMessage: '¡Hola! Aquí tienes la invitación para la boda:', order: 4 },
        bus: { enabled: false },
        design: {
            primaryColor: '#C5A065',
            fontPair: 'serif',
            backgroundImage: 'https://images.unsplash.com/photo-1606800052052-a08af7148866?q=80&w=2070&auto=format&fit=crop',
            overlayOpacity: 50,
            welcomeMessage: '',
            celebrationMessage: ''
        },
        customBlocks: []
    });

    const [newEvent, setNewEvent] = useState({ time: '', title: '' });

    // ── Load data ──────────────────────────────────────────────────────────────
    useEffect(() => {
        if (authLoading) return;
        const loadWedding = async () => {
            if (userData?.weddingId) {
                const wId = userData.weddingId;
                setWeddingId(wId);
                try {
                    const wDoc = await getDoc(doc(db, 'weddings', wId));
                    if (wDoc.exists()) {
                        if (wDoc.data().invitationConfig) {
                            const fetched = wDoc.data().invitationConfig;
                            setConfig(prev => ({
                                ...prev,
                                ...fetched,
                                location: { ...prev.location, ...fetched.location },
                                timeline: { ...prev.timeline, ...fetched.timeline },
                                rsvp: { ...(prev.rsvp || { enabled: true, askAllergies: true, askSong: true, askMessage: true, title: 'Formulario de Asistencia', whatsappMessage: '¡Hola! Aquí tienes la invitación para la boda:', order: 4 }), ...fetched.rsvp },
                                bank: { ...prev.bank, ...fetched.bank },
                                design: { ...prev.design, ...fetched.design },
                                customBlocks: fetched.customBlocks || []
                            }));
                        }
                        const qInv = query(collection(db, 'weddings', wId, 'invitations'), limit(1));
                        const snapInv = await getDocs(qInv);
                        setPreviewUrl(
                            !snapInv.empty
                                ? `/invitacion/${wId}/${snapInv.docs[0].id}?editor=true`
                                : `/invitacion/${wId}/preview?editor=true`
                        );
                    }
                } catch (error) { console.error('Error loading wedding:', error); }
            }
            setLoadingData(false);
        };
        loadWedding();
    }, [user, userData, authLoading, router]);

    // ── Real-time preview ──────────────────────────────────────────────────────
    useEffect(() => {
        const handleIframeMessage = (event) => {
            if (event.data?.type === 'IFRAME_READY') {
                const iframe = document.querySelector('iframe');
                if (iframe?.contentWindow) {
                    iframe.contentWindow.postMessage({ type: 'UPDATE_CONFIG', config }, '*');
                }
            }
        };

        window.addEventListener('message', handleIframeMessage);

        // Also proactively send if iframe is already loaded
        const iframe = document.querySelector('iframe');
        if (iframe?.contentWindow) {
            iframe.contentWindow.postMessage({ type: 'UPDATE_CONFIG', config }, '*');
        }

        return () => window.removeEventListener('message', handleIframeMessage);
    }, [config, previewUrl]);

    // ── Image upload ───────────────────────────────────────────────────────────
    const handleImageUpload = async (file, pathPrefix) => {
        if (!file) return null;
        if (!file.type.startsWith('image/')) { setToast({ message: 'Selecciona una imagen válida.', type: 'error' }); return null; }
        setUploadingImage(true);
        try {
            const ext = file.name.split('.').pop();
            const name = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
            const storageRef = ref(storage, `weddings/${weddingId}/${pathPrefix}/${name}`);
            await uploadBytes(storageRef, file);
            return await getDownloadURL(storageRef);
        } catch {
            setToast({ message: 'Error al subir la imagen.', type: 'error' });
            return null;
        } finally { setUploadingImage(false); }
    };

    // ── Unified sorted items ───────────────────────────────────────────────────
    const getAllItems = useCallback(() => {
        const fixed = ['location', 'timeline', 'bank', 'rsvp']
            .filter(k => k === 'rsvp' || config[k]?.enabled)
            .map(k => ({ id: k, type: 'fixed', order: config[k]?.order || 99, ...config[k] }));
        const custom = (config.customBlocks || []).map(b => ({ ...b, isCustom: true }));
        return [...fixed, ...custom].sort((a, b) => a.order - b.order);
    }, [config]);

    // ── Helpers ────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        setSaving(true);
        try {
            await updateDoc(doc(db, 'weddings', weddingId), { invitationConfig: config });
            const url = previewUrl;
            setPreviewUrl(null);
            setTimeout(() => setPreviewUrl(url), 100);
            setToast({ message: 'Cambios guardados y publicados ✓', type: 'success' });
        } catch {
            setToast({ message: 'Error al guardar. Inténtalo de nuevo.', type: 'error' });
        } finally { setSaving(false); }
    };

    const toggleModule = (module) => {
        setConfig(prev => {
            const isDisabling = prev[module].enabled;
            let newOrder = prev[module].order;
            if (isDisabling) {
                const all = [
                    ...Object.values(prev).filter(v => v?.order && typeof v.order === 'number').map(v => v.order),
                    ...(prev.customBlocks || []).map(b => b.order)
                ];
                newOrder = Math.max(...all, 0) + 1;
            }
            const next = { ...prev, [module]: { ...prev[module], enabled: !isDisabling, order: newOrder } };
            if (!isDisabling) setExpandedId(module);
            return next;
        });
    };

    const updateModule = (module, field, value) =>
        setConfig(prev => ({ ...prev, [module]: { ...prev[module], [field]: value } }));

    const addBlock = (type) => {
        const items = getAllItems();
        const maxOrder = items.length > 0 ? Math.max(...items.map(i => i.order)) : 0;
        const titles = { text: 'Nuevo Texto', countdown: 'Nuestra Boda', gallery: 'Nuestra Historia', song: 'Sugerir Canción', message: 'Libro de Firmas', image: 'Imagen', video: 'Vídeo' };
        let initialContent = '';
        if (type === 'countdown') {
            const d = new Date(); d.setMonth(d.getMonth() + 6); d.setMinutes(0);
            initialContent = d.toISOString().slice(0, 16);
        } else if (type === 'gallery') { initialContent = []; }
        const newBlock = { id: `block_${Date.now()}`, type, content: initialContent, title: titles[type] || 'Bloque', order: maxOrder + 1, enabled: true };
        setConfig(prev => ({ ...prev, customBlocks: [...prev.customBlocks, newBlock] }));
        setExpandedId(newBlock.id);
    };

    const updateCustomBlock = (id, field, value) =>
        setConfig(prev => ({ ...prev, customBlocks: prev.customBlocks.map(b => b.id === id ? { ...b, [field]: value } : b) }));

    const removeCustomBlock = (id) => {
        if (!confirm('¿Borrar este bloque?')) return;
        setConfig(prev => ({ ...prev, customBlocks: prev.customBlocks.filter(b => b.id !== id) }));
    };

    const moveItem = (id, direction) => {
        const items = getAllItems();
        const ci = items.findIndex(i => i.id === id);
        if (ci === -1) return;
        const ti = direction === 'up' ? ci - 1 : ci + 1;
        if (ti < 0 || ti >= items.length) return;
        const iA = items[ci], iB = items[ti];
        const oA = iB.order, oB = iA.order;
        setConfig(prev => {
            const next = { ...prev };
            if (iA.isCustom) next.customBlocks = next.customBlocks.map(b => b.id === iA.id ? { ...b, order: oA } : b);
            else next[iA.id] = { ...next[iA.id], order: oA };
            if (iB.isCustom) next.customBlocks = next.customBlocks.map(b => b.id === iB.id ? { ...b, order: oB } : b);
            else next[iB.id] = { ...next[iB.id], order: oB };
            return next;
        });
    };

    const addEvent = () => {
        if (!newEvent.time || !newEvent.title) return;
        setConfig(prev => ({
            ...prev,
            timeline: { ...prev.timeline, events: [...(prev.timeline.events || []), newEvent].sort((a, b) => a.time.localeCompare(b.time)) }
        }));
        setNewEvent({ time: '', title: '' });
    };

    const removeEvent = (i) => {
        const evs = [...config.timeline.events];
        evs.splice(i, 1);
        setConfig(prev => ({ ...prev, timeline: { ...prev.timeline, events: evs } }));
    };

    if (loadingData) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-3">
                <div className="w-8 h-8 border-2 border-[#C5A065] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Cargando editor...</p>
            </div>
        </div>
    );

    const allItems = getAllItems();

    return (
        <div className="flex flex-col lg:flex-row gap-0 min-h-[calc(100dvh-100px)] lg:max-h-[calc(100dvh-100px)] overflow-x-hidden bg-[#FAFAFA]">

            {/* Toast */}
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* ── LEFT PANEL ───────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col min-h-0 bg-white border-r border-gray-100">

                {/* Header */}
                <div className="px-6 pt-6 pb-0 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Sparkles size={12} className="text-[#C5A065]" />
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C5A065]">Editor de Invitación</span>
                            </div>
                            <h1 className="text-2xl font-display text-[#333]">Personaliza tu Invitación</h1>
                        </div>
                        <button
                            onClick={() => setShowMobilePreview(true)}
                            className="lg:hidden flex items-center gap-1.5 px-3 py-2 bg-[#333] text-white rounded-xl text-[10px] font-bold uppercase tracking-wider shadow hover:bg-black transition"
                        >
                            <Eye size={12} /> Previa
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-0">
                        <TabBtn
                            active={activeTab === 'design'}
                            onClick={() => setActiveTab('design')}
                            icon={<Palette size={13} />}
                            label="Diseño"
                        />
                        <TabBtn
                            active={activeTab === 'content'}
                            onClick={() => setActiveTab('content')}
                            icon={<LayoutTemplate size={13} />}
                            label="Contenido"
                        />
                        <TabBtn
                            active={activeTab === 'settings'}
                            onClick={() => setActiveTab('settings')}
                            icon={<Settings size={13} />}
                            label="Config."
                        />
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

                    {/* ── TAB: DESIGN ────────────────────────────────────── */}
                    {activeTab === 'design' && (
                        <div className="space-y-6 animate-fade-in">

                            {/* Color & Typography */}
                            <div className="space-y-4">
                                <SectionLabel>Apariencia</SectionLabel>
                                <div className="bg-gray-50 rounded-2xl p-4 space-y-5 border border-gray-100">

                                    {/* Color picker */}
                                    <FieldGroup label="Color Principal">
                                        <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-3 py-2.5">
                                            <div className="relative w-7 h-7 rounded-lg overflow-hidden border border-gray-200 shrink-0 shadow-sm">
                                                <input
                                                    type="color"
                                                    value={config.design?.primaryColor || '#C5A065'}
                                                    onChange={e => updateModule('design', 'primaryColor', e.target.value)}
                                                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[180%] h-[180%] cursor-pointer border-0 p-0"
                                                />
                                            </div>
                                            <span className="text-xs font-mono text-gray-500 uppercase flex-1">{config.design?.primaryColor}</span>
                                            <span className="text-[10px] text-gray-400">Toca para cambiar</span>
                                        </div>
                                    </FieldGroup>

                                    {/* Typography */}
                                    <FieldGroup label="Tipografía">
                                        <div className="grid grid-cols-3 gap-2">
                                            {[
                                                { id: 'serif', label: 'Elegante', preview: 'Aa', cls: 'font-serif' },
                                                { id: 'sans', label: 'Moderna', preview: 'Aa', cls: 'font-sans' },
                                                { id: 'script', label: 'Romántica', preview: 'Aa', cls: 'font-script' }
                                            ].map(f => (
                                                <button
                                                    key={f.id}
                                                    onClick={() => updateModule('design', 'fontPair', f.id)}
                                                    className={`py-3 rounded-xl border text-center transition-all duration-200
                                                        ${config.design?.fontPair === f.id
                                                            ? 'border-[#333] bg-[#333] text-white shadow'
                                                            : 'border-gray-100 bg-white text-gray-500 hover:border-gray-300'}`}
                                                >
                                                    <div className={`text-lg mb-0.5 ${f.cls}`}>{f.preview}</div>
                                                    <div className="text-[9px] font-bold uppercase tracking-wider">{f.label}</div>
                                                </button>
                                            ))}
                                        </div>
                                    </FieldGroup>
                                </div>
                            </div>

                            {/* Background */}
                            <div className="space-y-4">
                                <SectionLabel>Imagen de Fondo</SectionLabel>
                                <div className="bg-gray-50 rounded-2xl p-4 space-y-4 border border-gray-100">
                                    {/* Preview thumbnail */}
                                    {config.design?.backgroundImage && (
                                        <div className="w-full h-28 rounded-xl overflow-hidden border border-gray-200 relative">
                                            <img src={config.design.backgroundImage} className="w-full h-full object-cover" alt="Fondo" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                                            <span className="absolute bottom-2 left-3 text-[10px] text-white font-bold uppercase tracking-wider">Vista previa</span>
                                        </div>
                                    )}

                                    <FieldGroup label="URL de la imagen">
                                        <StyledInput
                                            value={config.design?.backgroundImage}
                                            onChange={e => updateModule('design', 'backgroundImage', e.target.value)}
                                            placeholder="https://..."
                                            icon={<ImageIcon size={14} />}
                                        />
                                    </FieldGroup>

                                    <div className="relative flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                        <div className="flex-1 h-px bg-gray-200" />
                                        <span>o sube un archivo</span>
                                        <div className="flex-1 h-px bg-gray-200" />
                                    </div>

                                    <label className={`flex items-center justify-center gap-2 w-full py-2.5 border-2 border-dashed border-gray-200 hover:border-[#C5A065] text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-[#C5A065] rounded-xl cursor-pointer transition-all duration-200 ${uploadingImage ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                        <Upload size={14} />
                                        {uploadingImage ? 'Subiendo...' : 'Seleccionar foto'}
                                        <input type="file" accept="image/*" className="hidden" disabled={uploadingImage}
                                            onChange={async e => {
                                                const file = e.target.files?.[0];
                                                if (file) { const url = await handleImageUpload(file, 'backgrounds'); if (url) updateModule('design', 'backgroundImage', url); }
                                            }} />
                                    </label>

                                    <FieldGroup label={`Oscurecer fondo — ${config.design?.overlayOpacity || 50}%`}>
                                        <input
                                            type="range" min="0" max="90"
                                            value={config.design?.overlayOpacity || 50}
                                            onChange={e => updateModule('design', 'overlayOpacity', parseInt(e.target.value))}
                                            className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-[#333]"
                                        />
                                    </FieldGroup>
                                </div>
                            </div>

                            {/* Cover texts */}
                            <div className="space-y-4">
                                <SectionLabel>Textos de Portada</SectionLabel>
                                <div className="bg-gray-50 rounded-2xl p-4 space-y-4 border border-gray-100">
                                    <FieldGroup label="Mensaje superior">
                                        <StyledInput
                                            value={config.design?.welcomeMessage}
                                            onChange={e => updateModule('design', 'welcomeMessage', e.target.value)}
                                            placeholder="Ej: Estás invitado/a a la boda de..."
                                        />
                                    </FieldGroup>
                                    <FieldGroup label="Frase de celebración">
                                        <StyledTextarea
                                            value={config.design?.celebrationMessage}
                                            onChange={e => updateModule('design', 'celebrationMessage', e.target.value)}
                                            placeholder="¡Queremos celebrar el amor con la gente que más queremos!"
                                            rows={3}
                                        />
                                    </FieldGroup>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── TAB: CONTENT ───────────────────────────────────── */}
                    {activeTab === 'content' && (
                        <div className="space-y-5 animate-fade-in">

                            {/* Active sections list */}
                            {allItems.length > 0 ? (
                                <div className="space-y-2">
                                    <SectionLabel>Secciones activas · arrastra para reordenar</SectionLabel>
                                    {allItems.map((item, index) => {
                                        const isFirst = index === 0;
                                        const isLast = index === allItems.length - 1;
                                        const isExpanded = expandedId === item.id;
                                        const { icon, color } = getItemIcon(item);
                                        const isRsvp = !item.isCustom && item.id === 'rsvp';

                                        return (
                                            <div
                                                key={item.id}
                                                className={`rounded-2xl border transition-all duration-200 overflow-hidden
                                                    ${isExpanded ? 'border-[#C5A065]/40 shadow-md' : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'}`}
                                            >
                                                {/* Row header */}
                                                <div className="flex items-center gap-3 px-4 py-3">
                                                    {/* Order arrows */}
                                                    <div className="flex flex-col gap-0.5 shrink-0">
                                                        <button onClick={() => moveItem(item.id, 'up')} disabled={isFirst}
                                                            className="p-0.5 text-gray-300 hover:text-[#333] disabled:opacity-20 transition">
                                                            <ChevronUp size={12} />
                                                        </button>
                                                        <button onClick={() => moveItem(item.id, 'down')} disabled={isLast}
                                                            className="p-0.5 text-gray-300 hover:text-[#333] disabled:opacity-20 transition">
                                                            <ChevronDown size={12} />
                                                        </button>
                                                    </div>

                                                    {/* Icon */}
                                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                                                        {icon}
                                                    </div>

                                                    {/* Title editable */}
                                                    <input
                                                        type="text"
                                                        value={item.title || ''}
                                                        onChange={e => item.isCustom
                                                            ? updateCustomBlock(item.id, 'title', e.target.value)
                                                            : updateModule(item.id, 'title', e.target.value)}
                                                        className="flex-1 min-w-0 text-sm font-bold text-[#333] bg-transparent outline-none border-b border-transparent focus:border-gray-200 transition px-1 -ml-1"
                                                        placeholder="Título..."
                                                    />

                                                    {/* Actions */}
                                                    <div className="flex items-center gap-1 shrink-0 ml-1">
                                                        {isRsvp ? (
                                                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">Fijo</span>
                                                        ) : (
                                                            <button
                                                                onClick={() => item.isCustom ? removeCustomBlock(item.id) : toggleModule(item.id)}
                                                                className="w-7 h-7 flex items-center justify-center rounded-xl text-gray-300 hover:text-red-400 hover:bg-red-50 transition"
                                                            >
                                                                <Trash2 size={13} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => setExpandedId(isExpanded ? null : item.id)}
                                                            className={`w-7 h-7 flex items-center justify-center rounded-xl transition-all duration-200
                                                                ${isExpanded ? 'text-[#C5A065] bg-[#C5A065]/10 rotate-90' : 'text-gray-300 hover:text-gray-500 hover:bg-gray-100'}`}
                                                        >
                                                            <ChevronRight size={14} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Accordion content */}
                                                {isExpanded && (
                                                    <div className="px-4 pb-4 pt-2 border-t border-gray-50 space-y-4 bg-[#FDFCFB]">

                                                        {/* LOCATION */}
                                                        {!item.isCustom && item.id === 'location' && (
                                                            <>
                                                                <FieldGroup label="Dirección completa">
                                                                    <StyledInput
                                                                        value={config.location.address}
                                                                        onChange={e => updateModule('location', 'address', e.target.value)}
                                                                        placeholder="Calle, número, ciudad..."
                                                                        icon={<MapPin size={14} />}
                                                                    />
                                                                </FieldGroup>
                                                                <FieldGroup label="Enlace Google Maps">
                                                                    <StyledInput
                                                                        value={config.location.mapUrl}
                                                                        onChange={e => updateModule('location', 'mapUrl', e.target.value)}
                                                                        placeholder="https://maps.google.com/..."
                                                                    />
                                                                </FieldGroup>
                                                            </>
                                                        )}

                                                        {/* TIMELINE */}
                                                        {!item.isCustom && item.id === 'timeline' && (
                                                            <div className="space-y-3">
                                                                <div className="flex flex-col sm:flex-row gap-2 p-3 bg-white rounded-xl border border-gray-100">
                                                                    <div className="w-full sm:w-24">
                                                                        <FieldGroup label="Hora">
                                                                            <input
                                                                                type="time"
                                                                                value={newEvent.time}
                                                                                onChange={e => setNewEvent({ ...newEvent, time: e.target.value })}
                                                                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#C5A065] transition"
                                                                            />
                                                                        </FieldGroup>
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <FieldGroup label="Actividad">
                                                                            <StyledInput
                                                                                value={newEvent.title}
                                                                                onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                                                                                placeholder="Ej: Ceremonia"
                                                                            />
                                                                        </FieldGroup>
                                                                    </div>
                                                                    <div className="flex items-end">
                                                                        <button onClick={addEvent}
                                                                            className="h-[42px] w-full sm:w-[42px] bg-[#333] text-white rounded-xl hover:bg-black transition flex items-center justify-center shadow-sm shrink-0">
                                                                            <Plus size={16} className="hidden sm:block" />
                                                                            <span className="sm:hidden text-xs font-bold uppercase tracking-wider">Añadir</span>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-1.5">
                                                                    {(config.timeline.events || []).map((ev, i) => (
                                                                        <div key={i} className="flex items-center justify-between bg-white px-3 py-2.5 rounded-xl border border-gray-100 hover:border-gray-200 transition">
                                                                            <div className="flex items-center gap-3 min-w-0">
                                                                                <span className="font-mono text-[11px] font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-lg shrink-0">{ev.time}</span>
                                                                                <span className="text-sm text-[#333] truncate">{ev.title}</span>
                                                                            </div>
                                                                            <button onClick={() => removeEvent(i)} className="text-gray-300 hover:text-red-400 p-1 ml-2 shrink-0 transition">
                                                                                <Trash2 size={13} />
                                                                            </button>
                                                                        </div>
                                                                    ))}
                                                                    {(!config.timeline.events || config.timeline.events.length === 0) && (
                                                                        <p className="text-center text-xs text-gray-400 py-3">Añade eventos a la agenda</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* BANK */}
                                                        {!item.isCustom && item.id === 'bank' && (
                                                            <>
                                                                <FieldGroup label="Texto del botón / Tarjeta">
                                                                    <StyledInput
                                                                        value={config.bank.subtitle}
                                                                        onChange={e => updateModule('bank', 'subtitle', e.target.value)}
                                                                        placeholder="Ej: Un detalle para nosotros o Hacernos un regalo"
                                                                    />
                                                                </FieldGroup>
                                                                <FieldGroup label="Mensaje de agradecimiento">
                                                                    <StyledTextarea
                                                                        value={config.bank.message}
                                                                        onChange={e => updateModule('bank', 'message', e.target.value)}
                                                                        placeholder="Vuestro regalo es vuestra asistencia, pero si queréis tener un detalle..."
                                                                        rows={3}
                                                                    />
                                                                </FieldGroup>
                                                                <FieldGroup label="Número de cuenta (IBAN)">
                                                                    <StyledInput
                                                                        value={config.bank.iban}
                                                                        onChange={e => updateModule('bank', 'iban', e.target.value)}
                                                                        placeholder="ES00 0000..."
                                                                        icon={<Gift size={14} />}
                                                                    />
                                                                </FieldGroup>
                                                            </>
                                                        )}

                                                        {/* RSVP */}
                                                        {!item.isCustom && item.id === 'rsvp' && (
                                                            <div className="space-y-2">
                                                                {[
                                                                    { key: 'askAllergies', label: 'Preguntar alergias y dietas especiales', sub: 'Recomendado para organizar el menú sin sorpresas.' },
                                                                    { key: 'askSong', label: 'Sugerir canción', sub: 'El invitado puede proponer una canción para la boda.' },
                                                                    { key: 'askMessage', label: 'Mensaje de felicitación', sub: 'El invitado puede dejar un mensaje especial.' },
                                                                ].map(opt => (
                                                                    <label key={opt.key}
                                                                        className="flex items-start gap-3 p-3 bg-white rounded-xl border border-gray-100 hover:border-gray-200 cursor-pointer transition">
                                                                        <div className={`mt-0.5 w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition
                                                                            ${config.rsvp?.[opt.key] !== false ? 'bg-[#333] border-[#333]' : 'bg-white border-gray-200'}`}>
                                                                            {config.rsvp?.[opt.key] !== false && <Check size={11} className="text-white" strokeWidth={3} />}
                                                                        </div>
                                                                        <input type="checkbox" className="hidden"
                                                                            checked={config.rsvp?.[opt.key] !== false}
                                                                            onChange={e => updateModule('rsvp', opt.key, e.target.checked)} />
                                                                        <div>
                                                                            <p className="text-sm font-bold text-[#333]">{opt.label}</p>
                                                                            <p className="text-[11px] text-gray-400 mt-0.5">{opt.sub}</p>
                                                                        </div>
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* CUSTOM: TEXT */}
                                                        {item.isCustom && item.type === 'text' && (
                                                            <FieldGroup label="Contenido">
                                                                <StyledTextarea
                                                                    value={item.content}
                                                                    onChange={e => updateCustomBlock(item.id, 'content', e.target.value)}
                                                                    placeholder="Escribe aquí vuestra historia, una dedicatoria o cualquier información..."
                                                                    rows={5}
                                                                />
                                                            </FieldGroup>
                                                        )}

                                                        {/* CUSTOM: IMAGE */}
                                                        {item.isCustom && item.type === 'image' && (
                                                            <div className="space-y-3">
                                                                {item.content && (
                                                                    <div className="w-full h-36 rounded-xl overflow-hidden border border-gray-200">
                                                                        <img src={item.content} className="w-full h-full object-cover" alt="" />
                                                                    </div>
                                                                )}
                                                                <FieldGroup label="URL de la imagen">
                                                                    <StyledInput
                                                                        value={item.content}
                                                                        onChange={e => updateCustomBlock(item.id, 'content', e.target.value)}
                                                                        placeholder="https://..."
                                                                    />
                                                                </FieldGroup>
                                                                <label className={`flex items-center justify-center gap-2 w-full py-2.5 border-2 border-dashed border-gray-200 hover:border-[#C5A065] text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-[#C5A065] rounded-xl cursor-pointer transition ${uploadingImage ? 'opacity-50' : ''}`}>
                                                                    <Upload size={14} />
                                                                    {uploadingImage ? 'Subiendo...' : 'Subir imagen'}
                                                                    <input type="file" accept="image/*" className="hidden" disabled={uploadingImage}
                                                                        onChange={async e => {
                                                                            const file = e.target.files?.[0];
                                                                            if (file) { const url = await handleImageUpload(file, `blocks/${item.id}`); if (url) updateCustomBlock(item.id, 'content', url); }
                                                                        }} />
                                                                </label>
                                                            </div>
                                                        )}

                                                        {/* CUSTOM: VIDEO */}
                                                        {item.isCustom && item.type === 'video' && (
                                                            <FieldGroup label="Enlace embed de YouTube">
                                                                <StyledInput
                                                                    value={item.content}
                                                                    onChange={e => updateCustomBlock(item.id, 'content', e.target.value)}
                                                                    placeholder="https://www.youtube.com/embed/VIDEO_ID"
                                                                    icon={<Video size={14} />}
                                                                />
                                                            </FieldGroup>
                                                        )}

                                                        {/* CUSTOM: COUNTDOWN */}
                                                        {item.isCustom && item.type === 'countdown' && (
                                                            <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                                                                <FieldGroup label="Día y hora de la boda">
                                                                    <input
                                                                        type="datetime-local"
                                                                        value={item.content}
                                                                        onChange={e => updateCustomBlock(item.id, 'content', e.target.value)}
                                                                        className="w-full px-3 py-2.5 bg-white border border-indigo-200 rounded-xl text-sm outline-none focus:border-indigo-400 transition"
                                                                    />
                                                                </FieldGroup>
                                                            </div>
                                                        )}

                                                        {/* CUSTOM: SONG */}
                                                        {item.isCustom && item.type === 'song' && (
                                                            <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100 text-amber-700">
                                                                <Music size={18} className="shrink-0" />
                                                                <div>
                                                                    <p className="text-xs font-bold">Módulo: Sugerir Canción</p>
                                                                    <p className="text-[11px] text-amber-600 mt-0.5">Muestra un campo donde los invitados proponen canciones.</p>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* CUSTOM: MESSAGE */}
                                                        {item.isCustom && item.type === 'message' && (
                                                            <div className="flex items-center gap-3 p-3 bg-teal-50 rounded-xl border border-teal-100 text-teal-700">
                                                                <MessageSquare size={18} className="shrink-0" />
                                                                <div>
                                                                    <p className="text-xs font-bold">Módulo: Libro de Firmas</p>
                                                                    <p className="text-[11px] text-teal-600 mt-0.5">Los invitados dejarán mensajes de felicitación.</p>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* CUSTOM: GALLERY */}
                                                        {item.isCustom && item.type === 'gallery' && (
                                                            <div className="space-y-3">
                                                                {(Array.isArray(item.content) && item.content.length > 0) && (
                                                                    <div className="grid grid-cols-4 gap-2">
                                                                        {item.content.map((imgUrl, idx) => (
                                                                            <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group border border-gray-200">
                                                                                <img src={imgUrl} className="w-full h-full object-cover" alt="" />
                                                                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                                                                    <button
                                                                                        onClick={() => updateCustomBlock(item.id, 'content', item.content.filter((_, i) => i !== idx))}
                                                                                        className="bg-white/90 text-red-500 rounded-lg p-1.5 hover:scale-110 transition">
                                                                                        <Trash2 size={11} />
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                <div className="flex gap-2">
                                                                    <input
                                                                        type="text"
                                                                        placeholder="Pegar URL de foto..."
                                                                        className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-pink-300 transition"
                                                                        value={newGalleryUrl[item.id] || ''}
                                                                        onChange={e => setNewGalleryUrl({ ...newGalleryUrl, [item.id]: e.target.value })}
                                                                    />
                                                                    <button
                                                                        onClick={() => {
                                                                            const url = newGalleryUrl[item.id];
                                                                            if (!url) return;
                                                                            updateCustomBlock(item.id, 'content', [...(Array.isArray(item.content) ? item.content : []), url]);
                                                                            setNewGalleryUrl({ ...newGalleryUrl, [item.id]: '' });
                                                                        }}
                                                                        disabled={!newGalleryUrl[item.id]}
                                                                        className="px-3 py-2 bg-[#333] text-white rounded-xl text-xs font-bold hover:bg-black disabled:opacity-40 transition shrink-0"
                                                                    >
                                                                        <Plus size={14} />
                                                                    </button>
                                                                </div>
                                                                <label className={`flex items-center justify-center gap-2 w-full py-2.5 border-2 border-dashed border-pink-200 hover:border-pink-400 text-xs font-bold text-pink-400 hover:text-pink-500 rounded-xl cursor-pointer transition ${uploadingImage ? 'opacity-50' : ''}`}>
                                                                    <Upload size={14} />
                                                                    {uploadingImage ? 'Subiendo...' : 'Subir foto a galería'}
                                                                    <input type="file" accept="image/*" className="hidden" disabled={uploadingImage}
                                                                        onChange={async e => {
                                                                            const file = e.target.files?.[0];
                                                                            if (file) {
                                                                                const url = await handleImageUpload(file, `gallery/${item.id}`);
                                                                                if (url) updateCustomBlock(item.id, 'content', [...(Array.isArray(item.content) ? item.content : []), url]);
                                                                            }
                                                                        }} />
                                                                </label>
                                                            </div>
                                                        )}

                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-gray-400">
                                    <LayoutTemplate size={32} className="mx-auto mb-3 opacity-30" />
                                    <p className="text-sm font-medium">Añade tu primera sección</p>
                                    <p className="text-xs mt-1 opacity-70">Usa los botones de abajo para comenzar</p>
                                </div>
                            )}

                            {/* Add sections */}
                            <div className="space-y-3 pt-2">
                                {/* Fixed modules (only show if not active) */}
                                {(!config.location?.enabled || !config.timeline?.enabled || !config.bank?.enabled) && (
                                    <div className="space-y-2">
                                        <SectionLabel>Añadir sección</SectionLabel>
                                        <div className="flex flex-wrap gap-2">
                                            {!config.timeline?.enabled && (
                                                <AddBlockButton icon={<Calendar size={14} />} label="Agenda" onClick={() => toggleModule('timeline')}
                                                    color="text-[#C5A065] bg-[#C5A065]/8 hover:bg-[#C5A065]/15 border-[#C5A065]/20" />
                                            )}
                                            {!config.location?.enabled && (
                                                <AddBlockButton icon={<MapPin size={14} />} label="Ubicación" onClick={() => toggleModule('location')}
                                                    color="text-[#C5A065] bg-[#C5A065]/8 hover:bg-[#C5A065]/15 border-[#C5A065]/20" />
                                            )}
                                            {!config.bank?.enabled && (
                                                <AddBlockButton icon={<Gift size={14} />} label="Regalo" onClick={() => toggleModule('bank')}
                                                    color="text-[#C5A065] bg-[#C5A065]/8 hover:bg-[#C5A065]/15 border-[#C5A065]/20" />
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Custom blocks */}
                                <div className="space-y-2">
                                    <SectionLabel>Añadir bloque personalizado</SectionLabel>
                                    <div className="flex flex-wrap gap-2">
                                        <AddBlockButton icon={<AlignLeft size={14} />} label="Texto" onClick={() => addBlock('text')}
                                            color="text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-100" />
                                        <AddBlockButton icon={<ImageIcon size={14} />} label="Imagen" onClick={() => addBlock('image')}
                                            color="text-violet-600 bg-violet-50 hover:bg-violet-100 border-violet-100" />
                                        <AddBlockButton icon={<Video size={14} />} label="Vídeo" onClick={() => addBlock('video')}
                                            color="text-red-500 bg-red-50 hover:bg-red-100 border-red-100" />
                                        <AddBlockButton icon={<Clock size={14} />} label="Cuenta atrás" onClick={() => addBlock('countdown')}
                                            color="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border-indigo-100" />
                                        <AddBlockButton icon={<Images size={14} />} label="Galería" onClick={() => addBlock('gallery')}
                                            color="text-pink-600 bg-pink-50 hover:bg-pink-100 border-pink-100" />
                                        <AddBlockButton icon={<Music size={14} />} label="Canción" onClick={() => addBlock('song')}
                                            color="text-amber-600 bg-amber-50 hover:bg-amber-100 border-amber-100" />
                                        <AddBlockButton icon={<MessageSquare size={14} />} label="Mensajes" onClick={() => addBlock('message')}
                                            color="text-teal-600 bg-teal-50 hover:bg-teal-100 border-teal-100" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── TAB: SETTINGS ──────────────────────────────────── */}
                    {activeTab === 'settings' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="space-y-4">
                                <SectionLabel>Configuración de Asistencia</SectionLabel>
                                <div className="bg-gray-50 rounded-2xl p-4 space-y-5 border border-gray-100">
                                    <FieldGroup label="Fecha Límite de Confirmación">
                                        <p className="text-[11px] text-gray-500 mb-2 leading-relaxed">A partir de esta fecha, los invitados no podrán confirmar ni cambiar su asistencia, y verán un mensaje indicando que el plazo ha finalizado.</p>
                                        <StyledInput
                                            type="datetime-local"
                                            value={config.rsvp?.deadline || ''}
                                            onChange={e => updateModule('rsvp', 'deadline', e.target.value)}
                                        />
                                        {config.rsvp?.deadline && (
                                            <button
                                                onClick={() => updateModule('rsvp', 'deadline', '')}
                                                className="text-[10px] text-red-500 font-bold uppercase tracking-wider hover:underline mt-2 flex items-center gap-1"
                                            >
                                                <Trash2 size={12} /> Eliminar fecha límite
                                            </button>
                                        )}
                                    </FieldGroup>

                                    <FieldGroup label="Mensaje predeterminado de WhatsApp">
                                        <p className="text-[11px] text-gray-500 mb-2 leading-relaxed">Mensaje al pulsar el botón de enviar por WhatsApp en la lista de invitados. Puedes usar <code className="bg-gray-200 px-1 py-0.5 rounded font-mono text-[10px] text-gray-800">{`{enlace}`}</code> para ubicar la posición del enlace a la invitación (si no se incluye, se añadirá automáticamente al final).</p>
                                        <StyledTextarea
                                            value={config.rsvp?.whatsappMessage ?? '¡Hola! Aquí tienes la invitación para la boda:'}
                                            onChange={e => updateModule('rsvp', 'whatsappMessage', e.target.value)}
                                            placeholder="¡Hola! Te compartimos la invitación a nuestra boda: {enlace}"
                                            rows={3}
                                        />
                                    </FieldGroup>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sticky Save Button */}
                <div className="px-5 py-4 bg-white border-t border-gray-100">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full py-3.5 bg-[#333] text-white font-bold text-xs uppercase tracking-[0.18em] rounded-2xl shadow-lg hover:bg-black hover:shadow-xl transition-all duration-300 disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                        {saving ? (
                            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Guardando...</>
                        ) : (
                            <><CheckCircle2 size={14} /> Guardar y Publicar</>
                        )}
                    </button>
                </div>
            </div>

            {/* ── RIGHT PANEL: LIVE PREVIEW ─────────────────────────────── */}
            <div className="hidden lg:flex flex-col items-center justify-center w-[460px] bg-[#F5F5F5] border-l border-gray-100 relative">
                <div className="absolute top-6 flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-100">
                    <Smartphone size={12} className="text-[#C5A065]" />
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">Vista Previa en Vivo</p>
                </div>

                {/* Phone frame */}
                <div className="w-[340px] h-[720px] bg-white border-[12px] border-[#1a1a1a] rounded-[3rem] shadow-2xl relative overflow-hidden transform scale-[0.92] ring-1 ring-black/10">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 h-6 w-32 bg-[#1a1a1a] rounded-b-2xl z-20" />
                    <div className="flex-1 h-full bg-white relative">
                        {previewUrl ? (
                            <iframe src={previewUrl} className="w-full h-full border-none" title="Live Preview" />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center text-gray-300 bg-gray-50">
                                <Smartphone size={40} className="mb-3 opacity-20" />
                                <p className="text-xs font-medium leading-relaxed">Crea tu primer invitado<br />para ver la preview</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Preview Modal */}
            {showMobilePreview && (
                <div className="fixed inset-0 z-50 bg-black/95 flex flex-col animate-fade-in">
                    <div className="flex items-center justify-between p-4 text-white bg-[#111] border-b border-white/10">
                        <div className="flex items-center gap-2">
                            <Smartphone size={14} className="text-[#C5A065]" />
                            <h3 className="font-bold text-xs uppercase tracking-widest">Vista Previa</h3>
                        </div>
                        <button onClick={() => setShowMobilePreview(false)} className="w-8 h-8 flex items-center justify-center bg-white/10 rounded-xl hover:bg-white/20 transition">
                            <X size={16} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-auto">
                        {previewUrl
                            ? <iframe src={previewUrl} className="w-full h-full border-none" title="Mobile Preview" />
                            : <div className="flex items-center justify-center h-full text-gray-500 text-sm">Cargando vista previa...</div>
                        }
                    </div>
                </div>
            )}
        </div>
    );
}
