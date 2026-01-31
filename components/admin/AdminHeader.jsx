import Button from '../ui/Button';

export default function AdminHeader({ user, onLogout }) {
    return (
        <div className="flex flex-col md:flex-row justify-between items-center bg-[#333] text-white p-10 rounded-2xl shadow-2xl relative overflow-hidden group">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-[0.15] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] animate-none"></div>

            {/* Abstract Overlay */}
            <div className="absolute -right-20 -top-20 w-80 h-80 bg-boda-accent/10 rounded-full blur-[80px]"></div>

            <div className="relative z-10 text-center md:text-left mb-6 md:mb-0">
                <p className="text-boda-accent text-[10px] font-bold uppercase tracking-[0.3em] mb-3">Administración</p>
                <h1 className="text-4xl md:text-5xl font-script text-white leading-tight">Executive Panel</h1>
            </div>

            <div className="relative z-10 flex gap-4">
                <button
                    onClick={() => window.open('/dashboard', '_blank')}
                    className="px-6 py-3 border border-white/20 hover:border-white/50 text-white rounded-full text-[10px] font-bold uppercase tracking-widest transition backdrop-blur-sm"
                >
                    Ver Client App
                </button>
                <button
                    onClick={onLogout}
                    className="px-6 py-3 bg-boda-accent hover:bg-white hover:text-black text-black rounded-full text-[10px] font-bold uppercase tracking-widest transition-colors shadow-lg shadow-boda-accent/20"
                >
                    Cerrar Sesión
                </button>
            </div>
        </div>
    );
}
