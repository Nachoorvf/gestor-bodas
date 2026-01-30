'use client';
import { useState, useEffect, useRef } from 'react';
import { auth, db } from '../../../firebase/config';
import { doc, getDoc, collection, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

// TABLE TYPES & SIZES (pixels)
const TABLE_TYPES = {
    standard: { width: 150, height: 150, shape: 'rounded-full', label: 'Redonda (10)' },
    presidential: { width: 300, height: 100, shape: 'rounded-xl', label: 'Presidencial (6)' }
};

export default function MesasPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [weddingId, setWeddingId] = useState(null);

    const [tables, setTables] = useState([]);
    const [guests, setGuests] = useState([]);
    const [draggingGuest, setDraggingGuest] = useState(null);

    // TABLE DRAGGING STATE
    const [draggingTableId, setDraggingTableId] = useState(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const canvasRef = useRef(null);

    // ZOOM STATE
    const [zoom, setZoom] = useState(1);

    // 1. Auth & Initial Load
    useEffect(() => {
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

    // 2. Listen to Data
    useEffect(() => {
        if (!weddingId) return;

        // Listen to Tables
        const qTables = query(collection(db, 'weddings', weddingId, 'tables'));
        const unsubTables = onSnapshot(qTables, (snap) => {
            setTables(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // Listen to Guests
        const qGuests = query(collection(db, 'weddings', weddingId, 'guests'));
        const unsubGuests = onSnapshot(qGuests, (snap) => {
            setGuests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => {
            unsubTables();
            unsubGuests();
        };
    }, [weddingId]);

    const unassignedGuests = guests.filter(g => !g.tableId && g.confirmado !== false);
    const getGuestsForTable = (tableId) => guests.filter(g => g.tableId === tableId);

    // --- ACTIONS ---

    const handleAddTable = async (type) => {
        const name = prompt(`Nombre para la mesa ${TABLE_TYPES[type].label}:`, type === 'presidential' ? 'Mesa Presidencial' : `Mesa ${tables.length + 1}`);
        if (!name) return;

        // Find a safe spot
        const initialX = 50 + (tables.length * 20) % 500;
        const initialY = 50 + (tables.length * 20) % 300;

        await addDoc(collection(db, 'weddings', weddingId, 'tables'), {
            name,
            type,
            position: { x: initialX, y: initialY },
            createdAt: new Date().toISOString()
        });
    };

    const handleDeleteTable = async (tableId) => {
        if (!confirm("¿Borrar mesa? Los invitados volverán a la lista.")) return;

        // Reset guests
        const guestsInTable = getGuestsForTable(tableId);
        const batchPromises = guestsInTable.map(g => updateDoc(doc(db, 'weddings', weddingId, 'guests', g.id), { tableId: null }));
        await Promise.all(batchPromises);

        // Delete table
        await deleteDoc(doc(db, 'weddings', weddingId, 'tables', tableId));
    };

    const unassignGuest = async (guestId) => {
        await updateDoc(doc(db, 'weddings', weddingId, 'guests', guestId), {
            tableId: null
        });
    };

    // --- TABLE MOVING LOGIC (WITH ZOOM) ---

    const checkCollision = (id, x, y, type) => {
        const myW = TABLE_TYPES[type].width;
        const myH = TABLE_TYPES[type].height;

        return tables.some(t => {
            if (t.id === id) return false;
            const otherType = t.type || 'standard'; // default
            const otherW = TABLE_TYPES[otherType].width;
            const otherH = TABLE_TYPES[otherType].height;
            const tX = t.position?.x || 0;
            const tY = t.position?.y || 0;

            // Simple box collision
            return (x < tX + otherW + 20 && // +20 margin
                x + myW + 20 > tX &&
                y < tY + otherH + 20 &&
                y + myH + 20 > tY);
        });
    };

    const onTableMouseDown = (e, table) => {
        e.stopPropagation(); // Don't trigger canvas click
        setDraggingTableId(table.id);
        const rect = e.currentTarget.getBoundingClientRect();

        // Correct offset by dividing by zoom
        setDragOffset({
            x: (e.clientX - rect.left) / zoom,
            y: (e.clientY - rect.top) / zoom
        });
    };

    const onCanvasMouseMove = (e) => {
        if (!draggingTableId) return;
        if (!canvasRef.current) return;

        const canvasRect = canvasRef.current.getBoundingClientRect();

        // Calculate X/Y taking zoom into account
        // (MousePos - CanvasStart) / Zoom - Offset
        const x = (e.clientX - canvasRect.left) / zoom - dragOffset.x;
        const y = (e.clientY - canvasRect.top) / zoom - dragOffset.y;

        // Boundary checks (relative to internal canvas size 100% W/H?)
        // The canvas is visually infinite or fixed? 
        // For now let's use the bounding rect of the container / zoom to get "virtual" width
        const virtualWidth = canvasRect.width / zoom;
        const virtualHeight = canvasRect.height / zoom;

        const table = tables.find(t => t.id === draggingTableId);
        const type = table.type || 'standard';
        const w = TABLE_TYPES[type].width;
        const h = TABLE_TYPES[type].height;

        let finalX = Math.max(0, Math.min(x, virtualWidth - w));
        let finalY = Math.max(0, Math.min(y, virtualHeight - h));

        if (!checkCollision(draggingTableId, finalX, finalY, type)) {
            setTables(prev => prev.map(t =>
                t.id === draggingTableId ? { ...t, position: { x: finalX, y: finalY } } : t
            ));
        }
    };

    const onCanvasMouseUp = async () => {
        if (draggingTableId) {
            const table = tables.find(t => t.id === draggingTableId);
            if (table) {
                // Save final position
                await updateDoc(doc(db, 'weddings', weddingId, 'tables', draggingTableId), {
                    position: table.position
                });
            }
            setDraggingTableId(null);
        }
    };

    // --- GUEST DRAGGING LOGIC ---

    const onDragStartGuest = (e, guest, sourceTableId) => {
        setDraggingGuest({ guest, sourceTableId });
        e.dataTransfer.setData("guestId", guest.id);
    };

    const onDropTable = async (e, targetTableId) => {
        e.preventDefault();
        e.stopPropagation();
        const guestId = e.dataTransfer.getData("guestId");
        if (!guestId) return;

        await updateDoc(doc(db, 'weddings', weddingId, 'guests', guestId), {
            tableId: targetTableId
        });
        setDraggingGuest(null);
    };

    const onGuestDragOver = (e) => {
        e.preventDefault();
    };

    const onDropSidebar = async (e) => {
        e.preventDefault();
        const guestId = e.dataTransfer.getData("guestId");
        if (!guestId) return;

        await updateDoc(doc(db, 'weddings', weddingId, 'guests', guestId), {
            tableId: null
        });
        setDraggingGuest(null);
    };


    if (loading) return <div className="p-8 text-center text-boda-text-light">Cargando...</div>;

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col" onMouseUp={onCanvasMouseUp} onMouseMove={onCanvasMouseMove}>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-serif text-boda-text">Plano de Mesas</h1>
                    <p className="text-xs text-gray-400">Arrastra invitados y organiza tu salón</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => handleAddTable('standard')} className="bg-boda-green text-white px-4 py-2 rounded-xl font-bold shadow-md hover:bg-boda-green-dark transition text-sm">+ Redonda</button>
                    <button onClick={() => handleAddTable('presidential')} className="bg-purple-500 text-white px-4 py-2 rounded-xl font-bold shadow-md hover:bg-purple-600 transition text-sm">+ Presidencial</button>
                </div>
            </div>

            <div className="flex-1 flex gap-4 overflow-hidden h-full">

                {/* LEFT SIDEBAR: UNASSIGNED */}
                <div
                    className="w-64 bg-white rounded-2xl shadow-sm border border-gray-200 p-4 flex flex-col h-full z-20 shrink-0 hidden md:flex"
                    onDragOver={onGuestDragOver}
                    onDrop={onDropSidebar}
                >
                    <h3 className="font-bold text-boda-text mb-4 text-sm uppercase flex justify-between">
                        <span>Sin Asignar</span>
                        <span className="bg-gray-100 px-2 rounded-full text-xs py-1">{unassignedGuests.length}</span>
                    </h3>
                    <div className="space-y-2 overflow-y-auto flex-1 pr-2">
                        {unassignedGuests.map((guest) => (
                            <div
                                key={guest.id}
                                draggable
                                onDragStart={(e) => onDragStartGuest(e, guest, null)}
                                className="p-3 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-600 cursor-grab active:cursor-grabbing hover:bg-white hover:shadow-sm transition flex items-center gap-2"
                            >
                                <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                                {guest.nombre}
                            </div>
                        ))}
                        {unassignedGuests.length === 0 && <p className="text-xs text-center text-gray-300 py-4">Todo asignado</p>}
                    </div>
                </div>

                {/* CENTER: CANVAS TOOL */}
                <div className="flex-1 relative overflow-hidden bg-gray-100 rounded-2xl border-2 border-dashed border-gray-200 min-w-[300px]">
                    {/* ZOOM CONTROLS */}
                    <div className="absolute top-4 right-4 z-50 flex gap-2 bg-white p-2 rounded-xl shadow-md">
                        <button onClick={() => setZoom(Math.max(0.4, zoom - 0.1))} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 font-bold text-lg">-</button>
                        <span className="flex items-center text-xs font-bold w-12 justify-center text-gray-500">{Math.round(zoom * 100)}%</span>
                        <button onClick={() => setZoom(Math.min(1.5, zoom + 0.1))} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 font-bold text-lg">+</button>
                    </div>

                    {/* SCALABLE CANVAS */}
                    <div
                        ref={canvasRef}
                        className="w-full h-full relative"
                        style={{
                            transform: `scale(${zoom})`,
                            transformOrigin: '0 0',
                            width: `${100 / zoom}%`, // Compensate width to fill container
                            height: `${100 / zoom}%`
                        }}
                    >
                        {/* GRID BACKGROUND */}
                        <div className="absolute inset-0 opacity-10 pointer-events-none"
                            style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                        </div>

                        {tables.map(table => {
                            const type = table.type || 'standard';
                            const cfg = TABLE_TYPES[type];
                            const guestsInTable = getGuestsForTable(table.id);
                            const isDragging = draggingTableId === table.id;

                            return (
                                <div
                                    key={table.id}
                                    onMouseDown={(e) => onTableMouseDown(e, table)}
                                    onDragOver={onGuestDragOver}
                                    onDrop={(e) => onDropTable(e, table.id)}
                                    style={{
                                        left: table.position?.x || 100,
                                        top: table.position?.y || 100,
                                        width: cfg.width,
                                        height: cfg.height,
                                    }}
                                    className={`absolute bg-white shadow-xl border-2 hover:border-boda-green cursor-move transition-shadow
                                        ${cfg.shape} ${isDragging ? 'shadow-2xl scale-105 z-50 border-boda-green' : 'z-10 border-gray-100'}
                                        flex flex-col items-center justify-center p-2 group
                                    `}
                                >
                                    <div className="text-center pointer-events-none select-none">
                                        <p className="font-serif font-bold text-boda-text text-sm md:text-base">{table.name}</p>
                                        <p className="text-xs text-gray-400">{guestsInTable.length} pax</p>
                                    </div>

                                    <div className="flex flex-wrap justify-center gap-1 mt-2 max-w-full pointer-events-none">
                                        {guestsInTable.map(g => (
                                            <div key={g.id} className="w-2 h-2 rounded-full bg-green-400" title={g.nombre}></div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* RIGHT SIDEBAR: TABLE LIST MANAGEMENT */}
                <div className="w-72 bg-white rounded-2xl shadow-sm border border-gray-200 p-4 flex flex-col h-full z-20 shrink-0 hidden lg:flex">
                    <h3 className="font-bold text-boda-text mb-4 text-sm uppercase">Resumen de Mesas</h3>
                    <div className="space-y-4 overflow-y-auto flex-1 pr-2">
                        {tables.length === 0 && <p className="text-xs text-center text-gray-300 py-10">Crea una mesa para empezar</p>}

                        {tables.map(table => {
                            const guestsInTable = getGuestsForTable(table.id);
                            return (
                                <div key={table.id} className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                                    <div className="bg-white p-3 border-b border-gray-100 flex justify-between items-center">
                                        <span className="font-bold text-sm text-boda-text">{table.name}</span>
                                        <button
                                            onClick={() => handleDeleteTable(table.id)}
                                            className="text-red-400 hover:text-red-600 w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-50 text-xs transition" title="Borrar mesa"
                                        >🗑️</button>
                                    </div>
                                    <div className="p-2 space-y-1">
                                        {guestsInTable.map(g => (
                                            <div key={g.id} className="flex justify-between items-center text-xs p-1 hover:bg-white rounded transition">
                                                <span className="text-gray-600 truncate">{g.nombre}</span>
                                                <button
                                                    onClick={() => unassignGuest(g.id)}
                                                    className="text-gray-400 hover:text-red-500 font-bold px-1" title="Sacar de la mesa"
                                                >×</button>
                                            </div>
                                        ))}
                                        {guestsInTable.length === 0 && <p className="text-[10px] text-gray-300 text-center italic py-2">Vacía</p>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

            </div>
        </div>
    );
}
