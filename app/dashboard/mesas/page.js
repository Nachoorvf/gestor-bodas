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

const GuestCard = ({ guest, selectedGuestId, setSelectedGuestId, setActiveTab, setDraggingGuest }) => (
    <div
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
);

export default function MesasPage() {
    const router = useRouter();
    const { user, userData, loading: authLoading } = useAuth();
    const weddingId = userData?.weddingId;

    const [tables, setTables] = useState([]);
    const [guests, setGuests] = useState([]);

    // UI STATES
    const [activeTab, setActiveTab] = useState('map'); // 'guests', 'map', 'inspector'
    const [zoom, setZoom] = useState(0.8);
    const [pan, setPan] = useState({ x: 0, y: 0 }); // NEW: Canvas Panning
    const [isLayoutMode, setIsLayoutMode] = useState(false); // NEW: Controls drag vs view state
    const [selectedTableId, setSelectedTableId] = useState(null);
    const [selectedGuestId, setSelectedGuestId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // NEW: GROUPING MODE
    const [groupingMode, setGroupingMode] = useState('group'); // 'all', 'group' (envelopes), 'role' (tags)

    // DRAGGING STATE
    const [draggingGuest, setDraggingGuest] = useState(null); // { guest, sourceTableId }

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

    // HELPER: Group Guests
    const getGroupedGuests = () => {
        if (groupingMode === 'all') return {};

        return unassignedGuests.reduce((groups, guest) => {
            let key = '';
            if (groupingMode === 'group') key = guest.group || 'Sin Sobre';
            if (groupingMode === 'role') key = guest.role || 'Sin Etiqueta';
            if (!groups[key]) groups[key] = [];
            groups[key].push(guest);
            return groups;
        }, {});
    };

    const getGuestsForTable = (tableId) => guests.filter(g => g.tableId === tableId);

    // --- ACTIONS ---

    const handleAddTable = async (type) => {
        const preset = TABLE_PRESETS[type];

        // Smart Center: Place in center of visible canvas
        const canvasRect = canvasRef.current?.getBoundingClientRect();
        const centerX = canvasRect ? (canvasRect.width / 2 - pan.x) / zoom : 400;
        const centerY = canvasRect ? (canvasRect.height / 2 - pan.y) / zoom : 300;

        const docRef = await addDoc(collection(db, 'weddings', weddingId, 'tables'), {
            name: `Mesa ${tables.length + 1}`,
            type,
            shape: preset.shape,
            seats: preset.seats,
            width: preset.width,
            height: preset.height,
            position: { x: centerX - preset.width / 2, y: centerY - preset.height / 2 },
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

    // --- CANVAS INTERACTION ---

    const handleTableInteraction = (e, type, tableId) => {
        if (type === 'drop') {
            const guestId = e.dataTransfer.getData("guestId");
            if (guestId) assignGuest(guestId, tableId);
            return;
        }

        if (type === 'mousedown') {
            // If dragging a guest, do nothing here (drop handled above)
            // If waiting to assign to table (clicked guest first)
            if (selectedGuestId) {
                assignGuest(selectedGuestId, tableId);
                setSelectedGuestId(null);
                return;
            }

            // Just Select (Don't open inspector yet, wait for click or drag end)
            setSelectedTableId(tableId);
            // setActiveTab('inspector'); // REMOVED: Don't switch tab on drag start
        }

        if (type === 'click') {
            // Handle explicit click from View Mode
            if (selectedGuestId) {
                assignGuest(selectedGuestId, tableId);
                setSelectedGuestId(null);
                return;
            }
            setSelectedTableId(tableId);
            setActiveTab('inspector');
        }
    };

    const handleMoveEnd = async (tableId, x, y) => {
        // Update local state first for snap
        setTables(prev => prev.map(t => t.id === tableId ? { ...t, position: { x, y } } : t));
        // Save to DB
        await updateTable(tableId, { position: { x, y } });
    };

    // --- RENDER HELPERS ---

    const selectedTable = tables.find(t => t.id === selectedTableId);
    const selectedGuest = guests.find(g => g.id === selectedGuestId);

    if (authLoading) return <DashboardSkeleton />;

    return (
        <div
            className="h-[calc(100vh-100px)] flex flex-col md:flex-row gap-6 overflow-hidden animate-fade-in relative"
        >

            {/* 1. LEFT SIDEBAR: GUESTS (Desktop always visible, Mobile tab) */}
            <div className={`
                ${activeTab === 'guests' ? 'flex' : 'hidden md:flex'}
                w-full md:w-80 bg-white rounded-3xl shadow-sm border border-gray-100 flex-col overflow-hidden z-20 shrink-0
            `}>
                <div className="p-5 border-b border-gray-100 flex flex-col gap-4">
                    <h2 className="font-serif text-xl text-boda-text">Lista de Invitados</h2>

                    {/* GROUPING MODE SELECTOR */}
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                        {[
                            { id: 'all', label: 'Todos' },
                            { id: 'group', label: 'Sobres' },
                            { id: 'role', label: 'Etiquetas' }
                        ].map(mode => (
                            <button
                                key={mode.id}
                                onClick={() => setGroupingMode(mode.id)}
                                className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition ${groupingMode === mode.id ? 'bg-white text-[#333] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                {mode.label}
                            </button>
                        ))}
                    </div>

                    <input
                        type="text"
                        placeholder="Buscar invitado..."
                        className="w-full bg-gray-50 border border-transparent focus:bg-white focus:border-boda-green rounded-xl px-4 py-2 text-sm outline-none transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div
                    className="flex-1 overflow-y-auto p-3 space-y-2 pb-24 md:pb-3"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={async (e) => {
                        const gId = e.dataTransfer.getData("guestId");
                        if (gId) unassignGuest(gId);
                    }}
                >
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2 mb-2">
                        Sin Asignar ({unassignedGuests.length})
                    </p>

                    {/* RENDER LOGIC BASED ON MODE */}
                    {groupingMode === 'all' ? (
                        // CLASSIC LIST
                        unassignedGuests.map(guest => (
                            <GuestCard
                                key={guest.id}
                                guest={guest}
                                selectedGuestId={selectedGuestId}
                                setSelectedGuestId={setSelectedGuestId}
                                setActiveTab={setActiveTab}
                                setDraggingGuest={setDraggingGuest}
                            />
                        ))
                    ) : (
                        // GROUPED LIST
                        Object.entries(getGroupedGuests()).map(([groupName, groupGuests]) => (
                            <div key={groupName} className="mb-4 bg-gray-50/50 rounded-xl overflow-hidden border border-gray-100">
                                <div className="px-3 py-2 bg-gray-100 border-b border-gray-100 flex justify-between items-center">
                                    <span className="font-bold text-xs text-gray-600 uppercase tracking-wide">{groupName === 'undefined' ? 'Sin Grupo' : groupName}</span>
                                    <span className="text-[10px] bg-white text-gray-400 px-1.5 py-0.5 rounded border border-gray-200">{groupGuests.length}</span>
                                </div>
                                <div className="p-2 space-y-1">
                                    {groupGuests.map(guest => (
                                        <GuestCard
                                            key={guest.id}
                                            guest={guest}
                                            selectedGuestId={selectedGuestId}
                                            setSelectedGuestId={setSelectedGuestId}
                                            setActiveTab={setActiveTab}
                                            setDraggingGuest={setDraggingGuest}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))
                    )}

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

                {/* MOBILE GUEST ASSIGNMENT BANNER */}
                {selectedGuest && (
                    <div className="absolute top-4 left-4 right-4 z-40 bg-[#333] text-white p-4 rounded-xl shadow-xl flex justify-between items-center animate-slide-in-down">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Asignando a</p>
                            <p className="font-medium text-lg leading-none">{selectedGuest.nombre}</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setSelectedGuestId(null)} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold">Cancelar</button>
                            <div className="px-3 py-2 bg-white text-[#333] rounded-lg text-xs font-bold animate-pulse">Toca una mesa</div>
                        </div>
                    </div>
                )}

                {/* Visual Toolbar - Only in Layout Mode */}
                {isLayoutMode && (
                    <div className="absolute top-4 left-4 z-30 flex flex-col gap-2 animate-fade-in">
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
                )}

                {/* LAYOUT MODE TOGGLE (Floating Bottom Center) */}
                {/* Adjusted bottom position for mobile to avoid tab bar */}
                <div className="absolute bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-30">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsLayoutMode(!isLayoutMode);
                            setSelectedTableId(null); // Deselect when switching modes
                        }}
                        className={`
                            flex items-center gap-2 px-6 py-3 rounded-full shadow-xl font-bold text-sm transition-all transform hover:scale-105 select-none
                            ${isLayoutMode
                                ? 'bg-boda-text text-white ring-4 ring-boda-text/20'
                                : 'bg-white text-gray-600 hover:text-boda-text border border-gray-100'
                            }
                        `}
                    >
                        {isLayoutMode ? (
                            <><span>✅</span> <span>Guardar Distribución</span></>
                        ) : (
                            <><span>✏️</span> <span>Editar Distribución</span></>
                        )}
                    </button>
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
                    className={`flex-1 w-full relative overflow-hidden touch-none ${activeTab === 'map' ? 'cursor-grab active:cursor-grabbing' : ''}`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                        e.preventDefault();
                    }}
                    onClick={(e) => {
                        // MANUAL HIT TESTING FOR VIEW MODE
                        // Since tables are pointer-events-none in view mode, we manually check clicks to select them
                        if (!isLayoutMode) {
                            const rect = canvasRef.current.getBoundingClientRect();
                            const clickX = e.clientX - rect.left;
                            const clickY = e.clientY - rect.top;

                            // Convert to World Coordinates
                            const worldX = (clickX - pan.x) / zoom;
                            const worldY = (clickY - pan.y) / zoom;

                            // Check collision with tables (iterate reverse to hit top-most first)
                            for (let i = tables.length - 1; i >= 0; i--) {
                                const t = tables[i];
                                // Check bounding box
                                const inX = worldX >= t.position.x && worldX <= t.position.x + t.width;
                                const inY = worldY >= t.position.y && worldY <= t.position.y + t.height;

                                if (inX && inY) {
                                    handleTableInteraction(e, 'click', t.id);
                                    return;
                                }
                            }

                            // If no table hit -> Deselect
                            setSelectedTableId(null);
                            if (window.innerWidth < 768) setActiveTab('map');
                        }
                    }}
                    onMouseDown={(e) => {
                        // Start Panning
                        // In view mode, EVERYTHING triggers pan because tables are invisible to pointers
                        // In layout mode, clicking a table triggers React-Draggable, so we only pan on background
                        if (e.target === canvasRef.current || e.target.className.includes('grid-pattern') || !isLayoutMode) {
                            const startX = e.clientX;
                            const startY = e.clientY;
                            const startPan = { ...pan };

                            const onMouseMove = (moveEvent) => {
                                const dx = moveEvent.clientX - startX;
                                const dy = moveEvent.clientY - startY;
                                setPan({ x: startPan.x + dx, y: startPan.y + dy });
                            };

                            const onMouseUp = () => {
                                window.removeEventListener('mousemove', onMouseMove);
                                window.removeEventListener('mouseup', onMouseUp);
                            };

                            window.addEventListener('mousemove', onMouseMove);
                            window.addEventListener('mouseup', onMouseUp);

                            // Only deselect if we clicked background explicitly in Layout Mode
                            // In View Mode, onClick handles selection/deselection
                            if (isLayoutMode && (e.target === canvasRef.current || e.target.className.includes('grid-pattern'))) {
                                setSelectedTableId(null);
                            }
                        }
                    }}
                    // Touch Panning Support
                    onTouchStart={(e) => {
                        // Logic:
                        // 1. If NOT in layout mode -> ALWAYS pan (dragging table does nothing so we use it to pan)
                        // 2. If IN layout mode -> Only pan if touching background (tables need to be draggable)
                        const isBackground = e.target === canvasRef.current || e.target.className.includes('grid-pattern');
                        const canPan = !isLayoutMode || isBackground;

                        if (canPan) {
                            const touch = e.touches[0];
                            const startX = touch.clientX;
                            const startY = touch.clientY;
                            const startPan = { ...pan };

                            const onTouchMove = (moveEvent) => {
                                // Prevent browser scrolling
                                if (moveEvent.cancelable) moveEvent.preventDefault();

                                const t = moveEvent.touches[0];
                                const dx = t.clientX - startX;
                                const dy = t.clientY - startY;
                                setPan({ x: startPan.x + dx, y: startPan.y + dy });
                            };

                            const onTouchEnd = () => {
                                window.removeEventListener('touchmove', onTouchMove);
                                window.removeEventListener('touchend', onTouchEnd);
                                window.removeEventListener('touchcancel', onTouchEnd);
                            };

                            window.addEventListener('touchmove', onTouchMove, { passive: false });
                            window.addEventListener('touchend', onTouchEnd);
                            window.addEventListener('touchcancel', onTouchEnd);
                        }
                    }}
                >
                    <div
                        className="absolute origin-top-left transition-transform duration-75 ease-out will-change-transform"
                        style={{
                            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                            width: '100%',
                            height: '100%'
                        }}
                    >
                        {/* Grid Pattern */}
                        <div className="absolute inset-[-200%] w-[500%] h-[500%] opacity-[0.03] pointer-events-none grid-pattern"
                            style={{
                                backgroundImage: 'radial-gradient(#000 1px, transparent 1px)',
                                backgroundSize: '40px 40px',
                                marginLeft: -2000,
                                marginTop: -2000
                            }}></div>

                        {tables.map(table => (
                            <VisualTable
                                key={table.id}
                                table={table}
                                guests={getGuestsForTable(table.id)}
                                isSelected={selectedTableId === table.id}
                                isLayoutMode={isLayoutMode}
                                scale={zoom}
                                onInteraction={(e, type) => handleTableInteraction(e, type, table.id)}
                                onMoveEnd={handleMoveEnd}
                            />
                        ))}
                    </div>
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
                        <div className="p-5 space-y-6 flex-1 overflow-y-auto pb-24 md:pb-5">

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
                                        min="1" max="30"
                                        onChange={(e) => {
                                            let val = parseInt(e.target.value) || 1;
                                            if (val > 30) {
                                                val = 30;
                                                alert("El máximo de sillas por mesa es de 30 para mantener el diseño.");
                                            }
                                            if (val < 1) val = 1;
                                            updateTable(selectedTable.id, { seats: val });
                                        }}
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

            {/* Mobile Tabs (Moved Overlay) */}
            <div className="md:hidden absolute bottom-4 left-1/2 -translate-x-1/2 bg-white rounded-full shadow-xl border border-gray-100 p-1 flex gap-1 z-50">
                <button onClick={() => setActiveTab('guests')} className={`px-4 py-2 rounded-full text-xs font-bold transition ${activeTab === 'guests' ? 'bg-boda-text text-white' : 'text-gray-500 hover:bg-gray-50'}`}>Invitados</button>
                <button onClick={() => setActiveTab('map')} className={`px-4 py-2 rounded-full text-xs font-bold transition ${activeTab === 'map' ? 'bg-boda-text text-white' : 'text-gray-500 hover:bg-gray-50'}`}>Mapa</button>
                <button onClick={() => setActiveTab('inspector')} className={`px-4 py-2 rounded-full text-xs font-bold transition ${activeTab === 'inspector' ? 'bg-boda-text text-white' : 'text-gray-500 hover:bg-gray-50'}`}>Editor</button>
            </div>
        </div>
    );
}
