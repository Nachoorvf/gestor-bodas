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

const GuestCard = ({ guest, selectedGuestId, setSelectedGuestId, setActiveTab, setDraggingGuest, isGroup, groupGuests, isExpanded, onToggleExpand }) => (
    <div
        draggable
        onDragStart={(e) => {
            setDraggingGuest({ guest, isGroup, groupGuests });
            e.dataTransfer.setData("guestId", isGroup ? `group_${guest.group}` : guest.id);
        }}
        className={`
            p-3 rounded-xl border flex items-center justify-between hover:shadow-md transition-all
            ${selectedGuestId === (isGroup ? `group_${guest.group}` : guest.id) ? 'bg-boda-text text-white border-boda-text' : 'bg-white border-gray-100 text-gray-600 hover:border-boda-green'}
        `}
    >
        {/* Main click area for selection / drag */}
        <div
            className="flex-1 cursor-grab active:cursor-grabbing max-w-[85%]"
            onClick={() => {
                setSelectedGuestId(selectedGuestId === (isGroup ? `group_${guest.group}` : guest.id) ? null : (isGroup ? `group_${guest.group}` : guest.id));
                if (window.innerWidth < 768) setActiveTab('map');
            }}
        >
            <span className="font-medium text-sm flex items-center gap-2 truncate">
                {isGroup ? `${guest.group || 'Sin Sobre'} (${groupGuests.length})` : guest.nombre}
            </span>
        </div>

        {/* Action icons area */}
        <div className="flex items-center gap-1 shrink-0 h-full">
            {isGroup && groupGuests.length > 0 && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleExpand && onToggleExpand();
                    }}
                    className="w-6 h-6 flex items-center justify-center rounded bg-gray-50 hover:bg-gray-100 text-gray-400 border border-gray-100 transition-colors"
                >
                    {isExpanded ? '▲' : '▼'}
                </button>
            )}
            <div className="opacity-30 cursor-grab pl-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="19" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="19" r="1"></circle></svg>
            </div>
        </div>
    </div>
);

