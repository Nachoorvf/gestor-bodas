import Link from 'next/link';

export default function AdminUsersTable({ users, requests = [], onDelete, onEdit }) {

    const getUserStatus = (user) => {
        if (user.weddingId) return { label: 'Activa', color: 'bg-green-100 text-green-700 border-green-200' };
        // Check if there is a pending request for this user (assuming requests have userId or userEmail)
        // Adjust property lookup based on your request object structure (usually userId or userEmail)
        const hasRequest = requests.find(r => r.userId === user.id || r.userEmail === user.email);
        if (hasRequest) return { label: 'Solicitud Pendiente', color: 'bg-orange-100 text-orange-700 border-orange-200 animate-pulse' };

        return { label: 'Sin Boda', color: 'bg-gray-100 text-gray-400' };
    };

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-white border-b border-gray-100">
                        <tr>
                            <th className="p-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Usuario</th>
                            <th className="p-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Rol</th>
                            <th className="p-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Boda</th>
                            <th className="p-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Estado</th>
                            <th className="p-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {users.map(u => {
                            const status = getUserStatus(u);
                            return (
                                <tr key={u.id} className="hover:bg-gray-50 transition">
                                    <td className="p-6">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${u.role === 'admin' ? 'bg-boda-text text-white' : 'bg-gray-100 text-gray-500'}`}>
                                                {(u.displayName && u.displayName[0]) ? u.displayName[0].toUpperCase() : (u.email && u.email[0]) ? u.email[0].toUpperCase() : '?'}
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-800 text-sm">{u.displayName || 'Sin Nombre'}</div>
                                                <div className="text-xs text-gray-400">{u.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${u.role === 'admin' ? 'bg-purple-50 text-purple-600 border border-purple-100' : 'bg-gray-100 text-gray-500'}`}>
                                            {u.role || 'user'}
                                        </span>
                                    </td>
                                    <td className="p-6">
                                        {u.weddingId ? (
                                            <Link href={`/admin/boda/${u.weddingId}`} className="text-xs font-bold text-boda-accent hover:underline flex items-center gap-1">
                                                <span>🔗</span> {u.weddingId.substring(0, 8)}...
                                            </Link>
                                        ) : (
                                            <span className="text-xs text-gray-300 italic">--</span>
                                        )}
                                    </td>
                                    <td className="p-6">
                                        <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${status.color}`}>
                                            {status.label}
                                        </span>
                                    </td>
                                    <td className="p-6 text-right">
                                        <button
                                            onClick={() => onEdit(u)}
                                            className="text-boda-text hover:text-boda-text-light font-bold text-xs transition px-3 py-1 rounded hover:bg-gray-50 mr-2"
                                            title="Editar Usuario"
                                        >
                                            ✏️ Editar
                                        </button>
                                        <button
                                            onClick={() => onDelete(u)}
                                            className="text-red-300 hover:text-red-500 font-bold text-xs transition px-3 py-1 rounded hover:bg-red-50"
                                            title="Eliminar Usuario"
                                        >
                                            🗑️
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
