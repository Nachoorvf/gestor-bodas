'use client';
import { useState, useEffect, useRef } from 'react';
import { db } from '../../../firebase/config';
import { doc, collection, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import DashboardSkeleton from '../../../components/loaders/DashboardSkeleton';
import VisualTable from '../../../components/planner/VisualTable';

// TABLE PRESETS
const TABLE_PRESETS = {
    round: { width: 160, height: 160, shape: 'round', seats: 10, label: 'Redonda (10)' },
    rectangular: { width: 240, height: 120, shape: 'rectangular', seats: 8, label: 'Rectangular (8)' },
    presidential: { width: 300, height: 100, shape: 'presidential', seats: 6, label: 'Presidencial (6)' },
    square: { width: 140, height: 140, shape: 'square', seats: 8, label: 'Cuadrada (8)' }
};

export default function MesasPage() {
    const router = useRouter();
    const { user, userData, loading: authLoading } = useAuth();
    const weddingId = userData?.weddingId;

    const [tables, setTables] = useState([]);
    const [guests, setGuests] = useState([]);

    // UI STATES
    const [activeTab, setActiveTab] = useState('map'); // 'guests', 'map', 'inspector'
    const [zoom, setZoom] = useState(0.8);
    const [selectedTableId, setSelectedTableId] = useState(null);
    const [selectedGuestId, setSelectedGuestId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // DRAGGING STATE
    const [draggingTableId, setDraggingTableId] = useState(null);
    const [draggingGuest, setDraggingGuest] = useState(null); // { guest, sourceTableId }
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const canvasRef = useRef(null);

    // 1. Auth Check
    useEffect(() => {
        if (!authLoading && !user) router.push('/login');
    }, [user, authLoading, router]);

    // 2. Data Listeners
    useEffect(() => {
        if (!weddingId) return;

        const unsubTables = onSnapshot(query(collection(db, 'weddings', weddingId, 'tables')),
            (snap) => setTables(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

        const unsubGuests = onSnapshot(query(collection(db, 'weddings', weddingId, 'guests'), orderBy('nombre')),
            (snap) => setGuests(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

        return () => { unsubTables(); unsubGuests(); };
    }, [weddingId]);

    const unassignedGuests = guests.filter(g => !g.tableId && g.confirmado !== false).filter(g => g.nombre.toLowerCase().includes(searchTerm.toLowerCase()));
    const getGuestsForTable = (tableId) => guests.filter(g => g.tableId === tableId);

    // --- ACTIONS ---

    const handleAddTable = async (type) => {
        const preset = TABLE_PRESETS[type];
        // Calculate center of current view approx
        const initialX = 100 + (tables.length * 30) % 800;
        const initialY = 100 + (tables.length * 30) % 500;

        const docRef = await addDoc(collection(db, 'weddings', weddingId, 'tables'), {
            name: `Mesa ${tables.length + 1}`,
            type,
            shape: preset.shape,
            seats: preset.seats,
            width: preset.width,
            height: preset.height,
            position: { x: initialX, y: initialY },
            createdAt: new Date().toISOString()
        });
        setSelectedTableId(docRef.id);
        setActiveTab('inspector');
    };

    const updateTable = async (id, data) => {
        await updateDoc(doc(db, 'weddings', weddingId, 'tables', id), data);
    };

    const handleDeleteTable = async (tableId) => {
        if (!confirm("¿Borrar mesa? Los invitados volverán a la lista.")) return;
        // Batch unassign guests
        const tableGuests = getGuestsForTable(tableId);
        await Promise.all(tableGuests.map(g => updateDoc(doc(db, 'weddings', weddingId, 'guests', g.id), { tableId: null })));
        await deleteDoc(doc(db, 'weddings', weddingId, 'tables', tableId));
        setSelectedTableId(null);
    };

    const assignGuest = async (guestId, tableId) => {
        await updateDoc(doc(db, 'weddings', weddingId, 'guests', guestId), { tableId });
        setDraggingGuest(null);
    };

    const unassignGuest = async (guestId) => {
        await updateDoc(doc(db, 'weddings', weddingId, 'guests', guestId), { tableId: null });
    };

    // --- CANVAS INTERACTION ---

    const handleTableInteraction = (e, type, tableId) => {
        e.stopPropagation();
        if (type === 'mousedown' || type === 'touchstart') {
            if (selectedGuestId) {
                // Assign mode
                assignGuest(selectedGuestId, tableId);
                setSelectedGuestId(null);
                return;
            }

            setSelectedTableId(tableId);
            setDraggingTableId(tableId);
            setActiveTab('inspector'); // Switch to inspector on click

            const clientX = e.clientX || e.touches[0].clientX;
            const clientY = e.clientY || e.touches[0].clientY;
            const rect = e.currentTarget.getBoundingClientRect();

            setDragOffset({
                x: (clientX - rect.left) / zoom,
                y: (clientY - rect.top) / zoom
            });
        }
    };

    const moveTable = (clientX, clientY) => {
        if (!draggingTableId || !canvasRef.current) return;

        const canvasRect = canvasRef.current.getBoundingClientRect();
        const x = (clientX - canvasRect.left) / zoom - dragOffset.x;
        const y = (clientY - canvasRect.top) / zoom - dragOffset.y;

        // Optimistic update
        setTables(prev => prev.map(t => t.id === draggingTableId ? { ...t, position: { x, y } } : t));
    };

    const finishDrag = async () => {
        if (draggingTableId) {
            const t = tables.find(t => t.id === draggingTableId);
            if (t) await updateTable(draggingTableId, { position: t.position });
            setDraggingTableId(null);
        }
    };

    // --- RENDER HELPERS ---

    const selectedTable = tables.find(t => t.id === selectedTableId);

    if (authLoading) return <DashboardSkeleton />;

    return (
        <div
            className="h-[calc(100vh-100px)] flex flex-col md:flex-row gap-6 overflow-hidden animate-fade-in"
            onMouseMove={(e) => moveTable(e.clientX, e.clientY)}
            onTouchMove={(e) => {
                if (draggingTableId) e.preventDefault(); // Prevent scroll
                if (e.touches[0]) moveTable(e.touches[0].clientX, e.touches[0].clientY);
            }}
            onMouseUp={finishDrag}
            onTouchEnd={finishDrag}
            onMouseLeave={finishDrag}
        >

            {/* 1. LEFT SIDEBAR: GUESTS (Desktop always visible, Mobile tab) */}
            <div className={`
                ${activeTab === 'guests' ? 'flex' : 'hidden md:flex'}
                w-full md:w-80 bg-white rounded-3xl shadow-sm border border-gray-100 flex-col overflow-hidden z-20 shrink-0
            `}>
                <div className="p-5 border-b border-gray-100">
                    <h2 className="font-serif text-xl text-boda-text mb-2">Lista de Invitados</h2>
                    <input
                        type="text"
                        placeholder="Buscar invitado..."
                        className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-boda-green rounded-xl px-4 py-2 text-sm outline-none transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div
                    className="flex-1 overflow-y-auto p-3 space-y-2"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={async (e) => {
                        const gId = e.dataTransfer.getData("guestId");
                        if (gId) unassignGuest(gId);
                    }}
                >
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2 mb-2">Sin Asignar ({unassignedGuests.length})</p>
                    {unassignedGuests.map(guest => (
                        <div
                            key={guest.id}
                            draggable
                            onDragStart={(e) => {
                                setDraggingGuest({ guest });
                                e.dataTransfer.setData("guestId", guest.id);
                            }}
                            onClick={() => {
                                setSelectedGuestId(selectedGuestId === guest.id ? null : guest.id);
                                if (window.innerWidth < 768) setActiveTab('map');
                            }}
                            className={`
                                p-3 rounded-xl border cursor-grab active:cursor-grabbing hover:shadow-md transition-all flex items-center justify-between
                                ${selectedGuestId === guest.id ? 'bg-boda-text text-white border-boda-text' : 'bg-white border-gray-100 text-gray-600 hover:border-boda-green'}
                            `}
                        >
                            <span className="font-medium text-sm">{guest.nombre}</span>
                            <span className="text-xs opacity-50">:::</span>
                        </div>
                    ))}
                    {unassignedGuests.length === 0 && (
                        <div className="py-10 text-center text-gray-400 text-sm">
                            Todo el mundo tiene sitio 🎉
                        </div>
                    )}
                </div>
            </div>

            {/* 2. CENTER: CANVAS */}
            <div className={`
                ${activeTab === 'map' ? 'flex' : 'hidden md:flex'}
                flex-1 flex-col bg-gray-100/50 rounded-3xl border border-gray-200 overflow-hidden relative shadow-inner
            `}>
                {/* Visual Toolbar */}
                <div className="absolute top-4 left-4 z-30 flex flex-col gap-2">
                    <div className="bg-white p-2 rounded-2xl shadow-lg border border-gray-100 flex flex-col gap-1">
                        {Object.entries(TABLE_PRESETS).map(([key, preset]) => (
                            <button
                                key={key}
                                onClick={() => handleAddTable(key)}
                                className="w-10 h-10 rounded-xl hover:bg-gray-50 flex items-center justify-center text-gray-600 hover:text-boda-text transition tooltip-trigger group relative"
                                title={preset.label}
                            >
                                {key === 'round' && <div className="w-5 h-5 border-2 border-current rounded-full" />}
                                {key === 'rectangular' && <div className="w-6 h-3 border-2 border-current rounded-sm" />}
                                {key === 'square' && <div className="w-5 h-5 border-2 border-current rounded-md" />}
                                {key === 'presidential' && (
                                    <div className="w-7 h-3 border-2 border-current rounded-md flex items-center justify-center gap-1">
                                        <div className="w-0.5 h-1.5 bg-current rounded-full"></div>
                                        <div className="w-0.5 h-1.5 bg-current rounded-full"></div>
                                    </div>
                                )}

                                <span className="absolute left-full ml-2 bg-boda-text text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50">
                                    {preset.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Zoom Controls */}
                <div className="absolute top-4 right-4 z-30 flex gap-2 bg-white p-1.5 rounded-xl shadow-lg border border-gray-100">
                    <button onClick={() => setZoom(z => Math.max(0.4, z - 0.1))} className="w-8 h-8 rounded-lg hover:bg-gray-50 font-bold text-gray-500">-</button>
                    <span className="flex items-center text-xs font-bold text-gray-400 w-8 justify-center">{Math.round(zoom * 100)}%</span>
                    <button onClick={() => setZoom(z => Math.min(1.5, z + 0.1))} className="w-8 h-8 rounded-lg hover:bg-gray-50 font-bold text-gray-500">+</button>
                </div>

                {/* Canvas Area */}
                <div
                    ref={canvasRef}
                    className="flex-1 w-full relative overflow-hidden touch-none"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                        e.preventDefault();
                        // Dropping on canvas (not on table) doesn't assign, effectively unassigns if coming from table?? 
                        // For now, let's keep unassign logic to the sidebar drop zone to avoid accidents.
                    }}
                    onClick={() => {
                        setSelectedTableId(null);
                        // if searching on mobile, maybe auto-hide inspector?
                        if (window.innerWidth < 768) setActiveTab('map');
                    }}
                >
                    <div
                        className="absolute origin-top-left transition-transform duration-75 ease-out"
                        style={{ transform: `scale(${zoom})`, width: `${100 / zoom}%`, height: `${100 / zoom}%` }}
                    >
                        {/* Grid Pattern */}
                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                            style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

                        {tables.map(table => (
                            <VisualTable
                                key={table.id}
                                table={table}
                                guests={getGuestsForTable(table.id)}
                                isDragging={draggingTableId === table.id}
                                isSelected={selectedTableId === table.id}
                                scale={zoom}
                                onInteraction={(e, type) => handleTableInteraction(e, type, table.id)}
                            />
                        ))}
                    </div>
                </div>

                {/* Mobile Tabs */}
                <div className="md:hidden absolute bottom-4 left-1/2 -translate-x-1/2 bg-white rounded-full shadow-xl border border-gray-100 p-1 flex gap-1 z-40">
                    <button onClick={() => setActiveTab('guests')} className={`px-4 py-2 rounded-full text-xs font-bold transition ${activeTab === 'guests' ? 'bg-boda-text text-white' : 'text-gray-500 hover:bg-gray-50'}`}>Invitados</button>
                    <button onClick={() => setActiveTab('map')} className={`px-4 py-2 rounded-full text-xs font-bold transition ${activeTab === 'map' ? 'bg-boda-text text-white' : 'text-gray-500 hover:bg-gray-50'}`}>Mapa</button>
                    <button onClick={() => setActiveTab('inspector')} className={`px-4 py-2 rounded-full text-xs font-bold transition ${activeTab === 'inspector' ? 'bg-boda-text text-white' : 'text-gray-500 hover:bg-gray-50'}`}>Editor</button>
                </div>
            </div>

            {/* 3. RIGHT SIDEBAR: INSPECTOR (Contextual) */}
            <div className={`
                ${activeTab === 'inspector' ? 'flex' : 'hidden md:flex'}
                w-full md:w-80 bg-white rounded-3xl shadow-sm border border-gray-100 flex-col overflow-hidden z-20 shrink-0 animate-slide-in-right
            `}>
                {selectedTable ? (
                    <div className="flex flex-col h-full">
                        <div className="p-5 border-b border-gray-100 bg-gray-50">
                            <h2 className="font-serif text-xl text-boda-text mb-1">Editar Mesa</h2>
                            <p className="text-xs text-gray-400">Personaliza nombre y capacidad</p>
                        </div>
                        <div className="p-5 space-y-6 flex-1 overflow-y-auto">

                            {/* Name Input */}
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Nombre</label>
                                <input
                                    type="text"
                                    className="w-full text-lg font-bold text-boda-text border-b-2 border-gray-100 focus:border-boda-green outline-none py-1 bg-transparent transition"
                                    value={selectedTable.name}
                                    onChange={(e) => updateTable(selectedTable.id, { name: e.target.value })}
                                />
                            </div>

                            {/* Shape & Seats Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Forma</label>
                                    <select
                                        className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm font-medium outline-none border border-gray-100"
                                        value={selectedTable.shape}
                                        onChange={(e) => {
                                            const newShape = e.target.value;
                                            // Reset dimensions based on shape preset defaults for simplicity
                                            const preset = Object.values(TABLE_PRESETS).find(p => p.shape === newShape) || TABLE_PRESETS.round;
                                            updateTable(selectedTable.id, { shape: newShape, width: preset.width, height: preset.height });
                                        }}
                                    >
                                        <option value="round">Redonda</option>
                                        <option value="rectangular">Rectangular</option>
                                        <option value="square">Cuadrada</option>
                                        <option value="presidential">Presidencial</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Sillas</label>
                                    <input
                                        type="number"
                                        className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm font-medium outline-none border border-gray-100"
                                        value={selectedTable.seats}
                                        min="1" max="24"
                                        onChange={(e) => updateTable(selectedTable.id, { seats: parseInt(e.target.value) || 1 })}
                                    />
                                </div>
                            </div>

                            {/* Guest List in Inspector */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Invitados en mesa</label>
                                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full font-bold">{getGuestsForTable(selectedTable.id).length} / {selectedTable.seats}</span>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-2 space-y-1 min-h-[100px]">
                                    {getGuestsForTable(selectedTable.id).map(g => (
                                        <div key={g.id} className="flex justify-between items-center p-2 bg-white rounded-lg shadow-sm border border-gray-100 group">
                                            <span className="text-sm text-gray-600">{g.nombre}</span>
                                            <button onClick={() => unassignGuest(g.id)} className="text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition">✕</button>
                                        </div>
                                    ))}
                                    {getGuestsForTable(selectedTable.id).length === 0 && (
                                        <p className="text-xs text-center text-gray-400 py-4 italic">Arrastra invitados aquí</p>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={() => handleDeleteTable(selectedTable.id)}
                                className="w-full py-3 text-red-500 font-bold text-sm bg-red-50 rounded-xl hover:bg-red-100 transition mt-auto"
                            >
                                Eliminar Mesa
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full p-8 text-center text-gray-400">
                        <span className="text-4xl mb-4">👆</span>
                        <p className="font-medium">Selecciona una mesa para editar sus detalles</p>
                        <p className="text-xs mt-2 opacity-70">O haz clic en la barra de herramientas para crear una nueva</p>
                    </div>
                )}
            </div>
        </div>
    );
}
