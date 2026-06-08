import Link from 'next/link';

export default function AdminUsersTable({ users, requests = [], onDelete, onEdit, onResetPassword, onImpersonate }) {

    const getUserStatus = (user) => {
        if (user.status === 'suspended') return { label: 'Suspendida', color: 'bg-red-100 text-red-700 border-red-200' };
        if (user.weddingId) return { label: 'Activa', color: 'bg-green-100 text-green-700 border-green-200' };
        // Check if there is a pending request for this user (assuming requests have userId or userEmail)
        // Adjust property lookup based on your request object structure (usually userId or userEmail)
        const hasRequest = requests.find(r => r.userId === user.id || r.userEmail === user.email);
        if (hasRequest) return { label: 'Solicitud Pendiente', color: 'bg-orange-100 text-orange-700 border-orange-200 animate-pulse' };

        return { label: 'Sin Boda', color: 'bg-gray-100 text-gray-400' };
    };

    return (

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

            {/* DESKTOP TABLE */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50/50 border-b border-gray-100">
                        <tr>
                            <th className="p-8 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Usuario</th>
                            <th className="p-8 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Rol</th>
                            <th className="p-8 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Boda Vinculada</th>
                            <th className="p-8 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Estado</th>
                            <th className="p-8 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {users.map(u => {
                            const status = getUserStatus(u);
                            return (
                                <tr key={u.id} className="hover:bg-gray-50/50 transition duration-200 group">
                                    <td className="p-8">
                                        <div className="flex items-center gap-5">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-serif italic ${u.role === 'admin' ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'}`}>
                                                {(u.displayName && u.displayName[0]) ? u.displayName[0].toUpperCase() : (u.email && u.email[0]) ? u.email[0].toUpperCase() : '?'}
                                            </div>
                                            <div>
                                                <div className="font-serif text-lg text-boda-text group-hover:text-black transition-colors">{u.displayName || 'Sin Nombre'}</div>
                                                <div className="text-xs text-gray-400 font-light tracking-wide">{u.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-8">
                                        {u.role === 'admin' ? (
                                            <span className="text-[10px] font-bold px-3 py-1 bg-black text-white uppercase tracking-widest rounded-full">Admin</span>
                                        ) : (
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">User</span>
                                        )}
                                    </td>
                                    <td className="p-8">
                                        {u.weddingId ? (
                                            <Link href={`/admin/boda/${u.weddingId}`} className="text-sm font-serif italic text-boda-accent hover:border-b hover:border-boda-accent transition-all pb-0.5">
                                                Ver Boda
                                            </Link>
                                        ) : (
                                            <span className="text-xs text-gray-300">--</span>
                                        )}
                                    </td>
                                    <td className="p-8">
                                        <span className={`text-[10px] font-bold px-3 py-1 uppercase tracking-widest border ${status.color.replace('bg-', 'bg-transparent text-').replace('text-wh', 'text-gr')}`}>
                                            {status.label}
                                        </span>
                                    </td>
                                    <td className="p-8 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {u.weddingId && (
                                                <button
                                                    onClick={() => onImpersonate(u.weddingId)}
                                                    className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                                                    title="Dar Soporte (Entrar como Usuario)"
                                                >
                                                    👁️
                                                </button>
                                            )}
                                            <button
                                                onClick={() => onResetPassword(u.email)}
                                                className="p-2 text-gray-400 hover:text-orange-500 transition-colors"
                                                title="Enviar Email Reset Contraseña"
                                            >
                                                📧
                                            </button>
                                            <button
                                                onClick={() => onEdit(u)}
                                                className="p-2 text-gray-400 hover:text-black transition-colors"
                                                title="Editar Usuario"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                onClick={() => onDelete(u)}
                                                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                                title="Eliminar Usuario"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* MOBILE LIST */}
            <div className="md:hidden flex flex-col divide-y divide-gray-50">
                {users.map(u => {
                    const status = getUserStatus(u);
                    return (
                        <div key={u.id} className="p-6 space-y-4">
                            {/* Header: Avatar + Name */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-serif italic ${u.role === 'admin' ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'}`}>
                                        {(u.displayName && u.displayName[0]) ? u.displayName[0].toUpperCase() : (u.email && u.email[0]) ? u.email[0].toUpperCase() : '?'}
                                    </div>
                                    <div>
                                        <div className="font-serif text-lg text-boda-text">{u.displayName || 'Sin Nombre'}</div>
                                        <div className="text-xs text-gray-400 font-light tracking-wide">{u.email}</div>
                                    </div>
                                </div>
                                {u.role === 'admin' && <span className="text-[9px] font-bold px-2 py-0.5 bg-black text-white uppercase tracking-widest rounded-full">Admin</span>}
                            </div>

                            {/* Details Row */}
                            <div className="flex items-center gap-4 text-sm">
                                <div className="flex-1">
                                    <span className="text-[10px] font-bold text-gray-300 uppercase block mb-1">Boda</span>
                                    {u.weddingId ? (
                                        <Link href={`/admin/boda/${u.weddingId}`} className="text-boda-accent font-serif italic">
                                            Ver Boda →
                                        </Link>
                                    ) : (
                                        <span className="text-gray-300">--</span>
                                    )}
                                </div>
                                <div>
                                    <span className={`text-[9px] font-bold px-2 py-1 uppercase tracking-widest border ${status.color.replace('bg-', 'bg-transparent text-').replace('text-wh', 'text-gr')}`}>
                                        {status.label}
                                    </span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-wrap items-center justify-end gap-4 pt-2">
                                {u.weddingId && (
                                    <button
                                        onClick={() => onImpersonate(u.weddingId)}
                                        className="flex items-center gap-2 text-[10px] font-bold text-blue-400 uppercase tracking-widest hover:text-blue-600 transition-colors"
                                    >
                                        <span>👁️ Entrar</span>
                                    </button>
                                )}
                                <button
                                    onClick={() => onResetPassword(u.email)}
                                    className="flex items-center gap-2 text-[10px] font-bold text-orange-400 uppercase tracking-widest hover:text-orange-600 transition-colors"
                                >
                                    <span>📧 Reset Pass</span>
                                </button>
                                <button
                                    onClick={() => onEdit(u)}
                                    className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-black transition-colors"
                                >
                                    <span>✏️ Editar</span>
                                </button>
                                <button
                                    onClick={() => onDelete(u)}
                                    className="flex items-center gap-2 text-[10px] font-bold text-red-300 uppercase tracking-widest hover:text-red-500 transition-colors"
                                >
                                    <span>✕ Eliminar</span>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

        </div>
    );
}
