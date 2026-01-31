'use client';
import { useState, useEffect } from 'react';
import { db } from '../../../firebase/config';
import { doc, collection, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Card from '../../../components/ui/Card';
import { useAuth } from '../../../context/AuthContext';
import DashboardSkeleton from '../../../components/loaders/DashboardSkeleton'; // Reuse skeleton
import GuestRow from '../../../components/admin/GuestRow';

export default function InvitadosPage() {
    const router = useRouter();
    const { user, userData, loading: authLoading } = useAuth();
    const [guests, setGuests] = useState([]);
    const [nuevoInvitado, setNuevoInvitado] = useState('');
    const [nuevoTelefono, setNuevoTelefono] = useState('');
    const [nuevoGrupo, setNuevoGrupo] = useState('Familia'); // Default group
    const [isContactSupported, setIsContactSupported] = useState(false);

    // UI State
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('list'); // 'list' | 'grouped'

    // MODAL STATE
    const [editingGuest, setEditingGuest] = useState(null);
    const [tempData, setTempData] = useState({});

    // 1. Auth & Feature Check
    useEffect(() => {
        // Feature check for contacts
        setIsContactSupported('contacts' in navigator && 'ContactsManager' in window);

        // Auth redirect
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    // 2. Fetch Guests (Depend on userData.weddingId)
    const weddingId = userData?.weddingId;

    useEffect(() => {
        if (!weddingId) return;
        const q = query(collection(db, 'weddings', weddingId, 'guests'), orderBy('creadoEn', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setGuests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, [weddingId]);

    const handleImportContact = async () => {
        try {
            const props = ['name', 'tel'];
            const contacts = await navigator.contacts.select(props, { multiple: false });

            if (contacts.length) {
                const contact = contacts[0];
                if (contact.name && contact.name.length) setNuevoInvitado(contact.name[0]);
                if (contact.tel && contact.tel.length) {
                    // Simple cleanup of phone number
                    setNuevoTelefono(contact.tel[0].replace(/\s/g, ''));
                }
            }
        } catch (ex) {
            console.error("Error importing contact", ex);
            // Ignore errors (user cancelled)
        }
    };

    const handleAddGuest = async (e) => {
        e.preventDefault();
        if (!nuevoInvitado.trim()) return;

        await addDoc(collection(db, 'weddings', weddingId, 'guests'), {
            nombre: nuevoInvitado,
            telefono: nuevoTelefono,
            group: nuevoGrupo,
            confirmado: null,
            bus: false,
            creadoEn: new Date().toISOString()
        });
        setNuevoInvitado('');
        setNuevoTelefono('');
    };

    const sendWhatsApp = (e, guestId, nombre, telefono) => {
        e.stopPropagation();
        const url = `${window.location.origin}/invitacion/${weddingId}/${guestId}`;
        const message = `Hola ${nombre}! Me encantaría que vinieras a mi boda. Confirma tu asistencia aquí: ${url}`;
        const encodedMessage = encodeURIComponent(message);

        let waUrl = `https://wa.me/?text=${encodedMessage}`;
        if (telefono) {
            // Ensure phone has no symbols for WA link, maybe just digits
            const cleanPhone = telefono.replace(/\D/g, '');
            waUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
        }

        window.open(waUrl, '_blank');
    };

    const openEditModal = (guest) => {
        setEditingGuest(guest);
        setTempData({ ...guest });
    };

    const saveChanges = async () => {
        try {
            const docRef = doc(db, 'weddings', weddingId, 'guests', editingGuest.id);
            await updateDoc(docRef, {
                confirmado: tempData.confirmado,
                bus: tempData.bus,
                telefono: tempData.telefono,
                group: tempData.group || 'Sin Grupo'
            });
            setEditingGuest(null);
        } catch (error) {
            alert("Error al guardar cambios");
        }
    };

    const handleDeleteGuest = async () => {
        if (!confirm("¿Seguro que quieres borrar a este invitado?")) return;
        try {
            await deleteDoc(doc(db, 'weddings', weddingId, 'guests', editingGuest.id));
            setEditingGuest(null);
        } catch (error) {
            alert("Error al borrar");
        }
    };

    if (authLoading) return <DashboardSkeleton />;

    return (
        <div className="max-w-5xl mx-auto animate-fade-in space-y-8">

            {/* HEADER & CONTROLS */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-gray-100 pb-6">
                <div>
                    <h1 className="text-3xl font-serif text-boda-text">Lista de Invitados</h1>
                    <p className="text-gray-400 mt-1">Gestiona la asistencia de tus seres queridos</p>
                </div>

                {/* Search & View Toggle */}
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                        <input
                            type="text"
                            placeholder="Buscar..."
                            className="bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:border-boda-text w-full sm:w-48 transition"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                        <button onClick={() => setViewMode('list')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${viewMode === 'list' ? 'bg-white shadow-sm text-boda-text' : 'text-gray-400'}`}>Lista</button>
                        <button onClick={() => setViewMode('grouped')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${viewMode === 'grouped' ? 'bg-white shadow-sm text-boda-text' : 'text-gray-400'}`}>Grupos</button>
                    </div>
                </div>
            </div>

            {/* QUICK ADD GUEST ROW */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center">
                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                    <span>+</span>
                </div>
                <form onSubmit={handleAddGuest} className="flex-1 flex flex-col md:flex-row gap-3 w-full">
                    <div className="flex-1 flex gap-2">
                        <input
                            type="text" placeholder="Nombre..."
                            className="flex-1 bg-gray-50 border border-transparent focus:bg-white focus:border-gray-200 rounded-xl px-4 py-2 outline-none transition-all w-full min-w-[120px]"
                            value={nuevoInvitado} onChange={(e) => setNuevoInvitado(e.target.value)}
                        />
                        <select
                            className="bg-gray-50 border border-transparent focus:bg-white focus:border-gray-200 rounded-xl px-3 py-2 outline-none text-sm text-gray-600"
                            value={nuevoGrupo} onChange={(e) => setNuevoGrupo(e.target.value)}
                        >
                            <option value="Familia">Familia</option>
                            <option value="Amigos">Amigos</option>
                            <option value="Trabajo">Trabajo</option>
                            <option value="Otros">Otros</option>
                        </select>
                    </div>
                    <input
                        type="tel" placeholder="Teléfono..."
                        className="w-full md:w-32 bg-gray-50 border border-transparent focus:bg-white focus:border-gray-200 rounded-xl px-4 py-2 outline-none transition-all"
                        value={nuevoTelefono} onChange={(e) => setNuevoTelefono(e.target.value)}
                    />
                    <div className="flex gap-2">
                        {isContactSupported && (
                            <button type="button" onClick={handleImportContact} className="bg-blue-50 text-blue-600 p-2 rounded-xl hover:bg-blue-100 transition" title="Importar contacto">
                                📒
                            </button>
                        )}
                        <button type="submit" className="bg-boda-text text-white px-6 py-2 rounded-xl font-medium hover:bg-black transition shadow-lg shadow-gray-200">
                            Añadir
                        </button>
                    </div>
                </form>
            </div>

            {/* GUEST LIST */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden min-h-[400px]">
                {guests.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-gray-300 text-6xl mb-4">📭</p>
                        <p className="text-gray-500 font-medium">Aún no hay invitados en la lista</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {(() => {
                            // Filter Logic
                            const filteredGuests = guests.filter(g => g.nombre.toLowerCase().includes(searchTerm.toLowerCase()));

                            // Grouping Logic
                            if (viewMode === 'grouped') {
                                const grouped = filteredGuests.reduce((acc, guest) => {
                                    const group = guest.group || 'Sin Grupo';
                                    if (!acc[group]) acc[group] = [];
                                    acc[group].push(guest);
                                    return acc;
                                }, {});

                                return Object.entries(grouped).map(([groupName, groupGuests]) => (
                                    <div key={groupName}>
                                        <div className="bg-gray-50 px-6 py-3 border-y border-gray-100 flex justify-between items-center">
                                            <h3 className="font-bold text-gray-500 uppercase tracking-widest text-xs">{groupName}</h3>
                                            <span className="bg-gray-200 text-gray-500 text-[10px] px-2 py-0.5 rounded-full font-bold">{groupGuests.length}</span>
                                        </div>
                                        {groupGuests.map(guest => <GuestRow key={guest.id} guest={guest} onClick={() => openEditModal(guest)} waAction={(e) => sendWhatsApp(e, guest.id, guest.nombre, guest.telefono)} />)}
                                    </div>
                                ));
                            }

                            // List Logic
                            if (filteredGuests.length === 0) return <div className="p-10 text-center text-gray-400">No se encontraron resultados</div>;

                            return filteredGuests.map(guest => (
                                <GuestRow key={guest.id} guest={guest} onClick={() => openEditModal(guest)} waAction={(e) => sendWhatsApp(e, guest.id, guest.nombre, guest.telefono)} />
                            ));
                        })()}
                    </div>
                )}
            </div>

            {/* MODAL (Reused logic, updated style) */}
            {editingGuest && (
                <div className="fixed inset-0 bg-boda-text/20 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl p-8 transform transition-all scale-100">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <p className="text-xs uppercase text-gray-400 font-bold tracking-widest mb-1">Editando Invitado</p>
                                <h2 className="text-3xl font-serif text-boda-text">{editingGuest.nombre}</h2>
                            </div>
                            <button onClick={() => setEditingGuest(null)} className="bg-gray-50 hover:bg-gray-100 w-10 h-10 rounded-full flex items-center justify-center text-gray-500 transition">✕</button>
                        </div>

                        <div className="space-y-8">
                            {/* Confirmation Toggle */}
                            <div>
                                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">¿Asistirá?</p>
                                <div className="flex bg-gray-50 p-1 rounded-2xl">
                                    <button
                                        onClick={() => setTempData({ ...tempData, confirmado: true })}
                                        className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${tempData.confirmado === true ? 'bg-white text-green-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                    >
                                        SÍ
                                    </button>
                                    <button
                                        onClick={() => setTempData({ ...tempData, confirmado: false, bus: false })}
                                        className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${tempData.confirmado === false ? 'bg-white text-red-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                    >
                                        NO
                                    </button>
                                    <button
                                        onClick={() => setTempData({ ...tempData, confirmado: null, bus: false })}
                                        className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${tempData.confirmado === null ? 'bg-white text-gray-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                    >
                                        ?
                                    </button>
                                </div>
                            </div>

                            {/* Extra Options */}
                            <div className="space-y-4">
                                <label className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl cursor-pointer hover:border-boda-text transition group">
                                    <span className="text-boda-text font-medium">Necesita Autobús</span>
                                    <input
                                        type="checkbox"
                                        className="accent-boda-text w-5 h-5"
                                        checked={tempData.bus || false}
                                        onChange={(e) => setTempData({ ...tempData, bus: e.target.checked })}
                                        disabled={!tempData.confirmado}
                                    />
                                </label>

                                <label className="block">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Teléfono / WhatsApp</span>
                                    <input
                                        type="tel"
                                        className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-gray-200 rounded-xl px-4 py-3 outline-none transition-all text-boda-text"
                                        value={tempData.telefono || ''}
                                        onChange={(e) => setTempData({ ...tempData, telefono: e.target.value })}
                                        placeholder="+34 600..."
                                    />
                                </label>

                                <label className="block">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Grupo</span>
                                    <select
                                        className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-gray-200 rounded-xl px-4 py-3 outline-none transition-all text-boda-text appearance-none"
                                        value={tempData.group || 'Familia'}
                                        onChange={(e) => setTempData({ ...tempData, group: e.target.value })}
                                    >
                                        <option value="Familia">Familia</option>
                                        <option value="Amigos">Amigos</option>
                                        <option value="Trabajo">Trabajo</option>
                                        <option value="Otros">Otros</option>
                                    </select>
                                </label>
                            </div>

                            {/* Footer Actions */}
                            <div className="flex justify-between items-center pt-6 border-t border-gray-50">
                                <button onClick={handleDeleteGuest} className="text-red-400 text-sm font-bold hover:text-red-600 px-4 py-2 hover:bg-red-50 rounded-xl transition">Eliminar</button>
                                <button onClick={saveChanges} className="bg-boda-text text-white px-8 py-3 rounded-xl font-bold hover:bg-black shadow-lg shadow-gray-200 transition">Guardar Cambios</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
