
export default function AdminStatsCard({ title, value, icon, color = "bg-gray-50" }) {
    return (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between h-32 relative overflow-hidden group hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <span className="text-6xl grayscale">{icon}</span>
            </div>

            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.2em] relative z-10">{title}</p>
            <p className="text-4xl font-serif text-boda-text relative z-10 group-hover:translate-x-1 transition-transform">{value}</p>
        </div>
    );
}
