'use client';
import { useState, useEffect } from 'react';
import { db } from '../../../firebase/config';
import { doc, getDoc, collection, query, getDocs, updateDoc } from 'firebase/firestore';
import { useAuth } from '../../../context/AuthContext';
import { Music, MessageSquare, AlertCircle, Coffee, Check, X, Download, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { generateCateringPdf } from '../../../utils/cateringPdf';
import { generateSongsPdf } from '../../../utils/songsPdf';

export default function RespuestasPage() {
    const { userData, loading: authLoading } = useAuth();

    const [weddingData, setWeddingData] = useState(null);
    const [guests, setGuests] = useState([]);
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [activeTab, setActiveTab] = useState('alergias'); // 'alergias', 'mensajes', 'canciones'
    const [filterView, setFilterView] = useState('pending'); // 'pending', 'history'
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [isGeneratingSongsPdf, setIsGeneratingSongsPdf] = useState(false);

    useEffect(() => {
        if (!userData?.weddingId) {
            if (!authLoading) setLoading(false);
            return;
        }

        const loadData = async () => {
            try {
                const weddingId = userData.weddingId;
                // Fetch Wedding Config
                const weddingDoc = await getDoc(doc(db, 'weddings', weddingId));
                if (weddingDoc.exists()) {
                    setWeddingData(weddingDoc.data());
                }

                // Fetch Guests
                const qGuests = query(collection(db, 'weddings', weddingId, 'guests'));
                const querySnapshot = await getDocs(qGuests);
                setGuests(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

                // Fetch Tables
                const qTables = query(collection(db, 'weddings', weddingId, 'tables'));
                const tablesSnapshot = await getDocs(qTables);
                setTables(tablesSnapshot.docs.map(d => ({ id: d.id, ...d.data() })));

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

    const handleUpdateStatus = async (guestId, field, newStatus) => {
        try {
            await updateDoc(doc(db, 'weddings', userData.weddingId, 'guests', guestId), {
                [field]: newStatus
            });
            setGuests(prev => prev.map(g => g.id === guestId ? { ...g, [field]: newStatus } : g));
        } catch (error) {
            console.error("Error updating status:", error);
        }
    };

    const getTableName = (tableId) => {
        if (!tableId) return 'Sin asignar';
        const table = tables.find(t => t.id === tableId);
        return table ? table.name : 'Sin asignar';
    };

    const handleExportPdf = async (filterType = 'all') => {
        setIsGeneratingPdf(true);
        try {
            // Breve espera para que React renderice el spinner antes de procesar el PDF
            await new Promise(resolve => setTimeout(resolve, 80));
            await generateCateringPdf({
                weddingData,
                guests: guestsWithAllergies,
                tables,
                filterType
            });
        } catch (err) {
            console.error("Error al generar el PDF de catering:", err);
            alert("Ocurrió un error al generar el PDF. Por favor, inténtalo de nuevo.");
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const handleExportSongsPdf = async (filterType = 'all') => {
        setIsGeneratingSongsPdf(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 80));
            await generateSongsPdf({
                weddingData,
                guests: guestsWithSongs,
                filterType
            });
        } catch (err) {
            console.error("Error al generar el PDF de canciones:", err);
            alert("Ocurrió un error al generar el PDF de canciones.");
        } finally {
            setIsGeneratingSongsPdf(false);
        }
    };

    // Filters
    const isPending = (status) => !status || status === 'pending';
    const isProcessed = (status) => status === 'approved' || status === 'rejected';

    const guestsWithAllergies = guests.filter(g => g.alergias && g.alergias.trim() !== '');
    const guestsWithMessages = guests.filter(g => g.mensaje && g.mensaje.trim() !== '');
    const guestsWithSongs = guests.filter(g => g.cancion && g.cancion.trim() !== '');

    const filteredAllergies = guestsWithAllergies.filter(g => filterView === 'pending' ? isPending(g.alergiasStatus) : isProcessed(g.alergiasStatus));
    const filteredMessages = guestsWithMessages.filter(g => filterView === 'pending' ? isPending(g.mensajeStatus) : isProcessed(g.mensajeStatus));
    const filteredSongs = guestsWithSongs.filter(g => filterView === 'pending' ? isPending(g.cancionStatus) : isProcessed(g.cancionStatus));

    // Print Data (Only Approved Allergies)
    const approvedAllergiesForCatering = guestsWithAllergies.filter(g => g.alergiasStatus === 'approved');

    // EMPTY STATE if neither block is enabled and no allergies
    if (!isSongBlockEnabled && !isMessageBlockEnabled && guestsWithAllergies.length === 0) {
        return (
            <div className="max-w-4xl mx-auto space-y-8 pb-20 pt-10 px-4 flex flex-col items-center justify-center min-h-[50vh]">
                <div className="bg-amber-50 rounded-[2rem] p-10 text-center max-w-lg border border-amber-100 shadow-sm animate-fade-in-up">
                    <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle className="text-amber-500 w-10 h-10" />
                    </div>
                    <h2 className="font-display text-3xl text-[#333] mb-4">Aún no hay respuestas</h2>
                    <p className="text-gray-600 mb-8 font-serif leading-relaxed">
                        Para poder ver las respuestas de tus invitados aquí, asegúrate de añadir los bloques en tu invitación o de que los invitados confirmen asistencia.
                    </p>
                    <Link href="/dashboard/configuracion-invitacion" className="inline-block bg-[#333] text-white px-8 py-4 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-black transition shadow-xl hover:shadow-2xl">
                        Configurar Invitación
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-20 px-4 md:px-0">
            <header className="border-b border-gray-100 pb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 md:bg-white md:p-8 md:rounded-[2rem] md:shadow-sm md:border-gray-100">
                    <div>
                        <h1 className="text-4xl font-display text-[#333] mb-2">Bandeja de Respuestas</h1>
                        <p className="text-gray-500 font-serif">Gestiona las sugerencias y alergias de tus invitados.</p>
                    </div>
                    {/* FILTERS */}
                    <div className="flex bg-gray-100 p-1.5 rounded-full w-full md:w-auto self-stretch md:self-auto">
                        <button onClick={() => setFilterView('pending')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition ${filterView === 'pending' ? 'bg-white shadow text-[#333]' : 'text-gray-500 hover:text-[#333]'}`}>
                            Nuevas
                        </button>
                        <button onClick={() => setFilterView('history')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition ${filterView === 'history' ? 'bg-white shadow text-[#333]' : 'text-gray-500 hover:text-[#333]'}`}>
                            Historial
                        </button>
                    </div>
                </header>

                {/* TABS */}
                <div className="flex overflow-x-auto gap-4 pb-4 mt-8 snap-x [&::-webkit-scrollbar]:hidden">
                    <button onClick={() => setActiveTab('alergias')} className={`snap-start shrink-0 flex items-center gap-2 px-6 py-4 rounded-2xl transition border ${activeTab === 'alergias' ? 'bg-[#333] text-white border-[#333]' : 'bg-white text-gray-500 border-gray-100 hover:border-gray-300'}`}>
                        <Coffee size={20} className={activeTab === 'alergias' ? 'text-red-400' : 'text-gray-400'} />
                        <span className="font-bold">Alergias</span>
                        <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs">{guestsWithAllergies.length}</span>
                    </button>

                    {isMessageBlockEnabled && (
                        <button onClick={() => setActiveTab('mensajes')} className={`snap-start shrink-0 flex items-center gap-2 px-6 py-4 rounded-2xl transition border ${activeTab === 'mensajes' ? 'bg-[#333] text-white border-[#333]' : 'bg-white text-gray-500 border-gray-100 hover:border-gray-300'}`}>
                            <MessageSquare size={20} className={activeTab === 'mensajes' ? 'text-teal-400' : 'text-gray-400'} />
                            <span className="font-bold">Firmas</span>
                            <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs">{guestsWithMessages.length}</span>
                        </button>
                    )}

                    {isSongBlockEnabled && (
                        <button onClick={() => setActiveTab('canciones')} className={`snap-start shrink-0 flex items-center gap-2 px-6 py-4 rounded-2xl transition border ${activeTab === 'canciones' ? 'bg-[#333] text-white border-[#333]' : 'bg-white text-gray-500 border-gray-100 hover:border-gray-300'}`}>
                            <Music size={20} className={activeTab === 'canciones' ? 'text-amber-400' : 'text-gray-400'} />
                            <span className="font-bold">Música</span>
                            <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs">{guestsWithSongs.length}</span>
                        </button>
                    )}
                </div>

                {/* CONTENT AREA */}
                <div className="mt-6">
                    {/* ALLERGIES */}
                    {activeTab === 'alergias' && (
                        <div className="space-y-4 animate-fade-in-up">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-6">
                                <div>
                                    <h3 className="font-serif italic text-gray-500 text-lg">
                                        {filterView === 'pending' ? 'Revisa los nuevos menús especiales:' : 'Alergias ya procesadas:'}
                                    </h3>
                                    <p className="text-xs text-gray-400 mt-1">
                                        {guestsWithAllergies.length} {guestsWithAllergies.length === 1 ? 'comensal registrado' : 'comensales registrados'} con menú especial
                                    </p>
                                </div>
                                {guestsWithAllergies.length > 0 && (
                                    <button
                                        onClick={() => handleExportPdf('all')}
                                        disabled={isGeneratingPdf}
                                        className="flex items-center gap-2 bg-[#333] text-white px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-black transition shadow-sm disabled:opacity-60 disabled:cursor-not-allowed justify-center"
                                        title="Descargar PDF para catering con todos los menús especiales"
                                    >
                                        {isGeneratingPdf ? (
                                            <>
                                                <Loader2 size={15} className="animate-spin text-amber-400" />
                                                <span>Generando PDF...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Download size={15} />
                                                <span>PDF Catering ({guestsWithAllergies.length})</span>
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>

                            {filteredAllergies.length === 0 ? (
                                <div className="bg-gray-50 rounded-3xl p-10 text-center border border-dashed border-gray-200">
                                    <p className="text-gray-400 font-serif italic text-lg">No hay alergias {filterView === 'pending' ? 'pendientes' : 'en el historial'}.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {filteredAllergies.map(g => (
                                        <div key={g.id} className={`bg-white rounded-2xl p-5 shadow-sm border transition relative ${g.alergiasStatus === 'rejected' ? 'opacity-50 grayscale border-gray-200' : g.alergiasStatus === 'approved' ? 'border-green-200 bg-green-50/30' : 'border-gray-100'}`}>
                                            <p className={`font-serif text-[#333] text-lg leading-relaxed mb-3 ${g.alergiasStatus === 'rejected' ? 'line-through text-gray-400' : ''}`}>{g.alergias}</p>
                                            <div className="flex items-center justify-between border-t border-gray-50 pt-3">
                                                <div>
                                                    <span className="font-bold text-[#333] text-sm uppercase tracking-wider block">{g.nombre}</span>
                                                    {g.group && <span className="text-[10px] text-gray-500">{g.group}</span>}
                                                </div>
                                                <div className="flex gap-1 shrink-0">
                                                    <button onClick={() => handleUpdateStatus(g.id, 'alergiasStatus', 'approved')} className={`p-2 rounded-xl hover:bg-green-100 transition ${g.alergiasStatus === 'approved' ? 'text-green-600 bg-green-100' : 'text-gray-300 hover:text-green-600'}`} title="Aprobar"><Check size={18} /></button>
                                                    <button onClick={() => handleUpdateStatus(g.id, 'alergiasStatus', 'rejected')} className={`p-2 rounded-xl hover:bg-red-100 transition ${g.alergiasStatus === 'rejected' ? 'text-red-600 bg-red-100' : 'text-gray-300 hover:text-red-600'}`} title="Rechazar"><X size={18} /></button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* MESSAGES */}
                    {activeTab === 'mensajes' && (
                        <div className="space-y-4 animate-fade-in-up">
                            <h3 className="font-serif italic text-gray-500 mb-6 text-lg">
                                {filterView === 'pending' ? 'Nuevas firmas en el libro:' : 'Firmas ya procesadas:'}
                            </h3>
                            {filteredMessages.length === 0 ? (
                                <div className="bg-gray-50 rounded-3xl p-10 text-center border border-dashed border-gray-200">
                                    <p className="text-gray-400 font-serif italic text-lg">No hay firmas {filterView === 'pending' ? 'pendientes' : 'en el historial'}.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {filteredMessages.map(g => (
                                        <div key={g.id} className={`bg-yellow-100/50 rounded-br-3xl rounded-tl-3xl p-6 shadow-sm border transition relative ${g.mensajeStatus === 'rejected' ? 'opacity-50 grayscale border-gray-200 bg-gray-50' : 'border-yellow-200/50 hover:shadow-md'}`}>
                                            <p className={`font-serif italic text-lg leading-relaxed mb-4 ${g.mensajeStatus === 'rejected' ? 'line-through text-gray-400' : 'text-gray-700'}`}>"{g.mensaje}"</p>
                                            <div className="flex items-center justify-between border-t border-yellow-200/50 pt-4">
                                                <div>
                                                    <span className="font-bold text-[#333] text-sm uppercase tracking-wider block">{g.nombre}</span>
                                                    {g.group && <span className="text-[10px] text-gray-500">{g.group}</span>}
                                                </div>
                                                <div className="flex gap-1 shrink-0">
                                                    <button onClick={() => handleUpdateStatus(g.id, 'mensajeStatus', 'approved')} className={`p-2 rounded-xl hover:bg-green-100 transition ${g.mensajeStatus === 'approved' ? 'text-green-600 bg-green-100' : 'text-gray-400 hover:text-green-600'}`} title="Aprobar"><Check size={18} /></button>
                                                    <button onClick={() => handleUpdateStatus(g.id, 'mensajeStatus', 'rejected')} className={`p-2 rounded-xl hover:bg-red-100 transition ${g.mensajeStatus === 'rejected' ? 'text-red-600 bg-red-100' : 'text-gray-400 hover:text-red-600'}`} title="Rechazar"><X size={18} /></button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* SONGS */}
                    {activeTab === 'canciones' && (
                        <div className="space-y-4 animate-fade-in-up">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-6">
                                <div>
                                    <h3 className="font-serif italic text-gray-500 text-lg">
                                        {filterView === 'pending' ? 'Nuevas canciones sugeridas:' : 'Sugerencias ya procesadas:'}
                                    </h3>
                                    <p className="text-xs text-gray-400 mt-1">
                                        {guestsWithSongs.length} {guestsWithSongs.length === 1 ? 'canción sugerida' : 'canciones sugeridas'}
                                    </p>
                                </div>
                                {guestsWithSongs.length > 0 && (
                                    <button
                                        onClick={() => handleExportSongsPdf('all')}
                                        disabled={isGeneratingSongsPdf}
                                        className="flex items-center gap-2 bg-[#333] text-white px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-black transition shadow-sm disabled:opacity-60 disabled:cursor-not-allowed justify-center"
                                        title="Descargar PDF con la lista de canciones para el DJ"
                                    >
                                        {isGeneratingSongsPdf ? (
                                            <>
                                                <Loader2 size={15} className="animate-spin text-amber-400" />
                                                <span>Generando PDF...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Download size={15} />
                                                <span>PDF Lista DJ ({guestsWithSongs.length})</span>
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                            {filteredSongs.length === 0 ? (
                                <div className="bg-gray-50 rounded-3xl p-10 text-center border border-dashed border-gray-200">
                                    <p className="text-gray-400 font-serif italic text-lg">No hay canciones {filterView === 'pending' ? 'pendientes' : 'en el historial'}.</p>
                                </div>
                            ) : (
                                <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                                    {filteredSongs.map((g, index) => (
                                        <div key={g.id} className={`flex items-center gap-4 p-4 hover:bg-gray-50 transition cursor-default ${index !== filteredSongs.length - 1 ? 'border-b border-gray-50' : ''} ${g.cancionStatus === 'rejected' ? 'opacity-50 grayscale' : ''}`}>
                                            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-xs shrink-0">
                                                {index + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`font-bold text-sm md:text-base truncate ${g.cancionStatus === 'rejected' ? 'line-through text-gray-400' : 'text-[#333]'}`}>{g.cancion}</p>
                                                <p className="text-xs text-gray-400 mt-0.5 truncate flex items-center gap-1.5"><span className="text-gray-300">Pedida por</span> {g.nombre}</p>
                                            </div>
                                            <div className="flex gap-1 shrink-0">
                                                <button onClick={() => handleUpdateStatus(g.id, 'cancionStatus', 'approved')} className={`p-2 rounded-xl hover:bg-green-100 transition ${g.cancionStatus === 'approved' ? 'text-green-600 bg-green-100' : 'text-gray-300 hover:text-green-600'}`} title="Aprobar"><Check size={18} /></button>
                                                <button onClick={() => handleUpdateStatus(g.id, 'cancionStatus', 'rejected')} className={`p-2 rounded-xl hover:bg-red-100 transition ${g.cancionStatus === 'rejected' ? 'text-red-600 bg-red-100' : 'text-gray-300 hover:text-red-600'}`} title="Rechazar"><X size={18} /></button>
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
