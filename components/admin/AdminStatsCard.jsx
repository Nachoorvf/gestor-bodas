
export default function AdminStatsCard({ title, value, subtitle, icon, color = "bg-gray-50" }) {
    return (
        <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between relative overflow-hidden group hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <span className="text-6xl grayscale">{icon}</span>
            </div>

            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.2em] relative z-10 mb-2">{title}</p>
            <div className="relative z-10 group-hover:translate-x-1 transition-transform">
                <p className="text-3xl md:text-4xl font-serif text-boda-text">{value}</p>
                {subtitle && <p className="text-[10px] text-green-600 font-bold mt-1 uppercase tracking-wider">{subtitle}</p>}
            </div>
        </div>
    );
}