export default function MesasPage() {
    const router = useRouter();
    const { user, userData, loading: authLoading } = useAuth();
    const weddingId = userData?.weddingId;

    const [tables, setTables] = useState([]);
    const [guests, setGuests] = useState([]); // Real guests from DB
    const [weddingConfig, setWeddingConfig] = useState(null); // To store partner names and their seats

    // UI STATES
    const [toastMessage, setToastMessage] = useState(null);
    const showToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
    };

    const [activeTab, setActiveTab] = useState('map'); // 'guests', 'map', 'inspector'
    const [zoom, setZoom] = useState(0.8);
    const [pan, setPan] = useState({ x: 0, y: 0 }); // NEW: Canvas Panning
    const [isLayoutMode, setIsLayoutMode] = useState(false); // NEW: Controls drag vs view state
    const [selectedTableId, setSelectedTableId] = useState(null);
    const [selectedGuestId, setSelectedGuestId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // NEW: GROUPING MODE
    const [groupingMode, setGroupingMode] = useState('group'); // 'all', 'group' (envelopes), 'role' (tags)
    const [expandedGroups, setExpandedGroups] = useState([]);

    // DRAGGING STATE
    const [draggingGuest, setDraggingGuest] = useState(null); // { guest, sourceTableId, isGroup, groupGuests }

    const canvasRef = useRef(null);

    // Set mobile default zoom and pan
    useEffect(() => {
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
            setZoom(0.4);
            setPan({ x: 20, y: 50 });
        }
    }, []);

    useEffect(() => {
        if (authLoading) return;
    }, [authLoading]);

    // 2. Data Listeners
    useEffect(() => {
        if (!weddingId) return;

        // Fetch Main Wedding Doc (for partner names and their seats)
        const unsubWedding = onSnapshot(doc(db, 'weddings', weddingId), (snap) => {
            if (snap.exists()) setWeddingConfig(snap.data());
        });

        const unsubTables = onSnapshot(query(collection(db, 'weddings', weddingId, 'tables')),
            (snap) => setTables(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

        const unsubGuests = onSnapshot(query(collection(db, 'weddings', weddingId, 'guests'), orderBy('nombre')),
            (snap) => setGuests(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

        return () => { unsubWedding(); unsubTables(); unsubGuests(); };
    }, [weddingId]);

    // 3. COMBINE GUESTS WITH COUPLE
    const allGuests = [...guests];

    // Inject Partner 1
    if (weddingConfig?.novios?.[0]) {
        allGuests.push({
            id: 'novio_1',
            nombre: weddingConfig.novios[0],
            group: 'Los Novios',
            role: 'novios',
            confirmado: true,
            tableId: weddingConfig.novio1_tableId || null,
            seatIndex: weddingConfig.novio1_seatIndex !== undefined ? weddingConfig.novio1_seatIndex : null,
        });
    }

    // Inject Partner 2
    if (weddingConfig?.novios?.[1]) {
        allGuests.push({
            id: 'novio_2',
            nombre: weddingConfig.novios[1],
            group: 'Los Novios',
            role: 'novios',
            confirmado: true,
            tableId: weddingConfig.novio2_tableId || null,
            seatIndex: weddingConfig.novio2_seatIndex !== undefined ? weddingConfig.novio2_seatIndex : null,
        });
    }

    const unassignedGuests = allGuests.filter(g => !g.tableId && g.confirmado !== false).filter(g => g.nombre.toLowerCase().includes(searchTerm.toLowerCase()));

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

    const getGuestsForTable = (tableId) => allGuests.filter(g => g.tableId === tableId);

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


    const assignGuest = async (guestIdOrGroupId, tableId, isDrop = false) => {
        const table = tables.find(t => t.id === tableId);
        if (!table) return;

        let guestsToAssign = [];
        const isGroupAssignment = guestIdOrGroupId.startsWith('group_');

        if (isGroupAssignment) {
            const groupName = guestIdOrGroupId.replace('group_', '');
            guestsToAssign = unassignedGuests.filter(g => g.group === groupName || (!g.group && groupName === 'Sin Sobre'));
        } else {
            const guest = allGuests.find(g => g.id === guestIdOrGroupId);
            if (guest) guestsToAssign = [guest];
        }

        if (guestsToAssign.length === 0) return;

        const seatedGuests = allGuests.filter(g => g.tableId === tableId);
        const availableSeats = table.seats - seatedGuests.length;

        if (guestsToAssign.length > availableSeats) {
            showToast(`No hay suficientes sillas. Faltan ${guestsToAssign.length - availableSeats} asientos en esta mesa.`);
            return;
        }

        const occupiedSeats = seatedGuests.map(g => g.seatIndex).filter(i => i !== undefined);
        let nextSeatIndices = [];
        let currentSeatTry = 0;

        while (nextSeatIndices.length < guestsToAssign.length && currentSeatTry < table.seats) {
            if (!occupiedSeats.includes(currentSeatTry)) {
                nextSeatIndices.push(currentSeatTry);
            }
            currentSeatTry++;
        }

        try {
            const promises = guestsToAssign.map((g, index) => {
                if (g.id === 'novio_1' || g.id === 'novio_2') {
                    // Update main wedding doc
                    const partnerPrefix = g.id === 'novio_1' ? 'novio1' : 'novio2';
                    return updateDoc(doc(db, 'weddings', weddingId), {
                        [`${partnerPrefix}_tableId`]: tableId,
                        [`${partnerPrefix}_seatIndex`]: nextSeatIndices[index]
                    });
                } else {
                    // Update normal guest doc
                    return updateDoc(doc(db, 'weddings', weddingId, 'guests', g.id), {
                        tableId,
                        seatIndex: nextSeatIndices[index]
                    });
                }
            });
            await Promise.all(promises);
        } catch (error) {
            console.error("Error asignando invitados:", error);
        }

        setDraggingGuest(null);
    };

    const unassignGuest = async (guestId) => {
        if (guestId.startsWith('group_')) {
            const groupName = guestId.replace('group_', '');
            const groupGuests = allGuests.filter(g => g.group === groupName || (!g.group && groupName === 'Sin Sobre'));
            await Promise.all(groupGuests.map(g => {
                if (g.id === 'novio_1' || g.id === 'novio_2') {
                    const partnerPrefix = g.id === 'novio_1' ? 'novio1' : 'novio2';
                    return updateDoc(doc(db, 'weddings', weddingId), {
                        [`${partnerPrefix}_tableId`]: null,
                        [`${partnerPrefix}_seatIndex`]: null
                    });
                } else {
                    return updateDoc(doc(db, 'weddings', weddingId, 'guests', g.id), {
                        tableId: null,
                        seatIndex: null
                    });
                }
            }));
        } else {
            if (guestId === 'novio_1' || guestId === 'novio_2') {
                const partnerPrefix = guestId === 'novio_1' ? 'novio1' : 'novio2';
                await updateDoc(doc(db, 'weddings', weddingId), {
                    [`${partnerPrefix}_tableId`]: null,
                    [`${partnerPrefix}_seatIndex`]: null
                });
            } else {
                await updateDoc(doc(db, 'weddings', weddingId, 'guests', guestId), {
                    tableId: null,
                    seatIndex: null
                });
            }
        }
    };

    const handleRandomizeSeats = async (tableId) => {
        const tableGuests = getGuestsForTable(tableId);
        if (tableGuests.length < 2) return;
        const table = tables.find(t => t.id === tableId);

        let occupiedIndices = tableGuests.map(g => g.seatIndex).filter(i => i !== null && i !== undefined);
        let currentSeatTry = 0;
        // Ensure everyone has some index logic internally assigned
        while (occupiedIndices.length < tableGuests.length && currentSeatTry < table.seats) {
            if (!occupiedIndices.includes(currentSeatTry)) occupiedIndices.push(currentSeatTry);
            currentSeatTry++;
        }

        const shuffledIndices = [...occupiedIndices].sort(() => Math.random() - 0.5);

        const updates = tableGuests.map((g, index) => {
            const newIndex = shuffledIndices[index];
            if (g.id === 'novio_1' || g.id === 'novio_2') {
                const pPrefix = g.id === 'novio_1' ? 'novio1' : 'novio2';
                return updateDoc(doc(db, 'weddings', weddingId), { [`${pPrefix}_seatIndex`]: newIndex });
            } else {
                return updateDoc(doc(db, 'weddings', weddingId, 'guests', g.id), { seatIndex: newIndex });
            }
        });
        await Promise.all(updates);
    };

    const handleSwapSeat = async (tableId, occupant, direction) => {
        const table = tables.find(t => t.id === tableId);
        const currentIndex = occupant.seatIndex;
        if (currentIndex === undefined || currentIndex === null) return;

        // direction: 1 (down/next), -1 (up/prev)
        let targetIndex = currentIndex + direction;

        // Wrap around logic
        if (targetIndex >= table.seats) targetIndex = 0;
        if (targetIndex < 0) targetIndex = table.seats - 1;

        const tableGuests = getGuestsForTable(tableId);
        const targetOccupant = tableGuests.find(g => g.seatIndex === targetIndex);

        const updates = [];

        // Move current occupant to target
        if (occupant.id === 'novio_1' || occupant.id === 'novio_2') {
            const pPrefix = occupant.id === 'novio_1' ? 'novio1' : 'novio2';
            updates.push(updateDoc(doc(db, 'weddings', weddingId), { [`${pPrefix}_seatIndex`]: targetIndex }));
        } else {
            updates.push(updateDoc(doc(db, 'weddings', weddingId, 'guests', occupant.id), { seatIndex: targetIndex }));
        }

        // If target was occupied, move target occupant to current index
        if (targetOccupant) {
            if (targetOccupant.id === 'novio_1' || targetOccupant.id === 'novio_2') {
                const pPrefix = targetOccupant.id === 'novio_1' ? 'novio1' : 'novio2';
                updates.push(updateDoc(doc(db, 'weddings', weddingId), { [`${pPrefix}_seatIndex`]: currentIndex }));
            } else {
                updates.push(updateDoc(doc(db, 'weddings', weddingId, 'guests', targetOccupant.id), { seatIndex: currentIndex }));
            }
        }
        await Promise.all(updates);
    };

    // --- CANVAS INTERACTION ---

    // --- CANVAS INTERACTION ---

    const handleTableInteraction = (e, type, tableId) => {
        if (type === 'drop') {
            const currentGuestId = e.dataTransfer.getData("guestId");
            if (currentGuestId) assignGuest(currentGuestId, tableId, true);
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

            // Prevent auto-opening the editor while arranging layout to avoid disruption
            if (!isLayoutMode) {
                setActiveTab('inspector');
            }
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
    let selectedGuestForBanner = null;
    if (selectedGuestId) {
        if (selectedGuestId.startsWith('group_')) {
            const groupName = selectedGuestId.replace('group_', '');
            const count = unassignedGuests.filter(g => g.group === groupName || (!g.group && groupName === 'Sin Sobre')).length;
            selectedGuestForBanner = { nombre: `${groupName === 'undefined' ? 'Sin Grupo' : groupName} (${count} personas)` };
        } else {
            selectedGuestForBanner = allGuests.find(g => g.id === selectedGuestId);
        }
    }

    if (authLoading) return <DashboardSkeleton />;

    return (
        <div
            className="fixed inset-0 top-[96px] bg-boda-bg p-4 pb-[80px] z-40 md:static md:p-0 md:bg-transparent md:h-[calc(100vh-160px)] flex flex-col gap-6 overflow-hidden animate-fade-in md:relative"
        >
            {/* MAIN CONTENT SPLIT */}
            <div className="flex flex-col md:flex-row gap-8 flex-1 min-h-0 relative">

                {/* 1. LEFT SIDEBAR: GUESTS */}
                <div className={`
                    ${activeTab === 'guests' ? 'flex absolute inset-0 bg-white z-40' : 'hidden md:flex'}
                    w-full md:w-80 bg-white rounded-3xl shadow-sm border border-gray-100 flex-col overflow-hidden shrink-0 animate-slide-in-left
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
                        ) : groupingMode === 'group' ? (
                            // ENVELOPES LIST (ACCORDION DIRECTLY)
                            Object.entries(getGroupedGuests()).map(([groupName, groupGuests]) => (
                                groupGuests.length > 0 && (
                                    <div key={groupName} className="flex flex-col gap-1 mb-2">
                                        <GuestCard
                                            key={`group_${groupName}`}
                                            guest={groupGuests[0]} // Use the first guest as reference for the group name
                                            isGroup={true}
                                            groupGuests={groupGuests}
                                            selectedGuestId={selectedGuestId}
                                            setSelectedGuestId={setSelectedGuestId}
                                            setActiveTab={setActiveTab}
                                            setDraggingGuest={setDraggingGuest}
                                            isExpanded={expandedGroups.includes(groupName)}
                                            onToggleExpand={() => {
                                                setExpandedGroups(prev =>
                                                    prev.includes(groupName)
                                                        ? prev.filter(g => g !== groupName)
                                                        : [...prev, groupName]
                                                );
                                            }}
                                        />

                                        {expandedGroups.includes(groupName) && (
                                            <div className="pl-4 border-l-2 border-gray-100 ml-3 space-y-1 mt-1 bg-gray-50/30 rounded-r-xl py-1">
                                                {groupGuests.map(guest => (
                                                    <GuestCard
                                                        key={guest.id}
                                                        guest={guest}
                                                        selectedGuestId={selectedGuestId}
                                                        setSelectedGuestId={setSelectedGuestId}
                                                        setActiveTab={setActiveTab}
                                                        setDraggingGuest={setDraggingGuest}
                                                        isGroup={false}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )
                            ))
                        ) : (
                            // ROLE / TAGS LIST (RETAINS HEADER)
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
                                                isGroup={false}
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

                    {/* CUSTOM TOAST NOTIFICATION */}
                    {toastMessage && (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-[#333] text-white px-6 py-3 rounded-full shadow-2xl animate-fade-in font-medium text-sm border border-gray-600 flex items-center gap-2 max-w-[90%] w-max text-center">
                            <span>⚠️</span>
                            {toastMessage}
                        </div>
                    )}

                    {/* MOBILE GUEST ASSIGNMENT BANNER */}
                    {selectedGuestForBanner && (
                        <div className="absolute top-4 left-4 right-4 z-40 bg-[#333] text-white p-4 rounded-xl shadow-xl flex justify-between items-center animate-slide-in-down border-[3px] border-boda-text">
                            <div className="flex-1 min-w-0 pr-4">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-[#C5A065]">Fijando Asiento</p>
                                <p className="font-medium text-base truncate">{selectedGuestForBanner.nombre}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                                <div className="px-3 py-1 bg-[#C5A065] text-white rounded-md text-[10px] font-bold uppercase animate-pulse shadow-sm">Toca una mesa</div>
                                <button onClick={() => setSelectedGuestId(null)} className="text-[10px] font-bold uppercase text-gray-400 hover:text-white px-2 py-1">Cancelar</button>
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
                    <div className="absolute bottom-28 md:bottom-8 left-1/2 -translate-x-1/2 z-30 w-full flex justify-center pointer-events-none">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsLayoutMode(!isLayoutMode);
                                setSelectedTableId(null); // Deselect when switching modes
                            }}
                            className={`
                            pointer-events-auto flex items-center gap-2 px-6 py-3 rounded-full shadow-xl font-bold text-sm transition-all transform hover:scale-105 select-none
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
                        <button onClick={() => setZoom(z => Math.max(0.4, z - 0.1))} className="w-10 h-10 md:w-8 md:h-8 flex items-center justify-center rounded-lg hover:bg-gray-50 font-bold text-gray-500 text-xl md:text-base">-</button>
                        <span className="flex items-center text-xs font-bold text-gray-400 w-8 justify-center">{Math.round(zoom * 100)}%</span>
                        <button onClick={() => setZoom(z => Math.min(1.5, z + 0.1))} className="w-10 h-10 md:w-8 md:h-8 flex items-center justify-center rounded-lg hover:bg-gray-50 font-bold text-gray-500 text-xl md:text-base">+</button>
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
                ${activeTab === 'inspector' ? 'flex absolute inset-0 bg-white z-40' : 'hidden md:flex'}
                w-full md:w-80 bg-white rounded-3xl shadow-sm border border-gray-100 flex-col overflow-hidden shrink-0 animate-slide-in-right
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
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full font-bold">{getGuestsForTable(selectedTable.id).length} / {selectedTable.seats}</span>
                                            {getGuestsForTable(selectedTable.id).length > 1 && (
                                                <button
                                                    onClick={() => handleRandomizeSeats(selectedTable.id)}
                                                    className="text-[10px] bg-white border border-gray-200 hover:bg-gray-50 px-2 py-1 rounded shadow-sm transition font-bold"
                                                    title="Aleatorizar Asientos"
                                                >
                                                    🔀
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 rounded-xl p-2 space-y-1 min-h-[100px] max-h-[400px] overflow-y-auto">
                                        {Array.from({ length: selectedTable.seats }).map((_, i) => {
                                            const occupant = getGuestsForTable(selectedTable.id).find(g => g.seatIndex === i);
                                            return (
                                                <div key={`seat_${i}`} className={`flex justify-between items-center p-2 rounded-lg border transition-all ${occupant ? 'bg-white shadow-sm border-gray-100' : 'bg-transparent border-dashed border-gray-200 opacity-60 hover:opacity-100'}`}>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[10px] font-bold text-gray-400 w-5 text-center">{i + 1}</span>
                                                        {occupant ? (
                                                            <span className="text-sm text-gray-600 font-medium truncate max-w-[130px]" title={occupant.nombre}>{occupant.nombre}</span>
                                                        ) : (
                                                            <span className="text-xs text-gray-400 italic">Asiento libre</span>
                                                        )}
                                                    </div>

                                                    {occupant && (
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex gap-0.5 bg-gray-50 p-0.5 rounded-lg border border-gray-100">
                                                                <button onClick={() => handleSwapSeat(selectedTable.id, occupant, -1)} className="text-gray-400 hover:text-boda-text hover:bg-white rounded px-1.5 py-1 transition text-[10px] shadow-sm" title="Subir (intercambiar)">▲</button>
                                                                <button onClick={() => handleSwapSeat(selectedTable.id, occupant, 1)} className="text-gray-400 hover:text-boda-text hover:bg-white rounded px-1.5 py-1 transition text-[10px] shadow-sm" title="Bajar (intercambiar)">▼</button>
                                                            </div>
                                                            <button onClick={() => unassignGuest(occupant.id)} className="text-red-300 hover:text-red-500 p-1 opacity-50 hover:opacity-100 transition" title="Quitar de mesa">✕</button>
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
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
        </div>
    );
}
