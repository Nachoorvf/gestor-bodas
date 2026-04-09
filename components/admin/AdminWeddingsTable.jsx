import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { Eye, Trash2 } from 'lucide-react';

export default function AdminWeddingsTable({ weddings, onDelete, loading }) {
    const { impersonateWedding } = useAuth();

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            {/* DESKTOP TABLE */}
            <div className="hidden md:block overflow-x-auto">
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
                                            Gestión
                                        </Link>
                                        <button
                                            onClick={() => impersonateWedding(boda.id)}
                                            className="px-4 py-2 bg-boda-text text-white rounded-xl text-xs font-bold hover:bg-black transition shadow-md flex items-center gap-2"
                                            title="Entrar como Novios"
                                        >
                                            <Eye size={14} /> Entrar
                                        </button>
                                        <button
                                            onClick={() => onDelete(boda.id, boda.adminId, boda.novios?.join(' & '))}
                                            disabled={loading}
                                            className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-400 rounded-full hover:bg-red-500 hover:text-white transition"
                                            title="Eliminar Boda"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* MOBILE LIST */}
            <div className="md:hidden flex flex-col divide-y divide-gray-50">
                {weddings.map(boda => (
                    <div key={boda.id} className="p-6 space-y-4">
                        {/* Header: Avatar, Name, ID, Date */}
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 shrink-0 rounded-full bg-boda-text text-white flex items-center justify-center font-serif font-bold text-sm">
                                    {boda.novios ? boda.novios[0][0] : '?'}
                                </div>
                                <div>
                                    <p className="font-bold text-boda-text font-serif leading-tight">
                                        {boda.novios ? boda.novios.join(' & ') : 'Sin nombre'}
                                    </p>
                                    <p className="text-[10px] text-gray-400 font-mono mt-1 mb-1">
                                        ID: {boda.id}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Date Tag */}
                        <div>
                            <span className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wide uppercase">
                                📅 {boda.fecha}
                            </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-stretch justify-between gap-2 pt-4 mt-4 border-t border-gray-50">
                            <Link
                                href={`/admin/boda/${boda.id}`}
                                className="flex-1 flex items-center justify-center py-2.5 border border-gray-200 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-50 transition text-center"
                            >
                                Gestión
                            </Link>
                            <button
                                onClick={() => impersonateWedding(boda.id)}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-boda-text text-white rounded-xl text-xs font-bold hover:bg-black transition shadow-md"
                            >
                                <Eye size={14} /> Entrar
                            </button>
                            <button
                                onClick={() => onDelete(boda.id, boda.adminId, boda.novios?.join(' & '))}
                                disabled={loading}
                                className="shrink-0 w-12 flex items-center justify-center bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition"
                                title="Eliminar Boda"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
