'use client';
import { useState, useEffect } from 'react';
import { auth, db } from '../../../firebase/config';
import { doc, getDoc, collection, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Card from '../../../components/ui/Card';

export default function InvitadosPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [weddingId, setWeddingId] = useState(null);
    const [guests, setGuests] = useState([]);
    const [nuevoInvitado, setNuevoInvitado] = useState('');
    const [nuevoTelefono, setNuevoTelefono] = useState('');
    const [isContactSupported, setIsContactSupported] = useState(false);

    // MODAL STATE
    const [editingGuest, setEditingGuest] = useState(null);
    const [tempData, setTempData] = useState({});

    useEffect(() => {
        // Check if Contact Picker API is supported
        setIsContactSupported('contacts' in navigator && 'ContactsManager' in window);

        const fetchUserData = async () => {
            auth.onAuthStateChanged(async (user) => {
                if (!user) { router.push('/login'); return; }
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    setWeddingId(userDoc.data().weddingId);
                }
                setLoading(false);
            });
        };
        fetchUserData();
    }, [router]);

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

    if (loading) return <div className="p-8 text-center text-boda-text-light">Cargando...</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-serif text-boda-text">Tus Invitados</h1>
                <span className="bg-boda-pink text-white px-4 py-1 rounded-full text-xs font-bold">{guests.length} Total</span>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                {/* ADD GUEST CARD */}
                <div className="md:col-span-1">
                    <Card className="sticky top-8">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="font-bold text-lg text-boda-text">Añadir Nuevo</h2>
                            {isContactSupported && (
                                <button type="button" onClick={handleImportContact} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-lg font-bold hover:bg-blue-100">
                                    📒 Agenda
                                </button>
                            )}
                        </div>
                        <form onSubmit={handleAddGuest} className="flex flex-col gap-3">
                            <input
                                type="text" placeholder="Nombre"
                                className="border border-gray-200 p-3 rounded-xl w-full text-boda-text focus:outline-none focus:border-boda-green bg-gray-50"
                                value={nuevoInvitado} onChange={(e) => setNuevoInvitado(e.target.value)}
                            />
                            <input
                                type="tel" placeholder="Teléfono (Opcional)"
                                className="border border-gray-200 p-3 rounded-xl w-full text-boda-text focus:outline-none focus:border-boda-green bg-gray-50"
                                value={nuevoTelefono} onChange={(e) => setNuevoTelefono(e.target.value)}
                            />
                            <button type="submit" className="bg-boda-green text-white p-3 rounded-xl font-bold hover:bg-boda-green-dark transition-all">
                                + Añadir
                            </button>
                        </form>
                    </Card>
                </div>

                {/* GUEST LIST */}
                <div className="md:col-span-2">
                    <div className="space-y-3">
                        {guests.map(guest => (
                            <div
                                key={guest.id}
                                onClick={() => openEditModal(guest)}
                                className="bg-white border border-gray-100 p-4 rounded-xl flex justify-between items-center hover:border-boda-green hover:shadow-md cursor-pointer transition-all"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-3 h-3 rounded-full ${guest.confirmado === true ? 'bg-green-500' :
                                        guest.confirmado === false ? 'bg-red-400' : 'bg-gray-300'
                                        }`}></div>
                                    <div>
                                        <p className="font-bold text-boda-text">{guest.nombre}</p>
                                        <div className="flex gap-2 text-[10px] uppercase font-bold text-gray-400">
                                            {guest.confirmado === true ? 'Confirmado' : guest.confirmado === false ? 'No Asiste' : 'Pendiente'}
                                            {guest.bus && <span className="text-purple-500">• Bus</span>}
                                            {guest.telefono && <span className="text-blue-400">• 📱</span>}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={(e) => sendWhatsApp(e, guest.id, guest.nombre, guest.telefono)}
                                    className="bg-green-100 text-green-700 hover:bg-green-200 px-3 py-1 rounded-full text-xs font-bold transition-colors flex items-center gap-1"
                                >
                                    <span>WhatsApp</span>
                                </button>
                            </div>
                        ))}
                        {guests.length === 0 && (
                            <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-200">
                                <p className="text-gray-400">Aún no tienes invitados.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* MODAL (Reused logic) */}
            {editingGuest && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 animate-fade-in-up">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <p className="text-xs uppercase text-boda-text-light font-bold">Editando a</p>
                                <h2 className="text-3xl font-script text-boda-green">{editingGuest.nombre}</h2>
                            </div>
                            <button onClick={() => setEditingGuest(null)} className="bg-gray-100 hover:bg-gray-200 w-8 h-8 rounded-full flex items-center justify-center text-gray-500">✕</button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <p className="text-sm font-bold text-boda-text mb-3">¿Asistirá?</p>
                                <div className="grid grid-cols-3 gap-2">
                                    <button onClick={() => setTempData({ ...tempData, confirmado: true })} className={`py-2 rounded-xl text-xs font-bold ${tempData.confirmado === true ? 'bg-green-500 text-white' : 'bg-gray-50 text-gray-500'}`}>SÍ</button>
                                    <button onClick={() => setTempData({ ...tempData, confirmado: false, bus: false })} className={`py-2 rounded-xl text-xs font-bold ${tempData.confirmado === false ? 'bg-red-400 text-white' : 'bg-gray-50 text-gray-500'}`}>NO</button>
                                    <button onClick={() => setTempData({ ...tempData, confirmado: null, bus: false })} className={`py-2 rounded-xl text-xs font-bold ${tempData.confirmado === null ? 'bg-gray-400 text-white' : 'bg-gray-50 text-gray-500'}`}>?</button>
                                </div>
                            </div>

                            <div className={tempData.confirmado ? 'opacity-100' : 'opacity-30 pointer-events-none'}>
                                <label className="flex items-center gap-3 p-4 border rounded-xl cursor-pointer hover:bg-purple-50">
                                    <input type="checkbox" className="accent-purple-500 w-5 h-5" checked={tempData.bus || false} onChange={(e) => setTempData({ ...tempData, bus: e.target.checked })} />
                                    <span className="text-sm font-bold text-gray-600">Necesita Autobús</span>
                                </label>
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                                <button onClick={handleDeleteGuest} className="text-red-400 text-xs font-bold hover:text-red-600">Eliminar</button>
                                <button onClick={saveChanges} className="bg-boda-green text-white px-6 py-2 rounded-xl font-bold hover:bg-boda-green-dark">Guardar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
