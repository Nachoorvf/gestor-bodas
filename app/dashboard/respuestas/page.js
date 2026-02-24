'use client';
import { useState, useEffect } from 'react';
import { db } from '../../../firebase/config';
import { doc, getDoc, collection, query, getDocs } from 'firebase/firestore';
import { useAuth } from '../../../context/AuthContext';
import { Music, MessageSquare, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function RespuestasPage() {
    const { userData, loading: authLoading } = useAuth();

    const [weddingData, setWeddingData] = useState(null);
    const [guests, setGuests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!userData?.weddingId) {
            if (!authLoading) setLoading(false);
            return;
        }

        const loadData = async () => {
            try {
                // Fetch Wedding Config
                const weddingDoc = await getDoc(doc(db, 'weddings', userData.weddingId));
                if (weddingDoc.exists()) {
                    setWeddingData(weddingDoc.data());
                }

                // Fetch Guests
                const qGuests = query(collection(db, 'weddings', userData.weddingId, 'guests'));
                const querySnapshot = await getDocs(qGuests);
                const fetchedGuests = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setGuests(fetchedGuests);

            } catch (err) {
                console.error("Error loading responses:", err);
                setError("Error al cargar las respuestas");
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [userData, authLoading]);

    if (authLoading || loading) return <div className="p-8 text-center text-[#333]">Cargando respuestas...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

    // Determine if the blocks are enabled in the visual builder
    const customBlocks = weddingData?.invitationConfig?.customBlocks || [];
    const isSongBlockEnabled = customBlocks.some(block => block.type === 'song');
    const isMessageBlockEnabled = customBlocks.some(block => block.type === 'message');

    // Filter guests with actual responses
    const guestsWithSongs = guests.filter(g => g.cancion && g.cancion.trim() !== '');
    const guestsWithMessages = guests.filter(g => g.mensaje && g.mensaje.trim() !== '');

    // EMPTY STATE if neither block is enabled
    if (!isSongBlockEnabled && !isMessageBlockEnabled) {
        return (
            <div className="max-w-4xl mx-auto space-y-8 pb-20 pt-10 px-4 flex flex-col items-center justify-center min-h-[50vh]">
                <div className="bg-amber-50 rounded-[2rem] p-10 text-center max-w-lg border border-amber-100 shadow-sm animate-fade-in-up">
                    <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle className="text-amber-500 w-10 h-10" />
                    </div>
                    <h2 className="font-display text-3xl text-[#333] mb-4">Aún no hay preguntas activas</h2>
                    <p className="text-gray-600 mb-8 font-serif leading-relaxed">
                        Para poder ver las respuestas de tus invitados aquí, primero debes añadir los bloques especiales al diseño de tu invitación.
                    </p>
                    <Link href="/dashboard/configuracion-invitacion" className="inline-block bg-[#333] text-white px-8 py-4 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-black transition shadow-xl hover:shadow-2xl">
                        Añadir Contenido a la Invitación
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-12 pb-20 px-4 md:px-0">

            <header className="border-b border-gray-100 pb-8 flex flex-col md:flex-row justify-between items-end gap-4 md:bg-white md:p-8 md:rounded-[2rem] md:shadow-sm md:border-gray-100">
                <div>
                    <h1 className="text-4xl font-display text-[#333] mb-2">Recuerdos y Música</h1>
                    <p className="text-gray-500 font-serif">Todo lo que tus invitados han querido compartir con vosotros.</p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

                {/* MESSAGES SECTION */}
                {isMessageBlockEnabled && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                            <div className="w-10 h-10 bg-teal-50 rounded-full flex items-center justify-center">
                                <MessageSquare className="text-teal-500" size={20} />
                            </div>
                            <h2 className="text-2xl font-display text-[#333]">Libro de Firmas</h2>
                            <span className="ml-auto bg-gray-100 text-[#333] px-3 py-1 rounded-full text-xs font-bold">{guestsWithMessages.length}</span>
                        </div>

                        {guestsWithMessages.length === 0 ? (
                            <div className="bg-gray-50 rounded-3xl p-10 text-center border border-gray-100/50 border-dashed">
                                <p className="text-gray-400 font-serif italic text-lg">Todavía no hay mensajes nuevos...</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {guestsWithMessages.map(g => (
                                    <div key={g.id} className="bg-yellow-100/50 rounded-br-3xl rounded-tl-3xl p-6 shadow-sm border border-yellow-200/50 hover:shadow-md transition relative">
                                        <p className="font-serif italic text-gray-700 text-lg leading-relaxed mb-4">"{g.mensaje}"</p>
                                        <div className="flex items-center justify-between border-t border-yellow-200/50 pt-4">
                                            <span className="font-bold text-[#333] text-sm uppercase tracking-wider">{g.nombre}</span>
                                            {g.group && <span className="text-[10px] text-gray-500">{g.group}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* SONGS SECTION */}
                {isSongBlockEnabled && (
                    <div className="space-y-6 lg:border-l lg:border-gray-100 lg:pl-10">
                        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                            <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center">
                                <Music className="text-amber-500" size={20} />
                            </div>
                            <h2 className="text-2xl font-display text-[#333]">Playlist Sugerida</h2>
                            <span className="ml-auto bg-gray-100 text-[#333] px-3 py-1 rounded-full text-xs font-bold">{guestsWithSongs.length}</span>
                        </div>

                        {guestsWithSongs.length === 0 ? (
                            <div className="bg-gray-50 rounded-3xl p-10 text-center border border-gray-100/50 border-dashed">
                                <p className="text-gray-400 font-serif italic text-lg">Nadie ha pedido una canción todavía...</p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                                {guestsWithSongs.map((g, index) => (
                                    <div key={g.id} className={`flex items-center gap-4 p-4 hover:bg-gray-50 transition cursor-default ${index !== guestsWithSongs.length - 1 ? 'border-b border-gray-50' : ''}`}>
                                        <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-xs shrink-0">
                                            {index + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-[#333] truncate text-sm md:text-base">{g.cancion}</p>
                                            <p className="text-xs text-gray-400 mt-0.5 truncate flex items-center gap-1.5"><span className="text-gray-300">Pedida por</span> {g.nombre}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
