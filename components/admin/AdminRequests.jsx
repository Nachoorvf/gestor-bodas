export default function AdminRequests({ requests, onApprove, onReject, loading }) {
    if (requests.length === 0) {
        return (
            <div className="bg-white p-12 rounded-3xl border border-dashed border-gray-200 text-center">
                <p className="text-gray-400 font-bold">No hay solicitudes pendientes 🌴</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {requests.map(req => (
                <div key={req.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-lg transition">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-boda-accent"></div>

                    <div className="mb-4">
                        <span className="text-[10px] font-bold text-boda-accent bg-boda-accent/10 px-2 py-1 rounded-full uppercase tracking-wider">
                            Pendiente
                        </span>
                    </div>

                    <h3 className="font-serif font-bold text-xl text-boda-text mb-1">
                        {req.novios.join(' & ')}
                    </h3>
                    <p className="text-sm text-gray-500 font-medium mb-4">📅 {req.fecha}</p>

                    <div className="bg-gray-50 p-3 rounded-xl mb-6">
                        <p className="text-xs text-gray-400 font-bold uppercase mb-1">Solicitante</p>
                        <p className="text-sm text-gray-700 truncate">{req.userEmail}</p>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => onApprove(req)}
                            disabled={loading}
                            className="flex-1 bg-boda-text text-white py-3 rounded-xl text-xs font-bold hover:bg-black transition shadow-lg shadow-gray-200 disabled:opacity-50"
                        >
                            Aprobar Boda
                        </button>
                        <button
                            onClick={() => onReject(req.id)}
                            disabled={loading}
                            className="px-4 py-3 bg-red-50 text-red-500 rounded-xl text-xs font-bold hover:bg-red-100 transition disabled:opacity-50"
                        >
                            Rechazar
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
