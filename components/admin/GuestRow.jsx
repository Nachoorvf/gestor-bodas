
function GuestRow({ guest, onClick, waAction }) {
    const initials = guest.nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    return (
        <div onClick={onClick} className="p-4 hover:bg-gray-50 transition-colors cursor-pointer flex items-center gap-4 group">
            {/* Avatar */}
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${guest.confirmado === true ? 'bg-green-100 text-green-700' :
                guest.confirmado === false ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-500'
                }`}>
                {initials}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="font-bold text-boda-text truncate">{guest.nombre}</p>
                    <span className={`w-2 h-2 rounded-full ${guest.confirmado === true ? 'bg-green-500' :
                        guest.confirmado === false ? 'bg-red-500' : 'bg-gray-300'
                        }`}></span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span className="truncate">{guest.telefono || 'Sin teléfono'}</span>
                    {guest.group && (
                        <span className="px-1.5 py-0.5 rounded-md bg-gray-100 font-bold uppercase text-[10px] tracking-wide text-gray-500">
                            {guest.group}
                        </span>
                    )}
                </div>
            </div>

            {/* Badges */}
            <div className="hidden sm:flex items-center gap-2">
                {guest.bus && (
                    <span className="px-2 py-1 bg-purple-50 text-purple-600 rounded-md text-[10px] font-bold uppercase tracking-wide">
                        Bus
                    </span>
                )}
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${guest.confirmado === true ? 'bg-green-50 text-green-700' :
                    guest.confirmado === false ? 'bg-red-50 text-red-700' :
                        'bg-gray-100 text-gray-500'
                    }`}>
                    {guest.confirmado === true ? 'Confirmado' : guest.confirmado === false ? 'No asiste' : 'Pendiente'}
                </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={(e) => { e.stopPropagation(); waAction(e); }}
                    className="w-8 h-8 rounded-full bg-green-50 text-green-600 flex items-center justify-center hover:bg-green-100 transition"
                    title="Enviar WhatsApp"
                >
                    💬
                </button>
                <span className="text-gray-300">›</span>
            </div>
        </div>
    );
}
export default GuestRow;
