import React from 'react';

const SHAPES = {
    round: 'rounded-full',
    square: 'rounded-xl',
    presidential: 'rounded-2xl', // Long rectangle
    rectangular: 'rounded-lg' // Standard rectangle
};

export default function VisualTable({ table, guests = [], isDragging, isSelected, scale = 1, onInteraction }) {
    const { shape = 'round', seats = 10, width, height, name } = table;

    // Calculate chair positions based on shape
    const getChairPosition = (index, totalSeats) => {
        // 1. ROUND TABLE
        if (shape === 'round') {
            const angle = (index / totalSeats) * 2 * Math.PI - Math.PI / 2; // Start at top (-90deg)
            const radius = (width / 2) + 25; // 25px offset for chair
            return {
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius,
                rotation: angle + Math.PI / 2 // Points to center
            };
        }

        // 2. PRESIDENTIAL / RECTANGULAR (Simple distribution: Top and Bottom)
        if (shape === 'presidential' || shape === 'rectangular') {
            const sideSeats = Math.ceil(totalSeats / 2);
            const isTop = index < sideSeats;
            const colIndex = isTop ? index : index - sideSeats;

            // Distribute along width
            const spacing = width / (sideSeats + 1);
            const x = (colIndex + 1) * spacing - (width / 2);
            const y = isTop ? -(height / 2) - 25 : (height / 2) + 25;

            return { x, y, rotation: 0 };
        }

        // 3. SQUARE (Distributed on 4 sides) - Simplified to just circle-ish for now to save time or perimeter logic
        // Fallback to round logic for now if square math gets complex, but let's try simple perimeter.
        // ... For MVP let's stick to Round logic for Square but with square visual table.
        const angle = (index / totalSeats) * 2 * Math.PI - Math.PI / 2;
        const radius = (width / 2) + 25;
        return {
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius,
            rotation: 0
        };
    };

    return (
        <div
            className={`absolute flex flex-col items-center justify-center transition-all duration-200 cursor-move group
        ${isDragging ? 'z-50 scale-105 opacity-90' : 'z-10'}
      `}
            style={{
                width: width,
                height: height,
                transform: `translate(${table.position.x}px, ${table.position.y}px)`,
            }}
            onMouseDown={(e) => onInteraction(e, 'mousedown')}
            onTouchStart={(e) => onInteraction(e, 'touchstart')}
        >
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
                const guest = guests[i]; // Slot i
                const pos = getChairPosition(i, seats);

                return (
                    <div
                        key={i}
                        className={`absolute w-10 h-10 rounded-full shadow-sm flex items-center justify-center transition-all border
                ${guest
                                ? 'bg-boda-green text-white border-boda-green scale-110 z-20'
                                : 'bg-white border-gray-200 text-gray-200 scale-90 z-10'
                            }
            `}
                        style={{
                            transform: `translate(${pos.x}px, ${pos.y}px)`,
                        }}
                        title={guest ? guest.nombre : 'Vacío'}
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
    );
}
