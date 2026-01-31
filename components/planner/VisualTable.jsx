import React from 'react';
import Draggable from 'react-draggable';

const SHAPES = {
    round: 'rounded-full',
    square: 'rounded-xl',
    presidential: 'rounded-2xl', // Long rectangle
    rectangular: 'rounded-lg' // Standard rectangle
};

export default function VisualTable({ table, guests = [], isDragging, isSelected, isLayoutMode, scale = 1, onInteraction, onMoveEnd }) {
    const { shape = 'round', seats = 10, width, height, name } = table;
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
                onInteraction(e, 'mousedown'); // Select table on start
            }}
        // Ensure drag doesn't start if we are just clicking a guest or button inside (optional, but good practice)
        // cancel=".no-drag" 
        >
            <div
                ref={nodeRef}
                className={`absolute flex flex-col items-center justify-center transition-colors duration-200 group
            ${isDragging ? 'z-50 opacity-90' : 'z-10'}
            ${isLayoutMode ? 'cursor-move' : 'cursor-pointer'}
          `}
                style={{
                    width: width,
                    height: height,
                    // transform is handled by Draggable, but we need size
                }}
                // Event Handling for Click/Touch is mostly handled by Draggable's internals for movement,
                // but we still need to catch clicks for selection if not dragging.
                // React-Draggable doesn't block onClick if no drag occurred.
                onClick={(e) => {
                    e.stopPropagation();
                    // Always fire click interaction. React-Draggable prevents this if a drag occurred.
                    onInteraction(e, 'click');
                }}

                // Drop Zone Support
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
        </Draggable>
    );
}
