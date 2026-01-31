'use client';
import { useState, useEffect } from 'react';
import { db } from '../../../firebase/config';
import { doc, getDoc, updateDoc, onSnapshot, query, orderBy, collection, addDoc, deleteDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import GuestRow from '../../../components/admin/GuestRow';

export default function InvitadosPage() {
    const router = useRouter();
    const { user, userData, loading: authLoading } = useAuth();

    // DATA STATE
    const [guests, setGuests] = useState([]);
    const [availableGroups, setAvailableGroups] = useState([]);

    // ADD GUEST FORM
    const [nuevoInvitado, setNuevoInvitado] = useState('');
    const [nuevoTelefono, setNuevoTelefono] = useState('');
    const [nuevoGrupo, setNuevoGrupo] = useState(''); // Default empty/null

    // UI SEARCH/VIEW
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('list'); // 'list' | 'grouped'
    const [isContactSupported, setIsContactSupported] = useState(false);

    // MODALS
    const [editingGuest, setEditingGuest] = useState(null);
    const [tempData, setTempData] = useState({}); // For editing guest
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false); // For managing groups
    const [newGroupInput, setNewGroupInput] = useState(''); // For adding new group

    // 1. AUTH & INIT
    useEffect(() => {
        setIsContactSupported('contacts' in navigator && 'ContactsManager' in window);
        if (!authLoading && !user) router.push('/login');
    }, [user, authLoading, router]);

    const weddingId = userData?.weddingId;

    // 2. FETCH GROUPS & GUESTS
    useEffect(() => {
        if (!weddingId) return;

        // A. Fetch Wedding Data (Groups) - Realtime listener to keep sync
        const unsubWedding = onSnapshot(doc(db, 'weddings', weddingId), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                // If no groups defined yet, we could set defaults or empty
                setAvailableGroups(data.groups || ['Familia', 'Amigos', 'Trabajo']);
            }
        });

        // B. Fetch Guests
        const q = query(collection(db, 'weddings', weddingId, 'guests'), orderBy('creadoEn', 'desc'));
        const unsubGuests = onSnapshot(q, (snapshot) => {
            setGuests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => {
            unsubWedding();
            unsubGuests();
        };
    }, [weddingId]);

    // -- GROUP MANAGEMENT LOGIC --
    const handleAddGroup = async (e) => {
        e.preventDefault();
        if (!newGroupInput.trim()) return;
        const newGroups = [...availableGroups, newGroupInput.trim()];

        try {
            await updateDoc(doc(db, 'weddings', weddingId), { groups: newGroups });
            setNewGroupInput('');
        } catch (error) {
            console.error(error);
            alert("Error al añadir grupo");
        }
    };

    const handleDeleteGroup = async (groupToDelete) => {
        if (!confirm(`¿Borrar el grupo "${groupToDelete}"? Los invitados en este grupo mantendrán el dato, pero el grupo desaparecerá de la lista.`)) return;
        const newGroups = availableGroups.filter(g => g !== groupToDelete);

        try {
            await updateDoc(doc(db, 'weddings', weddingId), { groups: newGroups });
        } catch (error) {
            alert("Error al borrar grupo");
        }
    };

    // -- GUEST ACTIONS --
    const handleImportContact = async () => {
        try {
            const hits = await navigator.contacts.select(['name', 'tel'], { multiple: false });
            if (hits.length) {
                setNuevoInvitado(hits[0].name[0]);
                setNuevoTelefono(hits[0].tel[0].replace(/\s/g, ''));
            }
        } catch (e) { /* ignore */ }
    };

    const handleAddGuest = async (e) => {
        e.preventDefault();
        if (!nuevoInvitado.trim()) return;

        await addDoc(collection(db, 'weddings', weddingId, 'guests'), {
            nombre: nuevoInvitado,
            telefono: nuevoTelefono,
            group: nuevoGrupo || null, // Ensure null if empty string
            confirmado: null,
            bus: false,
            creadoEn: new Date().toISOString()
        });
        setNuevoInvitado('');
        setNuevoTelefono('');
        setNuevoGrupo('');
    };

    const sendWhatsApp = (e, guestId, nombre, telefono) => {
        e.stopPropagation();
        const url = `${window.location.origin}/invitacion/${weddingId}/${guestId}`;
        const message = `Hola ${nombre}! Me encantaría que vinieras a mi boda. Confirma tu asistencia aquí: ${url}`;
        const waUrl = `https://wa.me/${telefono?.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
        window.open(waUrl, '_blank');
    };

    const saveGuestChanges = async () => {
        try {
            const docRef = doc(db, 'weddings', weddingId, 'guests', editingGuest.id);
            await updateDoc(docRef, {
                confirmado: tempData.confirmado,
                bus: tempData.bus,
                telefono: tempData.telefono,
                group: tempData.group || null
            });
            setEditingGuest(null);
        } catch (error) {
            alert("Error al guardar");
        }
    };

    const handleDeleteGuest = async () => {
        if (!confirm("¿Borrar invitado?")) return;
        await deleteDoc(doc(db, 'weddings', weddingId, 'guests', editingGuest.id));
        setEditingGuest(null);
    };

    // -- RENDER HELPERS --
    const filteredGuests = guests.filter(g => g.nombre.toLowerCase().includes(searchTerm.toLowerCase()));

    // STATS
    const totalCount = guests.length;
    const confirmedCount = guests.filter(g => g.confirmado === true).length;
    const pendingCount = guests.filter(g => g.confirmado === null).length;

    if (authLoading) return <div className="p-8 text-center text-[#333]">Cargando...</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-gray-100 pb-6">
                <div>
                    <h1 className="text-4xl font-display text-[#333] mb-2">Lista de Invitados</h1>
                    <div className="flex gap-4 text-sm font-sans text-gray-400">
                        <span>Total: <b className="text-[#333]">{totalCount}</b></span>
                        <span>Confirmados: <b className="text-green-600">{confirmedCount}</b></span>
                        <span>Pendientes: <b className="text-orange-400">{pendingCount}</b></span>
                    </div>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    {/* SEARCH */}
                    <div className="relative flex-1 md:w-64">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                        <input
                            type="text" placeholder="Buscar..."
                            className="bg-gray-50 border border-transparent focus:bg-white focus:border-gray-200 rounded-xl pl-10 pr-4 py-2.5 w-full outline-none transition font-sans"
                            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* VIEW TOGGLE */}
                    <div className="flex bg-gray-50 p-1 rounded-xl">
                        <button onClick={() => setViewMode('list')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition uppercase tracking-wider ${viewMode === 'list' ? 'bg-white shadow text-[#333]' : 'text-gray-400'}`}>Lista</button>
                        <button onClick={() => setViewMode('grouped')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition uppercase tracking-wider ${viewMode === 'grouped' ? 'bg-white shadow text-[#333]' : 'text-gray-400'}`}>Grupos</button>
                    </div>
                </div>
            </div>

            {/* QUICK ADD + MANAGE GROUPS */}
            <div className="bg-white p-6 rounded-[2rem] shadow-xl shadow-gray-100/50 border border-gray-50 flex flex-col xl:flex-row gap-6 items-start xl:items-center">

                {/* ADD FORM */}
                <form onSubmit={handleAddGuest} className="flex-1 flex flex-col md:flex-row gap-3 w-full">
                    <div className="flex-1 min-w-[200px]">
                        <input
                            type="text" placeholder="Nombre del invitado..."
                            className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-gray-200 rounded-xl px-4 py-3 outline-none transition font-sans font-medium"
                            value={nuevoInvitado} onChange={e => setNuevoInvitado(e.target.value)}
                        />
                    </div>
                    <div className="w-full md:w-48 relative">
                        <select
                            className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-gray-200 rounded-xl px-4 py-3 outline-none transition appearance-none text-sm text-gray-600 cursor-pointer"
                            value={nuevoGrupo} onChange={e => setNuevoGrupo(e.target.value)}
                        >
                            <option value="">Sin Grupo (Ninguno)</option>
                            {availableGroups.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-xs">▼</div>
                    </div>
                    <div className="w-full md:w-40">
                        <input
                            type="tel" placeholder="Teléfono"
                            className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-gray-200 rounded-xl px-4 py-3 outline-none transition font-sans"
                            value={nuevoTelefono} onChange={e => setNuevoTelefono(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-2 w-full md:w-auto">
                        {isContactSupported && (
                            <button type="button" onClick={handleImportContact} className="bg-blue-50 text-blue-600 px-4 rounded-xl hover:bg-blue-100 transition text-xl" title="Importar">📒</button>
                        )}
                        <button type="submit" className="flex-1 md:flex-none bg-[#333] text-white px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-black transition shadow-lg shadow-gray-200">
                            Añadir
                        </button>
                    </div>
                </form>

                {/* MANAGE GROUPS BTN */}
                <button
                    onClick={() => setIsGroupModalOpen(true)}
                    className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-200 hover:text-[#333] hover:border-[#333] transition-colors pb-1 self-end xl:self-center shrink-0"
                >
                    Gestionar Grupos
                </button>
            </div>

            {/* GUEST LIST */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden min-h-[400px]">
                {guests.length === 0 ? (
                    <div className="text-center py-20 opacity-50">
                        <p className="text-6xl mb-4 grayscale">🌿</p>
                        <p className="font-serif text-xl text-[#333]">Añade tus primeros invitados</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {
                            viewMode === 'list' ? (
                                filteredGuests.length > 0 ? (
                                    filteredGuests.map(g => (
                                        <GuestRow key={g.id} guest={g} onClick={() => { setTempData({ ...g }); setEditingGuest(g); }} waAction={(e) => sendWhatsApp(e, g.id, g.nombre, g.telefono)} />
                                    ))
                                ) : <div className="p-10 text-center text-gray-400">Sin resultados</div>
                            ) : (
                                // GROUPED VIEW
                                (() => {
                                    const grouped = filteredGuests.reduce((acc, guest) => {
                                        const group = guest.group || 'Sin Grupo';
                                        if (!acc[group]) acc[group] = [];
                                        acc[group].push(guest);
                                        return acc;
                                    }, {});
                                    // Make sure "Sin Grupo" is last or first? Last usually better.

                                    return Object.entries(grouped).map(([groupName, groupGuests]) => (
                                        <div key={groupName}>
                                            <div className="bg-gray-50/50 px-6 py-4 flex justify-between items-center border-y border-gray-100/50">
                                                <h3 className="font-bold text-[#333] uppercase tracking-[0.2em] text-xs font-sans">{groupName}</h3>
                                                <span className="bg-white text-gray-400 text-[10px] px-2 py-1 rounded-full font-bold shadow-sm border border-gray-100">{groupGuests.length}</span>
                                            </div>
                                            {groupGuests.map(g => (
                                                <GuestRow key={g.id} guest={g} onClick={() => { setTempData({ ...g }); setEditingGuest(g); }} waAction={(e) => sendWhatsApp(e, g.id, g.nombre, g.telefono)} />
                                            ))}
                                        </div>
                                    ));
                                })()
                            )
                        }
                    </div>
                )}
            </div>

            {/* EDIT GUEST MODAL */}
            {editingGuest && (
                <div className="fixed inset-0 bg-[#333]/40 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl p-8 md:p-10 relative">
                        <button onClick={() => setEditingGuest(null)} className="absolute top-8 right-8 text-gray-400 hover:text-[#333] text-2xl transition">×</button>

                        <div className="mb-8">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Editando</span>
                            <h2 className="text-4xl font-display text-[#333] mt-1">{editingGuest.nombre}</h2>
                        </div>

                        <div className="space-y-6">
                            {/* STATUS */}
                            <div className="flex bg-gray-50 p-1.5 rounded-2xl">
                                <StatusBtn active={tempData.confirmado === true} onClick={() => setTempData({ ...tempData, confirmado: true })} label="Asistirá" color="bg-white text-green-700 shadow-sm" />
                                <StatusBtn active={tempData.confirmado === false} onClick={() => setTempData({ ...tempData, confirmado: false, bus: false })} label="No irá" color="bg-white text-red-700 shadow-sm" />
                                <StatusBtn active={tempData.confirmado === null} onClick={() => setTempData({ ...tempData, confirmado: null, bus: false })} label="?" color="bg-white text-gray-600 shadow-sm" />
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Teléfono</label>
                                    <input
                                        type="text" className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 font-sans text-[#333] outline-none focus:ring-1 focus:ring-gray-200"
                                        value={tempData.telefono || ''} onChange={e => setTempData({ ...tempData, telefono: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Grupo</label>
                                    <div className="relative">
                                        <select
                                            className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 font-sans text-[#333] outline-none focus:ring-1 focus:ring-gray-200 appearance-none cursor-pointer"
                                            value={tempData.group || ''}
                                            onChange={e => setTempData({ ...tempData, group: e.target.value })}
                                        >
                                            <option value="">Sin Grupo</option>
                                            {availableGroups.map(g => <option key={g} value={g}>{g}</option>)}
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-xs">▼</div>
                                    </div>
                                </div>
                            </div>

                            <label className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl cursor-pointer hover:bg-gray-50 transition">
                                <span className="font-bold text-[#333] text-sm">Necesita Autobús</span>
                                <input
                                    type="checkbox"
                                    className="w-5 h-5 accent-[#333]"
                                    checked={tempData.bus || false}
                                    disabled={!tempData.confirmado}
                                    onChange={e => setTempData({ ...tempData, bus: e.target.checked })}
                                />
                            </label>

                            <div className="flex justify-between items-center pt-6 border-t border-gray-50">
                                <button onClick={handleDeleteGuest} className="text-red-400 text-xs font-bold uppercase tracking-widest hover:text-red-600 transition">Eliminar Invitado</button>
                                <button onClick={saveGuestChanges} className="bg-[#333] text-white px-8 py-3 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-black transition shadow-lg">Guardar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MANAGE GROUPS MODAL */}
            {isGroupModalOpen && (
                <div className="fixed inset-0 bg-[#333]/40 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-8 relative">
                        <button onClick={() => setIsGroupModalOpen(false)} className="absolute top-6 right-6 text-gray-400 hover:text-[#333] text-xl transition">×</button>

                        <h3 className="text-2xl font-display text-[#333] mb-6">Gestionar Grupos</h3>

                        {/* LIST */}
                        <div className="space-y-2 mb-6 max-h-[40vh] overflow-y-auto pr-2">
                            {availableGroups.length === 0 && <p className="text-gray-400 text-sm italic">No hay grupos creados.</p>}
                            {availableGroups.map(g => (
                                <div key={g} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl group hover:bg-gray-100 transition">
                                    <span className="font-sans font-medium text-[#333]">{g}</span>
                                    <button onClick={() => handleDeleteGroup(g)} className="text-gray-300 hover:text-red-500 transition px-2">✕</button>
                                </div>
                            ))}
                        </div>

                        {/* ADD */}
                        <form onSubmit={handleAddGroup} className="flex gap-2">
                            <input
                                type="text" placeholder="Nuevo grupo..."
                                className="flex-1 bg-gray-50 border-0 rounded-xl px-4 py-2 font-sans text-sm focus:ring-1 focus:ring-[#333] outline-none"
                                value={newGroupInput} onChange={e => setNewGroupInput(e.target.value)}
                            />
                            <button type="submit" className="bg-[#333] text-white w-10 h-10 rounded-xl flex items-center justify-center hover:bg-black transition text-xl">+</button>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}

// Sub-component for buttons
function StatusBtn({ active, onClick, label, color }) {
    return (
        <button
            onClick={onClick}
            className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${active ? color : 'text-gray-400 hover:text-gray-500'}`}
        >
            {label}
        </button>
    );
}
