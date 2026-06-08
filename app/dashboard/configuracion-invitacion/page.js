'use client';
import { useState, useEffect } from 'react';
import { db, storage } from '../../../firebase/config';
import { doc, getDoc, updateDoc, collection, query, limit, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import {
    MapPin, Calendar, Gift, Type, Image as ImageIcon, Video,
    Clock, Images, Trash2, Plus, ChevronUp, ChevronDown,
    Palette, Layout, Smartphone, AlignLeft, MousePointerClick, GripVertical, Eye, X, Check, Music, MessageSquare
} from 'lucide-react';

export default function InvitationConfigPage() {
    const router = useRouter();
    const { user, userData, loading: authLoading } = useAuth();

    // Local state
    const [loadingData, setLoadingData] = useState(true);
    const [weddingId, setWeddingId] = useState(null);
    const [weddingData, setWeddingData] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [newGalleryUrl, setNewGalleryUrl] = useState({}); // { blockId: 'url' }
    const [showMobilePreview, setShowMobilePreview] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);

    // CONFIG STATE
    const [config, setConfig] = useState({
        location: { enabled: false, address: '', mapUrl: '', title: 'Ubicación', order: 1 },
        bank: { enabled: false, iban: '', message: '', title: 'Regalo', order: 3 },
        timeline: { enabled: false, events: [], title: 'Agenda', order: 2 },
        rsvp: { enabled: true, askAllergies: true, askSong: true, askMessage: true, title: 'Formulario de Asistencia', order: 4 },
        bus: { enabled: false },
        design: {
            primaryColor: '#C5A065', // Gold default
            fontPair: 'serif', // serif | sans | script
            backgroundImage: 'https://images.unsplash.com/photo-1606800052052-a08af7148866?q=80&w=2070&auto=format&fit=crop',
            overlayOpacity: 50
        },
        customBlocks: [] // { id, type: 'text'|'image'|'video', content, title, order }
    });

    // Timeline Event Input
    const [newEvent, setNewEvent] = useState({ time: '', title: '' });

    // 1. LOAD DATA
    useEffect(() => {
        if (authLoading) return;
        if (!user) { router.push('/login'); return; }

        const loadWedding = async () => {
            if (userData?.weddingId) {
                const wId = userData.weddingId;
                setWeddingId(wId);

                try {
                    const wDoc = await getDoc(doc(db, 'weddings', wId));
                    if (wDoc.exists()) {
                        setWeddingData(wDoc.data());
                        if (wDoc.data().invitationConfig) {
                            const fetched = wDoc.data().invitationConfig;
                            setConfig(prev => ({
                                ...prev,
                                ...fetched,
                                location: { ...prev.location, ...fetched.location },
                                timeline: { ...prev.timeline, ...fetched.timeline },
                                rsvp: { ...(prev.rsvp || { enabled: true, askAllergies: true, askSong: true, askMessage: true, title: 'Formulario de Asistencia', order: 4 }), ...fetched.rsvp },
                                bank: { ...prev.bank, ...fetched.bank },
                                design: { ...prev.design, ...fetched.design },
                                customBlocks: fetched.customBlocks || []
                            }));
                        }

                        // FETCH PREVIEW INVITATION
                        const qInv = query(collection(db, 'weddings', wId, 'invitations'), limit(1));
                        const snapInv = await getDocs(qInv);
                        if (!snapInv.empty) {
                            const demoId = snapInv.docs[0].id;
                            setPreviewUrl(`/invitacion/${wId}/${demoId}?editor=true`);
                        } else {
                            setPreviewUrl(`/invitacion/${wId}/preview?editor=true`);
                        }
                    }
                } catch (error) {
                    console.error("Error loading wedding:", error);
                }
            }
            setLoadingData(false);
        };

        loadWedding();
    }, [user, userData, authLoading, router]);

    // 2. REAL-TIME PREVIEW
    useEffect(() => {
        const iframe = document.querySelector('iframe');
        if (iframe && iframe.contentWindow && previewUrl) {
            iframe.contentWindow.postMessage({ type: 'UPDATE_CONFIG', config }, '*');
        }
    }, [config, previewUrl]);

    const handleImageUpload = async (file, pathPrefix) => {
        if (!file) return null;
        if (!file.type.startsWith('image/')) {
            alert('Por favor, selecciona una imagen válida.');
            return null;
        }

        setUploadingImage(true);
        try {
            const fileExtension = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;
            // Guarda en una ruta específica dentro de la boda actual
            const storagePath = `weddings/${weddingId}/${pathPrefix}/${fileName}`;
            const storageRef = ref(storage, storagePath);

            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            return url;
        } catch (error) {
            console.error('Error al subir la imagen:', error);
            alert('Error al subir la imagen. Comprueba que el archivo no sea demasiado pesado.');
            return null;
        } finally {
            setUploadingImage(false);
        }
    };

    // --- HELPER: UNIFIED LIST OF ITEMS ---
    const getAllItems = () => {
        const fixed = ['location', 'timeline', 'bank', 'rsvp'].filter(key => key === 'rsvp' || config[key]?.enabled).map(key => ({
            id: key,
            type: 'fixed',
            order: config[key]?.order || 99,
            ...config[key]
        }));
        const custom = (config.customBlocks || []).map(b => ({
            ...b,
            isCustom: true
        }));
        return [...fixed, ...custom].sort((a, b) => a.order - b.order);
    };

    const handleSave = async () => {
        try {
            await updateDoc(doc(db, 'weddings', weddingId), {
                invitationConfig: config
            });
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
        setConfig(prev => {
            const isDisabling = prev[module].enabled;
            let newOrder = prev[module].order;

            if (isDisabling) {
                const all = Object.values(prev)
                    .filter(v => v.order && typeof v.order === 'number')
                    .map(v => v.order);
                const max = Math.max(...all, ...(prev.customBlocks || []).map(b => b.order), 0);
                newOrder = max + 1;
            }

            return {
                ...prev,
                [module]: { ...prev[module], enabled: !isDisabling, order: newOrder }
            };
        });
    };

    const updateModule = (module, field, value) => {
        setConfig(prev => ({
            ...prev,
            [module]: { ...prev[module], [field]: value }
        }));
    };

    // --- CUSTOM BLOCKS LOGIC ---
    const addBlock = (type) => {
        const items = getAllItems();
        const maxOrder = items.length > 0 ? Math.max(...items.map(i => i.order)) : 0;

        let initialContent = '';
        let initialTitle = '';

        if (type === 'text') initialTitle = 'Nuevo Texto';
        else if (type === 'countdown') {
            initialTitle = 'Nuestra Boda';
            const d = new Date();
            d.setMonth(d.getMonth() + 6);
            d.setMinutes(0);
            initialContent = d.toISOString().slice(0, 16);
        } else if (type === 'gallery') {
            initialTitle = 'Nuestra Historia';
            initialContent = [];
        } else if (type === 'song') {
            initialTitle = 'Sugerir Canción';
        } else if (type === 'message') {
            initialTitle = 'Libro de Firmas';
        }

        const newBlock = {
            id: `block_${Date.now()}`,
            type,
            content: initialContent,
            title: initialTitle,
            order: maxOrder + 1,
            enabled: true
        };

        setConfig(prev => ({
            ...prev,
            customBlocks: [...prev.customBlocks, newBlock]
        }));
    };

    const updateCustomBlock = (id, field, value) => {
        setConfig(prev => ({
            ...prev,
            customBlocks: prev.customBlocks.map(b => b.id === id ? { ...b, [field]: value } : b)
        }));
    };

    const removeCustomBlock = (id) => {
        if (!confirm("¿Borrar este bloque?")) return;
        setConfig(prev => ({
            ...prev,
            customBlocks: prev.customBlocks.filter(b => b.id !== id)
        }));
    };

    const moveItem = (id, direction) => {
        const items = getAllItems();
        const currentIndex = items.findIndex(i => i.id === id);
        if (currentIndex === -1) return;

        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (targetIndex < 0 || targetIndex >= items.length) return;

        const itemA = items[currentIndex];
        const itemB = items[targetIndex];

        const newOrderA = itemB.order;
        const newOrderB = itemA.order;

        setConfig(prev => {
            const next = { ...prev };
            if (itemA.isCustom) {
                next.customBlocks = next.customBlocks.map(b => b.id === itemA.id ? { ...b, order: newOrderA } : b);
            } else {
                next[itemA.id] = { ...next[itemA.id], order: newOrderA };
            }
            if (itemB.isCustom) {
                next.customBlocks = next.customBlocks.map(b => b.id === itemB.id ? { ...b, order: newOrderB } : b);
            } else {
                next[itemB.id] = { ...next[itemB.id], order: newOrderB };
            }
            return next;
        });
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

    if (loadingData) return <div className="p-20 text-center font-serif text-[#333]">Cargando estudio de diseño...</div>;

    const allItems = getAllItems();

    // Icon Helper
    const getBlockIcon = (item) => {
        if (!item.isCustom) {
            if (item.id === 'location') return <MapPin className="w-5 h-5 text-[#C5A065]" />;
            if (item.id === 'timeline') return <Calendar className="w-5 h-5 text-[#C5A065]" />;
            if (item.id === 'bank') return <Gift className="w-5 h-5 text-[#C5A065]" />;
            if (item.id === 'rsvp') return <Check className="w-5 h-5 text-[#C5A065]" />;
        } else {
            if (item.type === 'text') return <Type className="w-5 h-5 text-gray-500" />;
            if (item.type === 'image') return <ImageIcon className="w-5 h-5 text-gray-500" />;
            if (item.type === 'video') return <Video className="w-5 h-5 text-gray-500" />;
            if (item.type === 'countdown') return <Clock className="w-5 h-5 text-indigo-500" />;
            if (item.type === 'gallery') return <Images className="w-5 h-5 text-pink-500" />;
            if (item.type === 'song') return <Music className="w-5 h-5 text-amber-500" />;
            if (item.type === 'message') return <MessageSquare className="w-5 h-5 text-teal-500" />;
        }
        return <Layout className="w-5 h-5 text-gray-400" />;
    };

    return (
        <div className="flex flex-col lg:flex-row gap-8 min-h-[calc(100dvh-70px)] md:h-[calc(100dvh-100px)] lg:max-h-[calc(100dvh-100px)] overflow-x-hidden bg-white">

            {/* LEFT: EDITOR PANEL */}
            <div className="flex-1 flex flex-col min-h-0 relative">
                <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 md:px-6 md:py-8 space-y-10 scrollbar-thin scrollbar-thumb-gray-200">

                    {/* Header Section */}
                    <div className="mb-2">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Palette className="w-4 h-4 text-[#C5A065]" />
                                <p className="text-[#C5A065] uppercase tracking-[0.2em] text-[10px] font-bold">Estudio de Diseño</p>
                            </div>
                            <button
                                onClick={() => setShowMobilePreview(true)}
                                className="lg:hidden flex items-center gap-2 px-3 py-1.5 bg-[#333] text-white rounded-full text-xs font-bold uppercase tracking-wider shadow-md hover:bg-black transition"
                            >
                                <Eye size={12} /> Vista Previa
                            </button>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-display text-[#333] leading-tight">
                            Personaliza tu Invitación
                        </h1>
                        <p className="text-gray-400 text-sm mt-2 font-light">Diseña cada detalle para que sea única.</p>
                    </div>

                    {/* MOBILE PREVIEW MODAL */}
                    {showMobilePreview && (
                        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col animate-in fade-in duration-200">
                            <div className="flex items-center justify-between p-4 text-white bg-black border-b border-gray-800">
                                <h3 className="font-bold text-sm uppercase tracking-widest">Vista Previa</h3>
                                <button onClick={() => setShowMobilePreview(false)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-auto relative bg-white">
                                {previewUrl ? (
                                    <iframe
                                        src={previewUrl}
                                        className="w-full h-full border-none"
                                        title="Mobile Live Preview"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-400">
                                        Cargando vista previa...
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* MODULE: DESIGN STUDIO (Level 1) */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 pb-2 border-b border-gray-100">
                            <div className="w-8 h-8 rounded-full bg-[#C5A065]/10 flex items-center justify-center">
                                <Palette className="w-4 h-4 text-[#C5A065]" />
                            </div>
                            <h3 className="font-display text-xl text-[#333]">Ajustes Generales</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* CARD: APARIENCIA */}
                            <div className="p-4 md:p-5 rounded-xl border border-gray-100 bg-gray-50/50 shadow-sm space-y-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <ImageIcon size={14} className="text-gray-400" />
                                    <h4 className="text-xs font-bold uppercase tracking-widest text-[#333]">Apariencia Visual</h4>
                                </div>
                                {/* Color Picker */}
                                <div className="flex items-center justify-between group">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest group-hover:text-[#333] transition-colors">Color Principal</label>
                                    <div className="flex items-center gap-3 bg-gray-50 pl-3 pr-1 py-1 rounded-full border border-gray-200">
                                        <span className="text-xs font-mono text-gray-500 uppercase">{config.design?.primaryColor}</span>
                                        <div className="relative w-8 h-8 rounded-full overflow-hidden shadow-sm border border-white box-content">
                                            <input
                                                type="color"
                                                value={config.design?.primaryColor || '#C5A065'}
                                                onChange={(e) => updateModule('design', 'primaryColor', e.target.value)}
                                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] cursor-pointer p-0 border-0"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Typography Selector */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Tipografía</label>
                                    <div className="grid grid-cols-3 gap-2 md:gap-3">
                                        {[
                                            { id: 'serif', label: 'Elegante', font: 'font-serif' },
                                            { id: 'sans', label: 'Moderna', font: 'font-sans' },
                                            { id: 'script', label: 'Romántica', font: 'font-script' }
                                        ].map((font) => (
                                            <button
                                                key={font.id}
                                                onClick={() => updateModule('design', 'fontPair', font.id)}
                                                className={`py-3 px-1 md:px-2 rounded-xl border text-xs md:text-sm transition-all duration-300 ${config.design?.fontPair === font.id
                                                    ? 'border-[#333] bg-[#333] text-white shadow-md transform scale-[1.02]'
                                                    : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-300 hover:bg-white'
                                                    }`}
                                            >
                                                <span className={font.font}>{font.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* CARD: TEXTOS GENERALES */}
                            <div className="p-4 md:p-5 rounded-xl border border-gray-100 bg-gray-50/50 shadow-sm space-y-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <Type size={14} className="text-gray-400" />
                                    <h4 className="text-xs font-bold uppercase tracking-widest text-[#333]">Textos de Portada</h4>
                                </div>
                                {/* Welcome Message Input (Top) */}
                                <TextInput
                                    label="Mensaje Superior (Ej: Estás invitado a...)"
                                    value={config.design?.welcomeMessage}
                                    onChange={(e) => updateModule('design', 'welcomeMessage', e.target.value)}
                                    placeholder="Estás invitado a la boda de"
                                />

                                {/* Celebration Quote Input */}
                                <div className="relative">
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Frase de Celebración</label>
                                    <textarea
                                        value={config.design?.celebrationMessage || ''}
                                        onChange={(e) => updateModule('design', 'celebrationMessage', e.target.value)}
                                        placeholder="¡Queremos celebrar el amor con la gente que más queremos!"
                                        className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#333] focus:ring-1 focus:ring-[#333]/10 text-sm font-serif h-20 resize-none transition shadow-inner"
                                    />
                                </div>
                            </div>
                        </div>


                    </div>

                    {/* Background Image Input */}
                    <div className="space-y-3">
                        <TextInput
                            label="Imagen de Fondo (URL)"
                            value={config.design?.backgroundImage}
                            onChange={(e) => updateModule('design', 'backgroundImage', e.target.value)}
                            placeholder="https://..."
                            icon={<ImageIcon size={14} />}
                        />
                        <div className="text-[10px] text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-100 mt-2">
                            <p className="font-bold text-[#333] mb-1">ℹ️ O sube una foto directamente:</p>
                            <label className={`mt-2 flex items-center justify-center px-4 py-2 bg-white border border-gray-200 hover:border-[#333] hover:bg-gray-50 text-xs font-bold uppercase tracking-wider text-[#333] rounded-lg cursor-pointer transition w-full shadow-sm ${uploadingImage ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                <ImageIcon size={14} className="mr-2" />
                                {uploadingImage ? 'Subiendo...' : 'Seleccionar desde mi dispositivo'}
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    disabled={uploadingImage}
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            const url = await handleImageUpload(file, 'backgrounds');
                                            if (url) updateModule('design', 'backgroundImage', url);
                                        }
                                    }}
                                />
                            </label>
                        </div>
                    </div>

                    {/* Overlay Opacity */}
                    <div className="pt-2 border-t border-gray-100">
                        <div className="flex justify-between mb-3">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Intensidad del Fondo Oscuro</label>
                            <span className="text-[10px] font-bold text-[#333] bg-white px-2 py-0.5 rounded-md border border-gray-100">{config.design?.overlayOpacity || 50}%</span>
                        </div>
                        <input
                            type="range"
                            min="0" max="90"
                            value={config.design?.overlayOpacity || 50}
                            onChange={(e) => updateModule('design', 'overlayOpacity', parseInt(e.target.value))}
                            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#333]"
                        />
                    </div>

                    {/* BLOCK TOOLBAR */}
                    <div className="space-y-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Añadir Contenido</p>
                        <div className="flex flex-wrap gap-2 md:gap-3">
                            {!config.timeline?.enabled && <ToolbarBtn icon={<Calendar size={16} />} label="Agenda" onClick={() => toggleModule('timeline')} color="text-[#C5A065] bg-[#C5A065]/10 hover:bg-[#C5A065]/20" />}
                            {!config.location?.enabled && <ToolbarBtn icon={<MapPin size={16} />} label="Ubicación" onClick={() => toggleModule('location')} color="text-[#C5A065] bg-[#C5A065]/10 hover:bg-[#C5A065]/20" />}
                            {!config.bank?.enabled && <ToolbarBtn icon={<Gift size={16} />} label="Regalo" onClick={() => toggleModule('bank')} color="text-[#C5A065] bg-[#C5A065]/10 hover:bg-[#C5A065]/20" />}
                            <ToolbarBtn icon={<AlignLeft size={16} />} label="Texto" onClick={() => addBlock('text')} />
                            <ToolbarBtn icon={<ImageIcon size={16} />} label="Imagen" onClick={() => addBlock('image')} />
                            <ToolbarBtn icon={<Video size={16} />} label="Video" onClick={() => addBlock('video')} />
                            <ToolbarBtn icon={<Clock size={16} />} label="T.Restante" onClick={() => addBlock('countdown')} color="text-indigo-600 bg-indigo-50 hover:bg-indigo-100" />
                            <ToolbarBtn icon={<Images size={16} />} label="Galería" onClick={() => addBlock('gallery')} color="text-pink-600 bg-pink-50 hover:bg-pink-100" />
                            <ToolbarBtn icon={<Music size={16} />} label="Canción" onClick={() => addBlock('song')} color="text-amber-600 bg-amber-50 hover:bg-amber-100" />
                            <ToolbarBtn icon={<MessageSquare size={16} />} label="Mensajes" onClick={() => addBlock('message')} color="text-teal-600 bg-teal-50 hover:bg-teal-100" />
                        </div>
                    </div>

                    {/* UNIFIED MODULES LIST */}
                    <div className="space-y-6">
                        {allItems.map((item, index) => {
                            const isFirst = index === 0;
                            const isLast = index === allItems.length - 1;
                            const icon = getBlockIcon(item);

                            return (
                                <div key={item.id} className={`group relative p-4 md:p-5 rounded-xl transition-all duration-300 border ${item.enabled || item.id === 'rsvp'
                                    ? 'border-gray-200 bg-white shadow-sm hover:shadow-md'
                                    : 'border-gray-100 bg-gray-50/50 opacity-70'
                                    }`}>
                                    {/* Handle Drag Indicator (Visual only for now) */}
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
                                        <GripVertical size={16} />
                                    </div>

                                    {/* Header */}
                                    <div className="flex flex-col gap-4 mb-6 pl-4">
                                        <div className="flex justify-between items-center w-full min-w-0">
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${item.enabled ? 'bg-gray-50' : 'bg-white'}`}>
                                                    {icon}
                                                </div>
                                                {/* Renaming */}
                                                <input
                                                    type="text"
                                                    value={item.title || ''}
                                                    onChange={(e) => item.isCustom ? updateCustomBlock(item.id, 'title', e.target.value) : updateModule(item.id, 'title', e.target.value)}
                                                    className="font-display text-lg text-[#333] bg-transparent border-transparent focus:border-gray-200 border-b outline-none transition px-1 -ml-1 placeholder-gray-400 min-w-0 w-full"
                                                    placeholder="Título del bloque"
                                                />
                                            </div>

                                            <div className="flex items-center gap-2 md:gap-3 shrink-0 ml-2">
                                                <div className="flex flex-col gap-1">
                                                    <button onClick={() => moveItem(item.id, 'up')} disabled={isFirst} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-[#333] disabled:opacity-20"><ChevronUp size={14} /></button>
                                                    <button onClick={() => moveItem(item.id, 'down')} disabled={isLast} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-[#333] disabled:opacity-20"><ChevronDown size={14} /></button>
                                                </div>

                                                {/* Delete for Custom/Fixed, Switch for RSVP */}
                                                {(item.isCustom || item.id !== 'rsvp') ? (
                                                    <button onClick={() => item.isCustom ? removeCustomBlock(item.id) : toggleModule(item.id)} className="w-8 h-8 flex items-center justify-center rounded-full text-red-300 hover:text-red-500 hover:bg-red-50 transition ml-2">
                                                        <Trash2 size={16} />
                                                    </button>
                                                ) : (
                                                    <div className="px-2 py-1 bg-gray-100 rounded text-[10px] font-bold uppercase tracking-widest text-[#333] ml-2 select-none border border-gray-200">Obligatorio</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* CONTENT RENDERERS */}
                                    {(item.enabled || item.id === 'rsvp') && (
                                        <div className="pl-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <div className="pt-4 border-t border-gray-50 space-y-6">

                                                {/* --- FIXED MODULES --- */}
                                                {!item.isCustom && item.id === 'location' && (
                                                    <>
                                                        <TextInput label="Dirección Completa" value={config.location.address} onChange={(e) => updateModule('location', 'address', e.target.value)} icon={<MapPin size={14} />} />
                                                        <TextInput label="Enlace Google Maps" value={config.location.mapUrl} onChange={(e) => updateModule('location', 'mapUrl', e.target.value)} placeholder="https://maps.google.com/..." />
                                                    </>
                                                )}
                                                {!item.isCustom && item.id === 'timeline' && (
                                                    <div className="space-y-4">
                                                        <div className="flex flex-col sm:flex-row gap-3 items-end p-4 bg-gray-50 rounded-xl border border-gray-100">
                                                            <div className="w-full sm:w-28"><TextInput label="Hora" type="time" value={newEvent.time} onChange={e => setNewEvent({ ...newEvent, time: e.target.value })} /></div>
                                                            <div className="w-full sm:flex-1"><TextInput label="Actividad" placeholder="Ej: Ceremonia" value={newEvent.title} onChange={e => setNewEvent({ ...newEvent, title: e.target.value })} /></div>
                                                            <button onClick={addEvent} className="h-[42px] w-full sm:w-[42px] shrink-0 bg-[#333] text-white rounded-lg hover:bg-black transition flex items-center justify-center shadow-md">
                                                                <Plus size={20} className="hidden sm:block" />
                                                                <span className="sm:hidden font-bold text-xs uppercase tracking-widest">Añadir</span>
                                                            </button>
                                                        </div>
                                                        <div className="space-y-2">
                                                            {config.timeline.events?.map((ev, i) => (
                                                                <div key={i} className="flex justify-between items-center bg-white p-3 px-4 rounded-lg border border-gray-100 shadow-sm hover:border-gray-200 transition">
                                                                    <div className="flex items-center gap-3 min-w-0 pr-2">
                                                                        <span className="font-mono text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded shrink-0">{ev.time}</span>
                                                                        <span className="font-display text-[#333] truncate min-w-0">{ev.title}</span>
                                                                    </div>
                                                                    <button onClick={() => removeEvent(i)} className="text-gray-300 hover:text-red-400 p-1 shrink-0"><Trash2 size={14} /></button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                {!item.isCustom && item.id === 'bank' && (
                                                    <div className="space-y-4">
                                                        <div className="relative">
                                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Mensaje de Agradecimiento</label>
                                                            <textarea
                                                                placeholder="Vuestro regalo es vuestra asistencia, pero si queréis tener un detalle..."
                                                                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-[#333] focus:ring-1 focus:ring-[#333]/10 text-sm font-serif h-28 resize-none transition"
                                                                value={config.bank.message}
                                                                onChange={(e) => updateModule('bank', 'message', e.target.value)}
                                                            />
                                                        </div>
                                                        <TextInput label="Número de Cuenta (IBAN)" value={config.bank.iban} onChange={(e) => updateModule('bank', 'iban', e.target.value)} placeholder="ES00 0000..." icon={<Gift size={14} />} />
                                                    </div>
                                                )}
                                                {!item.isCustom && item.id === 'rsvp' && (
                                                    <div className="space-y-4">
                                                        <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition border border-gray-100 shadow-sm">
                                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition ${config.rsvp?.askAllergies !== false ? 'bg-[#333] border-[#333]' : 'bg-white border-gray-300'}`}>
                                                                {config.rsvp?.askAllergies !== false && <Check size={12} className="text-white" />}
                                                            </div>
                                                            <input type="checkbox" checked={config.rsvp?.askAllergies !== false} onChange={(e) => updateModule('rsvp', 'askAllergies', e.target.checked)} className="hidden" />
                                                            <div className="flex-1 min-w-0">
                                                                <span className="text-sm font-bold text-[#333] block truncate">Preguntar sobre Alergias y Dietas Especiales</span>
                                                                <span className="text-xs text-gray-500 block truncate">Recomendado para organizar el menú del banquete seguro y sin sustos.</span>
                                                            </div>
                                                        </label>
                                                    </div>
                                                )}

                                                {/* --- CUSTOM BLOCKS --- */}
                                                {item.isCustom && item.type === 'text' && (
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Contenido</label>
                                                        <textarea
                                                            value={item.content}
                                                            onChange={(e) => updateCustomBlock(item.id, 'content', e.target.value)}
                                                            className="w-full p-4 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#333] focus:ring-1 focus:ring-[#333]/10 min-h-[120px] text-sm font-serif shadow-inner"
                                                            placeholder="Escribe aquí vuestra historia, una dedicatoria o cualquier información importante..."
                                                        />
                                                    </div>
                                                )}

                                                {item.isCustom && item.type === 'image' && (
                                                    <div className="flex flex-col gap-4">
                                                        <TextInput
                                                            label="Enlace de la Imagen"
                                                            value={item.content}
                                                            onChange={(e) => updateCustomBlock(item.id, 'content', e.target.value)}
                                                            placeholder="https://..."
                                                        />
                                                        <div className="flex flex-col sm:flex-row items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100 border-dashed">
                                                            <div className="w-full sm:w-24 h-48 sm:h-24 bg-white rounded-lg overflow-hidden shrink-0 border border-gray-200 flex items-center justify-center relative group">
                                                                {item.content ? <img src={item.content} className="w-full h-full object-cover" /> : <ImageIcon className="text-gray-300" size={24} />}
                                                            </div>
                                                            <div className="text-xs text-gray-500 space-y-3 w-full sm:flex-1">
                                                                <p className="font-bold text-[#333]">O sube tu imagen desde aquí:</p>
                                                                <label className={`flex items-center justify-center px-4 py-2 bg-white border border-gray-200 hover:border-[#333] hover:bg-gray-50 text-xs font-bold uppercase tracking-wider text-[#333] rounded-lg cursor-pointer transition w-full shadow-sm ${uploadingImage ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                                    <ImageIcon size={14} className="mr-2" />
                                                                    {uploadingImage ? 'Subiendo...' : 'Subir imagen'}
                                                                    <input
                                                                        type="file"
                                                                        accept="image/*"
                                                                        className="hidden"
                                                                        disabled={uploadingImage}
                                                                        onChange={async (e) => {
                                                                            const file = e.target.files?.[0];
                                                                            if (file) {
                                                                                const url = await handleImageUpload(file, `blocks/${item.id}`);
                                                                                if (url) updateCustomBlock(item.id, 'content', url);
                                                                            }
                                                                        }}
                                                                    />
                                                                </label>
                                                                <p className="text-[10px]">Puedes pegar una URL en la caja de arriba o subir un archivo directamente.</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {item.isCustom && item.type === 'video' && (
                                                    <TextInput
                                                        label="Enlace Embed de YouTube"
                                                        placeholder="https://www.youtube.com/embed/VIDEO_ID"
                                                        value={item.content}
                                                        onChange={(e) => updateCustomBlock(item.id, 'content', e.target.value)}
                                                        icon={<Video size={14} />}
                                                    />
                                                )}

                                                {item.isCustom && item.type === 'countdown' && (
                                                    <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
                                                        <TextInput
                                                            type="datetime-local"
                                                            label="Día y Hora de la Boda"
                                                            value={item.content}
                                                            onChange={(e) => updateCustomBlock(item.id, 'content', e.target.value)}
                                                        />
                                                    </div>
                                                )}

                                                {item.isCustom && item.type === 'song' && (
                                                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100/50 flex flex-col items-center justify-center text-center space-y-2 opacity-70 pointer-events-none">
                                                        <Music className="w-8 h-8 text-amber-500 mb-1" />
                                                        <p className="text-sm font-bold text-[#333]">Módulo: Sugerir Canción</p>
                                                        <p className="text-[10px] text-gray-500">Muestra un campo de texto donde los invitados sugerirán canciones.</p>
                                                    </div>
                                                )}

                                                {item.isCustom && item.type === 'message' && (
                                                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100/50 flex flex-col items-center justify-center text-center space-y-2 opacity-70 pointer-events-none">
                                                        <MessageSquare className="w-8 h-8 text-teal-500 mb-1" />
                                                        <p className="text-sm font-bold text-[#333]">Módulo: Libro de Firmas</p>
                                                        <p className="text-[10px] text-gray-500">Muestra una caja de texto donde tus invitados dejarán mensajes de felicitación.</p>
                                                    </div>
                                                )}

                                                {item.isCustom && item.type === 'gallery' && (
                                                    <div className="space-y-4">
                                                        <div className="flex flex-wrap gap-3">
                                                            {(Array.isArray(item.content) ? item.content : []).map((imgUrl, idx) => (
                                                                <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden group border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition">
                                                                    <img src={imgUrl} className="w-full h-full object-cover" />
                                                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                        <button
                                                                            onClick={() => {
                                                                                const newImages = item.content.filter((_, i) => i !== idx);
                                                                                updateCustomBlock(item.id, 'content', newImages);
                                                                            }}
                                                                            className="bg-white/90 text-red-500 rounded-full p-1 hover:scale-110 transition"
                                                                        >
                                                                            <Trash2 size={12} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ))}

                                                            {/* Add Image Input */}
                                                            <div className="w-full mt-2 space-y-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                                                <div className="flex flex-col sm:flex-row gap-2">
                                                                    <div className="flex-1 relative w-full">
                                                                        <input
                                                                            type="text"
                                                                            placeholder="Pegar enlace de la foto..."
                                                                            className="w-full pl-3 pr-3 py-2.5 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-pink-300 transition"
                                                                            value={newGalleryUrl[item.id] || ''}
                                                                            onChange={(e) => setNewGalleryUrl({ ...newGalleryUrl, [item.id]: e.target.value })}
                                                                        />
                                                                    </div>
                                                                    <button
                                                                        onClick={() => {
                                                                            const url = newGalleryUrl[item.id];
                                                                            if (!url) return;
                                                                            const current = Array.isArray(item.content) ? item.content : [];
                                                                            updateCustomBlock(item.id, 'content', [...current, url]);
                                                                            setNewGalleryUrl({ ...newGalleryUrl, [item.id]: '' });
                                                                        }}
                                                                        disabled={!newGalleryUrl[item.id]}
                                                                        className="px-4 py-2.5 sm:py-0 w-full sm:w-auto bg-[#333] text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition flex justify-center items-center gap-1 shadow-sm"
                                                                    >
                                                                        <Plus size={14} /> Añadir URL
                                                                    </button>
                                                                </div>

                                                                <div className="relative">
                                                                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                                                                    <div className="relative flex justify-center text-[10px] font-bold text-gray-400 uppercase tracking-widest"><span className="bg-gray-50 px-2">O sube archivo</span></div>
                                                                </div>

                                                                <label className={`flex items-center justify-center px-4 py-2.5 bg-white border border-gray-200 hover:border-pink-300 hover:text-pink-600 hover:bg-pink-50 text-xs font-bold uppercase tracking-wider text-[#333] rounded-lg cursor-pointer transition w-full shadow-sm ${uploadingImage ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                                    <ImageIcon size={14} className="mr-2" />
                                                                    {uploadingImage ? 'Subiendo...' : 'Subir foto a la galería'}
                                                                    <input
                                                                        type="file"
                                                                        accept="image/*"
                                                                        className="hidden"
                                                                        disabled={uploadingImage}
                                                                        onChange={async (e) => {
                                                                            const file = e.target.files?.[0];
                                                                            if (file) {
                                                                                const url = await handleImageUpload(file, `gallery/${item.id}`);
                                                                                if (url) {
                                                                                    const current = Array.isArray(item.content) ? item.content : [];
                                                                                    updateCustomBlock(item.id, 'content', [...current, url]);
                                                                                }
                                                                            }
                                                                        }}
                                                                    />
                                                                </label>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* FOOTER ACTIONS */}
                <div className="px-6 py-6 bg-white border-t border-gray-100 z-10">
                    <button onClick={handleSave} className="w-full py-4 bg-[#333] text-white font-bold text-xs uppercase tracking-[0.2em] rounded-xl shadow-xl hover:bg-black hover:scale-[1.01] hover:shadow-2xl transition-all duration-300 flex items-center justify-center gap-3">
                        Guardar Cambios y Publicar
                    </button>
                    <p className="text-center text-[10px] text-gray-400 mt-3 font-medium">Todos los cambios se reflejarán instantáneamente.</p>
                </div>
            </div>

            {/* RIGHT: LIVE PREVIEW */}
            <div className="hidden lg:flex flex-col items-center justify-center w-[500px] bg-gray-50 border-l border-gray-100 relative shadow-[inset_10px_0_30px_-10px_rgba(0,0,0,0.03)]">
                <div className="absolute top-8 flex flex-col items-center gap-2 animate-fade-in">
                    <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-100">
                        <Smartphone size={14} className="text-[#C5A065]" />
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Vista Previa Móvil</p>
                    </div>
                </div>

                <div className="w-[375px] h-[812px] bg-white border-[14px] border-[#333] rounded-[3.5rem] shadow-2xl relative overflow-hidden flex flex-col transform scale-90 ring-1 ring-black/5">
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
                            <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center text-gray-300 bg-gray-50">
                                <Smartphone size={48} className="mb-4 opacity-20" />
                                <p className="text-sm font-medium">Crea tu primer invitado<br />para generar la vista previa.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

        </div >
    );
}

// UI COMPONENTS FOR EDITOR
function TextInput({ label, type = "text", value, onChange, placeholder, icon }) {
    return (
        <div className="group">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 group-focus-within:text-[#333] transition-colors">{label}</label>
            <div className="relative">
                <input
                    type={type}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    className="w-full pb-2 pl-0 bg-transparent border-b border-gray-200 focus:border-[#333] outline-none transition-all duration-300 text-sm font-medium text-[#333] placeholder-gray-300 focus:pl-1"
                />
                {icon && <div className="absolute right-0 bottom-2 text-gray-300">{icon}</div>}
            </div>
        </div>
    );
}

function Switch({ checked, onChange }) {
    return (
        <button
            onClick={onChange}
            className={`w-11 h-6 rounded-full transition-all duration-300 relative focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#333]/30 ${checked ? 'bg-[#333]' : 'bg-gray-200'}`}
        >
            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm ${checked ? 'translate-x-5' : 'translate-x-0'}`}></div>
        </button>
    );
}

function ToolbarBtn({ icon, label, onClick, color = "bg-gray-50 hover:bg-gray-100 text-[#333]" }) {
    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl transition-all duration-300 hover:scale-[1.05] hover:shadow-md ${color}`}
        >
            <div className="opacity-80">{icon}</div>
            <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
        </button>
    );
}
