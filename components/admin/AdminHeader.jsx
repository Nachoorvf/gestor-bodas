import Button from '../ui/Button';

export default function AdminHeader({ user, onLogout }) {
    return (
        <div className="flex flex-col md:flex-row justify-between items-center bg-boda-text text-white p-8 rounded-3xl shadow-2xl relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

            <div className="relative z-10 text-center md:text-left mb-6 md:mb-0">
                <h1 className="text-3xl font-serif font-bold mb-2">Panel de Control <span className="text-boda-accent">.</span></h1>
                <p className="text-gray-400 text-sm">Super Admin Dashboard</p>
            </div>

            <div className="relative z-10 flex gap-4">
                <Button variant="secondary" onClick={() => window.open('/dashboard', '_blank')} className="text-xs">
                    Ir a mi Boda
                </Button>
                <button
                    onClick={onLogout}
                    className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition backdrop-blur-md"
                >
                    Cerrar Sesión
                </button>
            </div>
        </div>
    );
}
