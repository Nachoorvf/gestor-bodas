import Link from 'next/link';

export default function AdminWeddingsTable({ weddings, onDelete, loading }) {
    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="p-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pareja / ID</th>
                            <th className="p-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fecha</th>
                            <th className="p-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {weddings.map(boda => (
                            <tr key={boda.id} className="hover:bg-gray-50/80 transition group">
                                <td className="p-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-boda-text text-white flex items-center justify-center font-serif font-bold text-sm">
                                            {boda.novios ? boda.novios[0][0] : '?'}
                                        </div>
                                        <div>
                                            <p className="font-bold text-boda-text font-serif">
                                                {boda.novios ? boda.novios.join(' & ') : 'Sin nombre'}
                                            </p>
                                            <p className="text-[10px] text-gray-400 font-mono mt-0.5 opacity-50 group-hover:opacity-100 transition">
                                                ID: {boda.id}
                                            </p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-6">
                                    <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold">
                                        {boda.fecha}
                                    </span>
                                </td>
                                <td className="p-6 text-right">
                                    <div className="flex justify-end gap-2">
                                        <Link
                                            href={`/admin/boda/${boda.id}`}
                                            className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-bold hover:bg-white hover:border-boda-accent hover:text-boda-accent transition hover:shadow-md"
                                        >
                                            Supervisar
                                        </Link>
                                        <button
                                            onClick={() => onDelete(boda.id, boda.adminId, boda.novios?.join(' & '))}
                                            disabled={loading}
                                            className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-400 rounded-full hover:bg-red-500 hover:text-white transition"
                                            title="Eliminar Boda"
                                        >
                                            ✖
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
