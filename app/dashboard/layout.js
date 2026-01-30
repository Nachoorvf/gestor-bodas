'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase/config';
import { useRouter } from 'next/navigation';

export default function DashboardLayout({ children }) {
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = async () => {
        await signOut(auth);
        router.push('/');
    };

    const navItems = [
        { name: 'Resumen', href: '/dashboard', icon: '🏠' },
        { name: 'Invitados', href: '/dashboard/invitados', icon: '✉️' },
        { name: 'Diseño Invitación', href: '/dashboard/configuracion-invitacion', icon: '🎨' },
        { name: 'Autobús', href: '/dashboard/bus', icon: '🚌' },
        { name: 'Presupuesto', href: '/dashboard/presupuesto', icon: '💰' },
        { name: 'Mesas', href: '/dashboard/mesas', icon: '🍽️' },
    ];

    return (
        <div className="flex h-screen bg-boda-bg overflow-hidden">

            {/* SIDEBAR DESKTOP */}
            <aside className="hidden md:flex md:flex-col w-64 bg-white border-r border-gray-100 shadow-sm z-10">
                <div className="flex items-center justify-center h-20 border-b border-gray-100">
                    <Link href="/dashboard" className="font-script text-3xl text-boda-green-dark">Gestor Bodas</Link>
                </div>
                <nav className="flex-1 px-4 py-6 space-y-2">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${isActive
                                    ? 'bg-boda-green text-white shadow-md shadow-boda-green/20'
                                    : 'text-boda-text hover:bg-gray-50'
                                    }`}
                            >
                                <span>{item.icon}</span>
                                <span>{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>
                <div className="p-4 border-t border-gray-100">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 w-full text-boda-text-light hover:text-red-500 hover:bg-red-50 rounded-xl transition-all font-medium text-sm"
                    >
                        <span>🚪</span>
                        <span>Cerrar Sesión</span>
                    </button>
                </div>
            </aside>

            {/* MOBILE HEADER */}
            <div className="md:hidden fixed top-0 w-full h-16 bg-white border-b border-gray-100 z-50 flex items-center justify-between px-4">
                <span className="font-script text-2xl text-boda-green-dark">Gestor Bodas</span>
                <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="text-boda-text">
                    {isSidebarOpen ? '✖' : '☰'}
                </button>
            </div>

            {/* MOBILE SIDEBAR */}
            {isSidebarOpen && (
                <div className="md:hidden fixed inset-0 bg-boda-bg z-40 pt-20 px-4 animate-fade-in-up">
                    <nav className="space-y-2">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setSidebarOpen(false)}
                                className={`flex items-center gap-3 px-4 py-4 rounded-xl text-lg font-medium border border-gray-100 bg-white ${pathname === item.href ? 'border-boda-green text-boda-green' : 'text-boda-text'
                                    }`}
                            >
                                <span>{item.icon}</span>
                                <span>{item.name}</span>
                            </Link>
                        ))}
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 px-4 py-4 w-full text-red-500 bg-white border border-red-100 rounded-xl mt-4 font-bold"
                        >
                            <span>🚪</span>
                            <span>Cerrar Sesión</span>
                        </button>
                    </nav>
                </div>
            )}

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 overflow-y-auto pt-16 md:pt-0">
                <div className="max-w-7xl mx-auto p-4 md:p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
