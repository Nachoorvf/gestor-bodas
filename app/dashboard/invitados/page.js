'use client';
import { useState, useEffect } from 'react';
import { db } from '../../../firebase/config';
import { doc, updateDoc, onSnapshot, query, orderBy, collection, addDoc, deleteDoc, writeBatch, getDoc, arrayUnion } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { Search, Mail, Phone, Users, Check, X, Clock, Bus, Plus, Trash2, Edit2, Link, MessageCircle, ChevronLeft, Music, MessageSquare } from 'lucide-react';

export default function InvitadosPage() {
    const router = useRouter();
    const { user, userData, loading: authLoading } = useAuth();

    // DATA STATE
    const [invitations, setInvitations] = useState([]);
    const [guests, setGuests] = useState([]);
    const [guestGroups, setGuestGroups] = useState([]); // Custom groups
    const [weddingData, setWeddingData] = useState(null);

    // EDIT GUEST STATE
    const [editingGuest, setEditingGuest] = useState(null);

    // UI SEARCH/VIEW/FILTER
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('invitations'); // 'invitations' (Sobres), 'guests' (Todos), 'tags' (Etiquetas)
    const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'pending', 'confirmed', 'declined'

    // CREATE MODAL STATE
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newGuestData, setNewGuestData] = useState({
        name: '',
        phone: '',
        isGroup: false,
        groupName: ''
    });

    // EDIT/DETAILS STATE
    const [selectedInvitation, setSelectedInvitation] = useState(null);
    const [selectedInvitationId, setSelectedInvitationId] = useState(null);
    const [newMemberName, setNewMemberName] = useState('');
    const [editingEnvelopeName, setEditingEnvelopeName] = useState(false);
    const [tempEnvelopeName, setTempEnvelopeName] = useState('');

    // 1. AUTH & INIT
    useEffect(() => {
        if (authLoading) return;
    }, [user, authLoading, router]);

    const weddingId = userData?.weddingId;

    // 2. FETCH DATA & MERGE GROUPS
    useEffect(() => {
        if (!weddingId) return;

        const unsubWedding = onSnapshot(doc(db, 'weddings', weddingId), (docSnap) => {
            if (docSnap.exists()) {
                setWeddingData(docSnap.data());
            }
        });

        const qInv = query(collection(db, 'weddings', weddingId, 'invitations'), orderBy('createdAt', 'desc'));
        const unsubInv = onSnapshot(qInv, (snap) => {
            setInvitations(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const qGuests = query(collection(db, 'weddings', weddingId, 'guests'));
        const unsubGuests = onSnapshot(qGuests, async (snap) => {
            const guestsData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setGuests(guestsData);

            // SYNC GROUPS: Merge saved config + existing tags in use
            try {
                const docRef = doc(db, 'weddings', weddingId);
                const docSnap = await getDoc(docRef);

                const savedGroups = (docSnap.exists() && docSnap.data().guestGroups) ? docSnap.data().guestGroups : [];
                const defaultGroups = ['Familia Novia', 'Familia Novio', 'Amigos', 'Trabajo'];
                const usedTags = [...new Set(guestsData.map(g => g.role).filter(r => r && r !== 'invitado'))];

                // Combine unique values
                const allGroups = [...new Set([...defaultGroups, ...savedGroups, ...usedTags])].sort();
                setGuestGroups(allGroups);
            } catch (e) {
                console.error("Error syncing groups:", e);
            }
        });

        return () => { unsubWedding(); unsubInv(); unsubGuests(); };
    }, [weddingId]);

    // 1. UNIFIED CREATE (Guest + Wrapper Invitation)
    const handleCreateUnified = async (e) => {
        e.preventDefault();
        if (!newGuestData.name.trim()) return;

        try {
            const batch = writeBatch(db);
            const invRef = doc(collection(db, 'weddings', weddingId, 'invitations'));

            // Determine Envelope Name
            let envelopeName = "";
            if (newGuestData.isGroup) {
                if (newGuestData.groupName.trim()) {
                    envelopeName = newGuestData.groupName;
                } else {
                    const parts = newGuestData.name.trim().split(' ');
                    const surname = parts.length > 1 ? parts[parts.length - 1] : parts[0];
                    envelopeName = `Familia ${surname} `;
                }
            } else {
                // USER REQUEST: Use exact guest name for individual invitations
                envelopeName = newGuestData.name;
            }

            // Create Invitation Doc
            batch.set(invRef, {
                name: envelopeName,
                createdAt: new Date().toISOString(),
                isGroup: newGuestData.isGroup
            });

            // Create Guest Doc
            const guestRef = doc(collection(db, 'weddings', weddingId, 'guests'));
            batch.set(guestRef, {
                nombre: newGuestData.name,
                telefono: newGuestData.phone,
                invitationId: invRef.id,
                group: envelopeName,
                confirmado: null,
                bus: false,
                role: 'invitado', // Default tag
                creadoEn: new Date().toISOString()
            });

            await batch.commit();

            // Reset & Close
            setNewGuestData({ name: '', phone: '', isGroup: false, groupName: '' });
            setIsCreateModalOpen(false);

            // If it was a group, auto-select it to add more members immediately
            if (newGuestData.isGroup) {
                setSelectedInvitationId(invRef.id);
                // We mock the object since state update might lag slightly
                setSelectedInvitation({ id: invRef.id, name: envelopeName });
            }

        } catch (error) {
            console.error("Error creating:", error);
            alert("Error al crear invitado");
        }
    };

    // 2. ADD MEMBER TO EXISTING INVITATION
    const handleAddMember = async (e) => {
        e.preventDefault();
        if (!newMemberName.trim() || !selectedInvitationId) return;

        try {
            await addDoc(collection(db, 'weddings', weddingId, 'guests'), {
                nombre: newMemberName,
                invitationId: selectedInvitationId,
                group: selectedInvitation?.name || '',
                confirmado: null,
                bus: false,
                role: 'invitado', // Default tag
                creadoEn: new Date().toISOString()
            });
            setNewMemberName('');
        } catch (error) {
            console.error(error);
            alert("Error al añadir miembro");
        }
    };

    // 3. RENAME ENVELOPE (Update Invitation Name)
    const handleUpdateEnvelopeName = async () => {
        if (!tempEnvelopeName.trim() || !selectedInvitationId) return;

        try {
            const batch = writeBatch(db);

            // 1. Update Invitation Doc
            const invRef = doc(db, 'weddings', weddingId, 'invitations', selectedInvitationId);
            batch.update(invRef, { name: tempEnvelopeName });

            // 2. Update all Linked Guests
            const linkedGuests = guests.filter(g => g.invitationId === selectedInvitationId);
            linkedGuests.forEach(g => {
                const guestRef = doc(db, 'weddings', weddingId, 'guests', g.id);
                batch.update(guestRef, { group: tempEnvelopeName });
            });

            await batch.commit();

            // Update local selection to reflect change immediately
            setSelectedInvitation(prev => ({ ...prev, name: tempEnvelopeName }));
            setEditingEnvelopeName(false);
        } catch (error) {
            console.error("Error renaming:", error);
            alert("Error al renombrar");
        }
    };

    // 4. DELETE
    const handleDeleteInvitation = async (inv) => {
        if (!confirm(`¿Eliminar "${inv.name}" y sus miembros ? `)) return;
        try {
            const batch = writeBatch(db);
            batch.delete(doc(db, 'weddings', weddingId, 'invitations', inv.id));
            const linkedGuests = guests.filter(g => g.invitationId === inv.id);
            linkedGuests.forEach(g => {
                batch.delete(doc(db, 'weddings', weddingId, 'guests', g.id));
            });
            await batch.commit();
            if (selectedInvitationId === inv.id) {
                setSelectedInvitationId(null);
                setSelectedInvitation(null);
            }
        } catch (error) { console.error(error); }
    };

    const handleDeleteMember = async (guestId) => {
        if (!confirm("¿Borrar este invitado?")) return;
        await deleteDoc(doc(db, 'weddings', weddingId, 'guests', guestId));
    };

    const handleUpdateGuest = async (e) => {
        e.preventDefault();
        if (!editingGuest) return;

        try {
            await updateDoc(doc(db, 'weddings', weddingId, 'guests', editingGuest.id), {
                nombre: editingGuest.nombre || '',
                telefono: editingGuest.telefono || '',
                role: editingGuest.role || 'invitado',
                confirmado: editingGuest.confirmado === undefined ? null : editingGuest.confirmado,
                bus: editingGuest.bus || false
            });
            setEditingGuest(null);
        } catch (error) {
            console.error(error);
            alert("Error al actualizar invitado");
        }
    };

    // 5. QUICK ACTION: UPDATE STATUS DIRECTLY
    const handleQuickStatusUpdate = async (guestId, newStatus) => {
        try {
            await updateDoc(doc(db, 'weddings', weddingId, 'guests', guestId), {
                confirmado: newStatus
            });
        } catch (error) {
            console.error("Error updating status:", error);
        }
    };

    // HELPERS
    const getInvitationLink = (invId) => {
        if (typeof window === 'undefined') return '';
        return `${window.location.origin}/invitacion/${weddingId}/${invId}`;
    };

    const copyLink = (invId) => {
        navigator.clipboard.writeText(getInvitationLink(invId));
        alert("Enlace copiado");
    };

    const handleAddGroup = async (newGroup) => {
        if (!newGroup) return;
        try {
            await updateDoc(doc(db, 'weddings', weddingId), {
                guestGroups: arrayUnion(newGroup)
            });
            setGuestGroups(prev => [...prev, newGroup]);
        } catch (error) {
            console.error("Error adding group:", error);
            alert("Error al guardar el grupo");
        }
    };

    const sendWhatsApp = (invId, phone) => {
        const url = getInvitationLink(invId);
        const customMsg = weddingData?.invitationConfig?.rsvp?.whatsappMessage || "¡Hola! Aquí tienes la invitación para la boda:";
        let text = customMsg.trim();
        if (text.includes('{enlace}')) {
            text = text.replace(/{enlace}/g, url);
        } else if (text.includes('{link}')) {
            text = text.replace(/{link}/g, url);
        } else {
            text = `${text} ${url}`;
        }
        const target = phone ? `https://wa.me/${phone.replace(/\s+/g, '')}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(target, '_blank');
    };

    const handleSelectGuestFromList = (guest) => {
        // Select the invitation
        setSelectedInvitationId(guest.invitationId);
        const inv = invitations.find(i => i.id === guest.invitationId);
        if (inv) setSelectedInvitation(inv);
        setEditingEnvelopeName(false);
    };

    const getGroupedGuests = () => {
        const filtered = guests.filter(g => g.nombre.toLowerCase().includes(searchTerm.toLowerCase()));
        return filtered.reduce((groups, guest) => {
            const key = guest.role || 'Sin Etiqueta';
            if (!groups[key]) groups[key] = [];
            groups[key].push(guest);
            return groups;
        }, {});
    };

    // -- RENDER --
    // Filtered Guest List for "Guests" Mode
    const filteredGuests = guests
        .filter(g => g.nombre.toLowerCase().includes(searchTerm.toLowerCase()))
        .filter(g => {
            if (filterStatus === 'all') return true;
            if (filterStatus === 'pending') return g.confirmado === null;
            if (filterStatus === 'confirmed') return g.confirmado === true;
            if (filterStatus === 'declined') return g.confirmado === false;
            return true;
        })
        .sort((a, b) => a.nombre.localeCompare(b.nombre));

    const filteredInvitations = invitations.filter(inv => {
        if (!inv.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        // Apply status filter to envelopes (show envelope if ANY guest matches)
        if (filterStatus === 'all') return true;
        const invGuests = guests.filter(g => g.invitationId === inv.id);
        if (invGuests.length === 0) return filterStatus !== 'confirmed' && filterStatus !== 'declined'; // show empty only on pending/all
        return invGuests.some(g => {
            if (filterStatus === 'pending') return g.confirmado === null;
            if (filterStatus === 'confirmed') return g.confirmado === true;
            if (filterStatus === 'declined') return g.confirmado === false;
            return true;
        });
    });

    const getGroupedGuestsFiltered = () => {
        return filteredGuests.reduce((groups, guest) => {
            const key = guest.role || 'Sin Etiqueta';
            if (!groups[key]) groups[key] = [];
            groups[key].push(guest);
            return groups;
        }, {});
    };

    // Stats
    const totalGuests = guests.length;
    const confirmedGuests = guests.filter(g => g.confirmado === true).length;

    if (authLoading) return <div className="p-8 text-center text-[#333]">Cargando...</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20 h-full flex flex-col">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-gray-100 pb-6 shrink-0 md:bg-white md:p-6 md:rounded-[2rem] md:shadow-sm md:border-gray-100">
                <div>
                    <h1 className="text-4xl font-display text-[#333] mb-2">Mis Invitaciones</h1>
                    <div className="flex flex-wrap gap-4 text-sm font-sans text-gray-400">
                        <span className="bg-gray-50 px-3 py-1 rounded-full text-[#333]">Sobres: <b>{invitations.length}</b></span>
                        <span className="bg-gray-50 px-3 py-1 rounded-full text-[#333]">Personas: <b>{totalGuests}</b></span>
                        <span className="bg-green-50 px-3 py-1 rounded-full text-green-700">Confirmados: <b>{confirmedGuests}</b></span>
                    </div>
                </div>

                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="hidden md:flex bg-[#333] text-white px-8 py-4 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-black transition shadow-lg items-center gap-2 shrink-0"
                >
                    <Plus size={16} /> Crear Invitado
                </button>
            </div>

            {/* QUICK FILTERS (MOBILE FIRST) */}
            <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-none px-4 md:px-0 snap-x">
                {[
                    { id: 'all', label: 'Todos', icon: Users, color: 'text-gray-600', bg: 'bg-white border-gray-200' },
                    { id: 'pending', label: 'Pendientes', icon: Clock, color: 'text-orange-500', bg: 'bg-orange-50 border-orange-100/50' },
                    { id: 'confirmed', label: 'Vienen', icon: Check, color: 'text-green-600', bg: 'bg-green-50 border-green-100/50' },
                    { id: 'declined', label: 'No Vienen', icon: X, color: 'text-red-500', bg: 'bg-red-50 border-red-100/50' }
                ].map(f => {
                    const isActive = filterStatus === f.id;
                    const Icon = f.icon;
                    return (
                        <button
                            key={f.id}
                            onClick={() => setFilterStatus(f.id)}
                            className={`snap-start shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full border text-xs font-bold transition-all shadow-sm ${isActive ? 'bg-[#333] text-white border-[#333]' : f.bg} ${isActive ? '' : 'text-gray-500'}`}
                        >
                            <Icon size={12} className={isActive ? 'text-white' : undefined} /> {f.label}
                        </button>
                    )
                })}
            </div>

            {/* MOBILE FAB (Floating Action Button) */}
            <button
                onClick={() => setIsCreateModalOpen(true)}
                className="md:hidden fixed bottom-6 right-6 z-40 w-14 h-14 bg-[#333] text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-black transition animate-scale-up"
            >
                <Plus size={24} />
            </button>

            {/* SEARCH */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text" placeholder="Buscar por nombre, familia..."
                    className="bg-white border border-gray-100 shadow-sm focus:border-gray-200 rounded-xl pl-12 pr-4 py-4 w-full outline-none transition font-sans text-lg"
                    value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            {/* MAIN CONTENT SPLIT */}
            <div className="flex flex-col lg:flex-row gap-8 flex-1 min-h-0">

                {/* LEFT: INVITATIONS LIST */}
                <div className={`
                            bg-white flex-col rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden min-h-[400px]
                            ${selectedInvitationId ? 'hidden lg:flex lg:flex-1' : 'flex flex-1'}
                        `}>
                    <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex flex-col gap-3">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Listado</span>

                        {/* VIEW MODE TOGGLE */}
                        <div className="flex bg-gray-200 p-1 rounded-xl">
                            {[
                                { id: 'invitations', label: 'Sobres' },
                                { id: 'guests', label: 'Invitados' },
                                { id: 'tags', label: 'Grupos' }
                            ].map(mode => (
                                <button
                                    key={mode.id}
                                    onClick={() => setViewMode(mode.id)}
                                    className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition ${viewMode === mode.id ? 'bg-white text-[#333] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    {mode.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="overflow-y-auto flex-1 p-2 space-y-1">

                        {/* MODE: INVITATIONS (DEFAULT) */}
                        {viewMode === 'invitations' && (
                            <>
                                {filteredInvitations.length === 0 && <p className="text-center text-sm text-gray-400 py-20">No hay invitaciones creadas</p>}
                                {filteredInvitations.map(inv => {
                                    const invGuests = guests.filter(g => g.invitationId === inv.id);
                                    const confirmedCount = invGuests.filter(g => g.confirmado).length;
                                    const isSelected = selectedInvitationId === inv.id;
                                    const leadGuest = invGuests[0]; // Usually the first one created

                                    return (
                                        <div
                                            key={inv.id}
                                            onClick={() => {
                                                setSelectedInvitationId(inv.id);
                                                setSelectedInvitation(inv);
                                                setEditingEnvelopeName(false); // Reset edit mode
                                            }}
                                            className={`p-4 rounded-xl cursor-pointer transition border border-transparent group ${isSelected ? 'bg-gray-50 border-gray-200 shadow-inner' : 'hover:bg-gray-50'}`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    {/* Envelope Name */}
                                                    <h3 className={`font-serif text-lg leading-tight ${isSelected ? 'text-[#333]' : 'text-gray-700'}`}>{inv.name}</h3>

                                                    {/* Members Preview */}
                                                    <div className="mt-1 flex flex-wrap gap-1">
                                                        {invGuests.map(g => (
                                                            <span key={g.id} className="text-[10px] bg-white border border-gray-100 px-2 py-0.5 rounded text-gray-500">{g.nombre}</span>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Quick Actions (visible on hover or select) */}
                                                <div className={`flex gap-2 transition-opacity ${isSelected || 'md:opacity-0 group-hover:opacity-100'}`}>
                                                    <button onClick={(e) => { e.stopPropagation(); copyLink(inv.id); }} className="p-2 text-gray-400 hover:text-[#333] bg-white rounded-full border border-gray-100 shadow-sm" title="Copiar Enlace"><Link size={14} /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); sendWhatsApp(inv.id, leadGuest?.telefono); }} className="p-2 text-green-500 hover:text-green-600 bg-white rounded-full border border-gray-100 shadow-sm" title="Enviar WhatsApp"><MessageCircle size={14} /></button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </>
                        )}

                        {/* MODE: GUESTS (FLATTENED WITH QUICK ACTIONS) */}
                        {viewMode === 'guests' && (
                            <>
                                {filteredGuests.length === 0 && <p className="text-center text-sm text-gray-400 py-20">No se encontraron invitados</p>}
                                {filteredGuests.map(guest => (
                                    <div
                                        key={guest.id}
                                        className={`p-3 md:p-4 rounded-2xl transition border border-gray-100 shadow-sm mb-2 flex flex-col md:flex-row md:items-center justify-between gap-3 ${selectedInvitationId === guest.invitationId ? 'bg-gray-50 border-gray-300' : 'bg-white'}`}
                                    >
                                        <div
                                            className="flex items-center gap-3 cursor-pointer flex-1"
                                            onClick={() => handleSelectGuestFromList(guest)}
                                        >
                                            <div className={`shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-sm font-bold shadow-inner ${guest.confirmado ? 'bg-green-100 text-green-700' : (guest.confirmado === false ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-400')}`}>
                                                {guest.confirmado ? <Check size={18} /> : (guest.confirmado === false ? <X size={18} /> : <Clock size={18} />)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold text-[#333] text-base truncate">{guest.nombre}</p>
                                                    {guest.role && <span className="hidden md:inline-flex text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-medium">{guest.role}</span>}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <p className="text-[11px] md:text-xs text-gray-400 truncate">{guest.group || 'Sin Sobre'}</p>
                                                    {guest.cancion && <span className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded truncate max-w-[120px]" title={`Canción: ${guest.cancion}`}><Music size={10} shrink-0 /> <span className="truncate">{guest.cancion}</span></span>}
                                                    {guest.mensaje && <span className="flex items-center gap-1 text-[10px] text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded truncate max-w-[120px]" title={`Mensaje: "${guest.mensaje}"`}><MessageSquare size={10} shrink-0 /> <span className="truncate">Mensaje</span></span>}
                                                    {guest.role && <span className="md:hidden text-[9px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-medium">{guest.role}</span>}
                                                </div>                                            </div>
                                        </div>

                                        {/* QUICK ACTIONS MOBILE FIRST */}
                                        <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-1 shrink-0 w-full md:w-auto mt-2 md:mt-0 justify-between md:justify-end">
                                            <button
                                                onClick={() => handleQuickStatusUpdate(guest.id, null)}
                                                className={`flex-1 md:flex-none flex justify-center p-2 md:px-3 text-xs font-bold rounded-lg transition ${guest.confirmado === null ? 'bg-white shadow-sm text-gray-600 border border-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
                                            ><Clock size={16} /></button>
                                            <button
                                                onClick={() => handleQuickStatusUpdate(guest.id, true)}
                                                className={`flex-1 md:flex-none flex justify-center p-2 md:px-3 text-xs font-bold rounded-lg transition ${guest.confirmado === true ? 'bg-white shadow-sm text-green-600 border border-green-200' : 'text-green-300 hover:text-green-500'}`}
                                            ><Check size={16} /></button>
                                            <button
                                                onClick={() => handleQuickStatusUpdate(guest.id, false)}
                                                className={`flex-1 md:flex-none flex justify-center p-2 md:px-3 text-xs font-bold rounded-lg transition ${guest.confirmado === false ? 'bg-white shadow-sm text-red-500 border border-red-200' : 'text-red-200 hover:text-red-400'}`}
                                            ><X size={16} /></button>
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}

                        {/* MODE: TAGS (GROUPED) */}
                        {viewMode === 'tags' && (
                            <>
                                {Object.entries(getGroupedGuestsFiltered()).map(([groupName, groupGuests]) => (
                                    <div key={groupName} className="mb-4 bg-gray-50/50 rounded-xl overflow-hidden border border-gray-100">
                                        <div className="px-3 py-2 bg-gray-100 border-b border-gray-100 flex justify-between items-center">
                                            <span className="font-bold text-xs text-gray-600 uppercase tracking-wide">{groupName}</span>
                                            <span className="text-[10px] bg-white text-gray-400 px-1.5 py-0.5 rounded border border-gray-200">{groupGuests.length}</span>
                                        </div>
                                        <div className="p-1 space-y-1">
                                            {groupGuests.map(guest => (
                                                <div
                                                    key={guest.id}
                                                    onClick={() => handleSelectGuestFromList(guest)}
                                                    className={`p-3 md:p-2 rounded-lg cursor-pointer transition flex items-center justify-between ${selectedInvitationId === guest.invitationId ? 'bg-white shadow-sm border border-gray-100' : 'hover:bg-white/50'}`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-base md:text-sm font-medium text-gray-700">{guest.nombre}</span>
                                                        {guest.cancion && <Music size={12} className="text-amber-500" title={`Canción: ${guest.cancion}`} />}
                                                        {guest.mensaje && <MessageSquare size={12} className="text-teal-500" title={`Mensaje: "${guest.mensaje}"`} />}
                                                    </div>
                                                    <div className={`w-2 h-2 rounded-full ${guest.confirmado ? 'bg-green-500' : (guest.confirmado === false ? 'bg-red-500' : 'bg-gray-300')}`}></div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                {Object.keys(getGroupedGuestsFiltered()).length === 0 && <p className="text-center text-sm text-gray-400 py-20">No hay grupos</p>}
                            </>
                        )}

                    </div>
                </div>

                {/* RIGHT: DETAILS PANEL */}
                <div className={`
                            bg-white flex-col overflow-hidden
                            lg:flex-1 lg:max-w-md lg:rounded-[2rem] lg:shadow-sm lg:border lg:border-gray-100 lg:sticky lg:top-32 lg:self-start lg:max-h-[calc(100vh-8rem)] lg:min-h-[400px]
                            ${selectedInvitationId
                        ? 'flex w-full animate-fade-in'
                        : 'hidden lg:flex'
                    }
                        `}>
                    {selectedInvitationId ? (
                        <>
                            <div className="p-6 border-b border-gray-100 bg-gray-50/30">
                                {/* MOBILE BACK BUTTON */}
                                <button
                                    onClick={() => setSelectedInvitationId(null)}
                                    className="lg:hidden flex items-center gap-2 text-gray-400 hover:text-boda-text mb-6 transition"
                                >
                                    <ChevronLeft size={20} />
                                    <span className="text-xs font-bold uppercase tracking-widest">Volver</span>
                                </button>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1 mr-4">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Nombre del Sobre</span>
                                        {editingEnvelopeName ? (
                                            <div className="flex gap-2">
                                                <input
                                                    autoFocus
                                                    className="bg-white border border-gray-200 px-2 py-1 rounded text-xl font-display outline-none w-full"
                                                    value={tempEnvelopeName}
                                                    onChange={e => setTempEnvelopeName(e.target.value)}
                                                    onBlur={handleUpdateEnvelopeName}
                                                    onKeyDown={e => e.key === 'Enter' && handleUpdateEnvelopeName()}
                                                />
                                            </div>
                                        ) : (
                                            <div className="group flex items-center gap-2 cursor-pointer" onClick={() => { setTempEnvelopeName(selectedInvitation.name); setEditingEnvelopeName(true); }}>
                                                <h2 className="text-3xl font-display text-[#333] leading-none break-words">{selectedInvitation?.name}</h2>
                                                <Edit2 size={16} className="text-gray-300 group-hover:text-gray-500 opacity-0 group-hover:opacity-100 transition shrink-0" />
                                            </div>
                                        )}
                                    </div>
                                    <button onClick={() => handleDeleteInvitation(selectedInvitation)} className="text-red-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition"><Trash2 size={18} /></button>
                                </div>

                                <a href={`/invitacion/${weddingId}/${selectedInvitationId}`} target="_blank" className="inline-flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-full text-xs font-bold text-[#333] hover:bg-gray-50 transition">
                                    <Link size={12} /> Ver invitación pública
                                </a>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Contenido del Sobre</h3>
                                <div className="space-y-3 mb-6">
                                    {guests.filter(g => g.invitationId === selectedInvitationId).map(member => (
                                        <div
                                            key={member.id}
                                            onClick={() => setEditingGuest(member)}
                                            className="flex justify-between items-center p-4 bg-white rounded-xl border border-gray-100 shadow-sm animate-fade-in-up cursor-pointer hover:border-[#333] hover:shadow-md transition group"
                                        >
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-[#333] text-lg">{member.nombre}</span>
                                                    {member.confirmado === true && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><Check size={10} /> Viene</span>}
                                                    {member.confirmado === false && <span className="text-[10px] bg-red-50 text-red-500 px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><X size={10} /> No viene</span>}

                                                    {/* Bus Indicator in List */}
                                                    {member.bus && <span className="text-gray-400"><Bus size={14} /></span>}
                                                </div>
                                                <div className="flex flex-wrap gap-2 text-xs text-gray-400 mt-1">
                                                    {member.telefono && <span className="flex items-center gap-1 bg-gray-50 px-2 rounded"><Phone size={10} /> {member.telefono}</span>}
                                                    {member.role && <span className="bg-gray-100 px-2 rounded text-gray-500 font-medium">{member.role}</span>}
                                                    {member.alergias && <span className="bg-orange-50 text-orange-600 px-2 rounded font-medium border border-orange-100 whitespace-nowrap" title="Alergias">⚠️ {member.alergias}</span>}
                                                </div>
                                                {member.cancion && <div className="text-[10px] text-gray-500 mt-1.5 font-medium bg-gray-50 px-2 py-1 rounded-lg truncate flex items-center gap-1.5" title="Canción">🎵 {member.cancion}</div>}
                                                {member.mensaje && <div className="text-[10px] text-gray-600 mt-1.5 italic font-serif bg-gray-50/50 px-2.5 py-1.5 rounded-lg border-l-2 border-gray-200">"{member.mensaje}"</div>}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Edit2 size={14} className="text-[#333] opacity-0 group-hover:opacity-100 transition" />
                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteMember(member.id); }} className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition"><X size={16} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="border-t border-gray-100 pt-6">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Añadir otra persona al sobre</label>
                                    <form onSubmit={handleAddMember} className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Nombre del acompañante..."
                                            className="flex-1 bg-gray-50 border border-transparent focus:bg-white focus:border-gray-200 rounded-xl px-4 py-3 text-sm outline-none transition"
                                            value={newMemberName}
                                            onChange={e => setNewMemberName(e.target.value)}
                                        />
                                        <button
                                            type="submit"
                                            disabled={!newMemberName.trim()}
                                            className="bg-[#333] text-white px-6 rounded-xl font-bold hover:bg-black transition disabled:opacity-50"
                                        >
                                            Añadir
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-10 text-center opacity-40">
                            <Mail size={48} className="mb-4 text-gray-300" />
                            <p className="font-serif text-xl">Selecciona un sobre</p>
                            <p className="text-sm mt-2">Para ver quién va dentro</p>
                        </div>
                    )}
                </div>

            </div>

            {/* CREATE MODAL */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-scale-up relative">
                        <button onClick={() => setIsCreateModalOpen(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600"><X size={20} /></button>

                        <h2 className="font-display text-3xl text-[#333] mb-1">Nuevo Invitado</h2>
                        <p className="text-gray-400 text-sm mb-6">Primero añade los datos principales.</p>

                        <form onSubmit={handleCreateUnified} className="space-y-5">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Nombre Completo</label>
                                <input
                                    autoFocus
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-lg font-medium outline-none focus:border-[#333] transition"
                                    placeholder="Ej: Juan Pérez"
                                    value={newGuestData.name}
                                    onChange={e => setNewGuestData({ ...newGuestData, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Teléfono (Opcional)</label>
                                <input
                                    type="tel"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-lg outline-none focus:border-[#333] transition"
                                    placeholder="600 000 000"
                                    value={newGuestData.phone}
                                    onChange={e => setNewGuestData({ ...newGuestData, phone: e.target.value })}
                                />
                            </div>

                            <div className="pt-2">
                                <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition select-none">
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition ${newGuestData.isGroup ? 'bg-[#333] border-[#333]' : 'bg-white border-gray-300'}`}>
                                        {newGuestData.isGroup && <Check size={12} className="text-white" />}
                                    </div>
                                    <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={newGuestData.isGroup}
                                        onChange={e => setNewGuestData({ ...newGuestData, isGroup: e.target.checked })}
                                    />
                                    <div className="flex-1">
                                        <span className="block font-bold text-[#333] text-sm">Invitación Grupal (Sobre)</span>
                                        <span className="block text-xs text-gray-400">Activa esto para familias o parejas.</span>
                                    </div>
                                </label>
                            </div>

                            {newGuestData.isGroup && (
                                <div className="animate-fade-in-up">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Nombre del Sobre (Opcional)</label>
                                    <input
                                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#333] transition placeholder-gray-300"
                                        placeholder={`Ej: Familia ${newGuestData.name.split(' ')[0] || '...'}`}
                                        value={newGuestData.groupName}
                                        onChange={e => setNewGuestData({ ...newGuestData, groupName: e.target.value })}
                                    />
                                </div>
                            )}

                            <button type="submit" disabled={!newGuestData.name.trim()} className="w-full bg-[#333] text-white py-4 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-black transition shadow-lg disabled:opacity-50 mt-4">
                                Crear Invitado
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* EDIT GUEST MODAL */}
            {editingGuest && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-scale-up relative">
                        <button onClick={() => setEditingGuest(null)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600"><X size={20} /></button>

                        <h2 className="font-display text-2xl text-[#333] mb-6">Editar Invitado</h2>

                        <form onSubmit={handleUpdateGuest} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Nombre</label>
                                <input
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium outline-none focus:border-[#333] transition"
                                    value={editingGuest.nombre}
                                    onChange={e => setEditingGuest({ ...editingGuest, nombre: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Teléfono</label>
                                <input
                                    type="tel"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-[#333] transition"
                                    value={editingGuest.telefono || ''}
                                    onChange={e => setEditingGuest({ ...editingGuest, telefono: e.target.value })}
                                    placeholder="Sin teléfono"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Alergias o Menú</label>
                                <input
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-[#333] transition"
                                    value={editingGuest.alergias || ''}
                                    onChange={e => setEditingGuest({ ...editingGuest, alergias: e.target.value })}
                                    placeholder="Ej: Celíaco, Vegano..."
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Grupo / Etiqueta</label>
                                <div className="flex gap-2">
                                    <select
                                        className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-[#333] transition cursor-pointer appearance-none"
                                        value={editingGuest.role || ''}
                                        onChange={e => setEditingGuest({ ...editingGuest, role: e.target.value })}
                                    >
                                        <option value="">Sin Etiqueta</option>
                                        {guestGroups.map(group => (
                                            <option key={group} value={group}>{group}</option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newGroup = prompt("Nombre del nuevo grupo (ej: Amigos del Master):");
                                            if (newGroup && newGroup.trim()) handleAddGroup(newGroup.trim());
                                        }}
                                        className="px-4 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold text-lg text-[#333] transition flex items-center justify-center"
                                        title="Crear nuevo grupo"
                                    >
                                        <Plus size={20} />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Asistencia</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setEditingGuest({ ...editingGuest, confirmado: null })}
                                            className={`flex flex-col items-center justify-center gap-1 py-3 rounded-xl border transition ${editingGuest.confirmado === null
                                                ? 'bg-gray-100 border-gray-300 text-gray-600'
                                                : 'bg-white border-gray-100 text-gray-400 hover:bg-gray-50'
                                                }`}
                                        >
                                            <Clock size={16} />
                                            <span className="text-[10px] font-bold uppercase">Pendiente</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEditingGuest({ ...editingGuest, confirmado: true })}
                                            className={`flex flex-col items-center justify-center gap-1 py-3 rounded-xl border transition ${editingGuest.confirmado === true
                                                ? 'bg-green-50 border-green-200 text-green-700'
                                                : 'bg-white border-gray-100 text-gray-400 hover:bg-gray-50'
                                                }`}
                                        >
                                            <Check size={16} />
                                            <span className="text-[10px] font-bold uppercase">Sí</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEditingGuest({ ...editingGuest, confirmado: false })}
                                            className={`flex flex-col items-center justify-center gap-1 py-3 rounded-xl border transition ${editingGuest.confirmado === false
                                                ? 'bg-red-50 border-red-200 text-red-600'
                                                : 'bg-white border-gray-100 text-gray-400 hover:bg-gray-50'
                                                }`}
                                        >
                                            <X size={16} />
                                            <span className="text-[10px] font-bold uppercase">No</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="col-span-2">
                                    <label className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition ${editingGuest.bus ? 'bg-[#333] border-[#333] text-white' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={editingGuest.bus || false}
                                            onChange={e => setEditingGuest({ ...editingGuest, bus: e.target.checked })}
                                        />
                                        <Bus size={18} />
                                        <div className="flex-1">
                                            <span className="text-xs font-bold uppercase tracking-widest block">Autobús</span>
                                            <span className="text-[10px] opacity-70 block leading-none">Necesita transporte</span>
                                        </div>
                                        {editingGuest.bus && <Check size={16} />}
                                    </label>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setEditingGuest(null)} className="flex-1 py-3 text-gray-500 font-bold text-xs uppercase tracking-widest hover:bg-gray-50 rounded-xl transition">Cancelar</button>
                                <button type="submit" className="flex-1 bg-[#333] text-white py-3 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-black transition shadow-lg">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}


        </div>
    );
}
