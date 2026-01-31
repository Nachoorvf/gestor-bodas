
export default function AdminStatsCard({ title, value, icon, color = "bg-gray-50" }) {
    return (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-5 transition hover:shadow-md">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${color}`}>
                {icon}
            </div>
            <div>
                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">{title}</p>
                <p className="text-3xl font-black text-boda-text">{value}</p>
            </div>
        </div>
    );
}
