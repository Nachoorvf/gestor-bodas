import React from 'react';
import Draggable from 'react-draggable';

const SHAPES = {
    round: 'rounded-full',
    square: 'rounded-xl',
    presidential: 'rounded-2xl', // Long rectangle
    rectangular: 'rounded-lg' // Standard rectangle
};

export default function VisualTable({ table, guests = [], isDragging, isSelected, isLayoutMode, scale = 1, onInteraction, onMoveEnd }) {
    const { shape = 'round', seats = 10, width, height, name, rotation = 0 } = table;
    const nodeRef = React.useRef(null);

    // Calculate chair positions based on shape
    const getChairPosition = (index, totalSeats) => {
        // 1. ROUND TABLE
        if (shape === 'round') {
            const angle = (index / totalSeats) * 2 * Math.PI - Math.PI / 2; // Start at top (-90deg)
            const radius = (width / 2) + 25; // 25px offset for chair
            return {
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius,
                rotation: angle + Math.PI / 2
            };
        }

        // 2. PRESIDENTIAL / RECTANGULAR (Simple distribution: Top and Bottom)
        if (shape === 'presidential' || shape === 'rectangular') {
            const sideSeats = Math.ceil(totalSeats / 2);
            const isTop = index < sideSeats;
            const colIndex = isTop ? index : index - sideSeats;
            const spacing = width / (sideSeats + 1);
            const x = (colIndex + 1) * spacing - (width / 2);
            const y = isTop ? -(height / 2) - 25 : (height / 2) + 25;
            return { x, y, rotation: 0 };
        }

        // 3. SQUARE (Distributed on 4 sides)
        const angle = (index / totalSeats) * 2 * Math.PI - Math.PI / 2;
        const radius = (width / 2) + 25;
        return {
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius,
            rotation: 0
        };
    };

    return (
        <Draggable
            nodeRef={nodeRef}
            position={{ x: table.position.x, y: table.position.y }}
            scale={scale}
            disabled={!isLayoutMode}
            onStop={(e, data) => onMoveEnd(table.id, data.x, data.y)}
            onStart={(e) => {
                onInteraction(e, 'mousedown');
            }}
        >
            <div
                ref={nodeRef}
                className={`absolute flex flex-col items-center justify-center transition-colors duration-200 group
                    ${isDragging ? 'z-50 opacity-90' : 'z-10'}
                    ${isLayoutMode ? 'cursor-move' : 'cursor-pointer pointer-events-none'}
                `}
                style={{ width, height }}
                onClick={(e) => {
                    e.stopPropagation();
                    onInteraction(e, 'click');
                }}
                onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                }}
                onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onInteraction(e, 'drop');
                }}
            >
                {/*
                  ROTATION WRAPPER
                  - Positioned absolutely to fill nodeRef (same bounding box)
                  - display:flex + align/justify center → absolute chairs keep
                    their "static" position at the center, so translate() math
                    works identically to before
                  - CSS rotate applied here so table body + all chairs spin together
                */}
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: `rotate(${rotation}deg)`,
                    transformOrigin: 'center center',
                    transition: 'transform 0.35s cubic-bezier(0.34, 1.4, 0.64, 1)',
                }}>

                    {/* TABLE BODY */}
                    <div className={`
                        w-full h-full bg-white shadow-lg border-2 flex items-center justify-center relative
                        ${SHAPES[shape] || 'rounded-full'}
                        ${isSelected ? 'border-boda-green ring-4 ring-boda-green/20' : 'border-gray-200'}
                        ${isDragging ? 'shadow-2xl' : ''}
                    `}>
                        <div className="text-center pointer-events-none p-2 animate-fade-in">
                            <span className="block font-serif font-bold text-boda-text text-sm leading-tight">{name}</span>
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">{guests.length}/{seats}</span>
                        </div>
                    </div>

                    {/* CHAIRS */}
                    {Array.from({ length: seats }).map((_, i) => {
                        const guest = guests.find(g => g.seatIndex === i);
                        const pos = getChairPosition(i, seats);

                        // Chair color based on RSVP status
                        const chairStyle = guest
                            ? guest.confirmado === true
                                ? 'bg-blue-500 text-white border-blue-500 scale-110 z-20'    // Confirmed → blue
                                : guest.confirmado === false
                                    ? 'bg-red-500 text-white border-red-500 scale-110 z-20'  // Declined → red
                                    : 'bg-gray-400 text-white border-gray-400 scale-110 z-20'// No response → gray
                            : 'bg-white border-gray-200 text-gray-200 scale-90 z-10';         // Empty seat

                        const chairTitle = guest
                            ? `Silla ${i + 1}: ${guest.nombre} — ${guest.confirmado === true ? '✅ Confirmado' : guest.confirmado === false ? '❌ No viene' : '⏳ Sin respuesta'}`
                            : `Silla ${i + 1}: Vacía`;

                        return (
                            <div
                                key={i}
                                className={`absolute w-10 h-10 rounded-full shadow-sm flex items-center justify-center transition-all border ${chairStyle}`}
                                style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
                                title={chairTitle}
                            >
                                {guest ? (
                                    <span className="text-xs font-bold leading-none">{guest.nombre.substring(0, 2).toUpperCase()}</span>
                                ) : (
                                    <span className="text-[10px] opacity-50">{i + 1}</span>
                                )}
                            </div>
                        );
                    })}

                </div>
            </div>
        </Draggable>
    );
}
