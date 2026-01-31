'use client';
import { useState, useEffect } from 'react';
import { db } from '../../../firebase/config';
import { doc, collection, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Card from '../../../components/ui/Card';
import { useAuth } from '../../../context/AuthContext';
import DashboardSkeleton from '../../../components/loaders/DashboardSkeleton'; // Reuse skeleton

export default function InvitadosPage() {
    const router = useRouter();
    const { user, userData, loading: authLoading } = useAuth();
    const [guests, setGuests] = useState([]);
    const [nuevoInvitado, setNuevoInvitado] = useState('');
    const [nuevoTelefono, setNuevoTelefono] = useState('');
    const [isContactSupported, setIsContactSupported] = useState(false);

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
                telefono: tempData.telefono // Save phone edits too
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

            {/* HEADER & STATS */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-gray-100 pb-6">
                <div>
                    <h1 className="text-3xl font-serif text-boda-text">Lista de Invitados</h1>
                    <p className="text-gray-400 mt-1">Gestiona la asistencia de tus seres queridos</p>
                </div>
                <div className="flex gap-3">
                    <div className="px-4 py-2 bg-white border border-gray-100 rounded-xl shadow-sm text-center">
                        <span className="block text-xs text-gray-400 font-bold uppercase tracking-wider">Total</span>
                        <span className="text-xl font-serif text-boda-text">{guests.length}</span>
                    </div>
                    <div className="px-4 py-2 bg-green-50 border border-green-100 rounded-xl text-center">
                        <span className="block text-xs text-green-600 font-bold uppercase tracking-wider">Asistirán</span>
                        <span className="text-xl font-serif text-green-700">{guests.filter(g => g.confirmado === true).length}</span>
                    </div>
                    <div className="px-4 py-2 bg-red-50 border border-red-100 rounded-xl text-center">
                        <span className="block text-xs text-red-600 font-bold uppercase tracking-wider">No Asistirán</span>
                        <span className="text-xl font-serif text-red-700">{guests.filter(g => g.confirmado === false).length}</span>
                    </div>
                </div>
            </div>

            {/* QUICK ADD GUEST ROW */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center">
                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                    <span>+</span>
                </div>
                <form onSubmit={handleAddGuest} className="flex-1 flex flex-col md:flex-row gap-3 w-full">
                    <input
                        type="text" placeholder="Nombre del invitado..."
                        className="flex-1 bg-gray-50 border border-transparent focus:bg-white focus:border-gray-200 rounded-xl px-4 py-2 outline-none transition-all"
                        value={nuevoInvitado} onChange={(e) => setNuevoInvitado(e.target.value)}
                    />
                    <input
                        type="tel" placeholder="Teléfono (opcional)..."
                        className="w-full md:w-48 bg-gray-50 border border-transparent focus:bg-white focus:border-gray-200 rounded-xl px-4 py-2 outline-none transition-all"
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
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                {guests.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-gray-300 text-6xl mb-4">📭</p>
                        <p className="text-gray-500 font-medium">Aún no hay invitados en la lista</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {guests.map((guest) => {
                            const initials = guest.nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                            return (
                                <div key={guest.id} onClick={() => openEditModal(guest)} className="p-4 hover:bg-gray-50 transition-colors cursor-pointer flex items-center gap-4 group">

                                    {/* Avatar */}
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${guest.confirmado === true ? 'bg-green-100 text-green-700' :
                                        guest.confirmado === false ? 'bg-red-100 text-red-700' :
                                            'bg-gray-100 text-gray-500'
                                        }`}>
                                        {initials}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-boda-text truncate">{guest.nombre}</p>
                                            <span className={`w-2 h-2 rounded-full ${guest.confirmado === true ? 'bg-green-500' :
                                                guest.confirmado === false ? 'bg-red-500' : 'bg-gray-300'
                                                }`}></span>
                                        </div>
                                        <p className="text-xs text-gray-400 truncate">{guest.telefono || 'Sin teléfono'}</p>
                                    </div>

                                    {/* Badges */}
                                    <div className="hidden sm:flex items-center gap-2">
                                        {guest.bus && (
                                            <span className="px-2 py-1 bg-purple-50 text-purple-600 rounded-md text-[10px] font-bold uppercase tracking-wide">
                                                Bus
                                            </span>
                                        )}
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${guest.confirmado === true ? 'bg-green-50 text-green-700' :
                                            guest.confirmado === false ? 'bg-red-50 text-red-700' :
                                                'bg-gray-100 text-gray-500'
                                            }`}>
                                            {guest.confirmado === true ? 'Confirmado' : guest.confirmado === false ? 'No asiste' : 'Pendiente'}
                                        </span>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => sendWhatsApp(e, guest.id, guest.nombre, guest.telefono)}
                                            className="w-8 h-8 rounded-full bg-green-50 text-green-600 flex items-center justify-center hover:bg-green-100 transition"
                                            title="Enviar WhatsApp"
                                        >
                                            💬
                                        </button>
                                        <span className="text-gray-300">›</span>
                                    </div>
                                </div>
                            );
                        })}
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
