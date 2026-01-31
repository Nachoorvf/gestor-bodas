'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase/config';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';

export default function DashboardLayout({ children }) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { userData } = useAuth();
    const isAdmin = userData?.role === 'admin';
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = async () => {
        await signOut(auth);
        router.push('/');
    };

    const navItems = [
        { name: 'Resumen', href: '/dashboard' },
        { name: 'Invitados', href: '/dashboard/invitados' },
        { name: 'Mesas', href: '/dashboard/mesas' },
        { name: 'Autobús', href: '/dashboard/bus' },
        { name: 'Presupuesto', href: '/dashboard/presupuesto' },
        { name: 'Invitación', href: '/dashboard/configuracion-invitacion' },
    ];

    return (
        <div className="min-h-screen bg-boda-bg font-body selection:bg-boda-accent selection:text-white">

            {/* TOP NAVIGATION BAR */}
            <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 transition-all duration-300">
                <div className="max-w-7xl mx-auto px-4 md:px-8 h-20 flex items-center justify-between">

                    {/* 1. LOGO */}
                    <div className="flex-shrink-0">
                        <Link href="/dashboard" className="font-script text-3xl text-boda-text tracking-wide hover:opacity-80 transition-opacity">
                            El Convite
                        </Link>
                    </div>

                    {/* 2. DESKTOP NAVIGATION */}
                    <nav className="hidden md:flex items-center gap-8">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`text-sm font-medium tracking-wide transition-colors duration-200 ${isActive
                                        ? 'text-boda-text border-b-2 border-boda-text pb-1'
                                        : 'text-gray-500 hover:text-boda-text'
                                        }`}
                                >
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* 3. ACTIONS & MOBILE TOGGLE */}
                    <div className="flex items-center gap-4">
                        {isAdmin && (
                            <button
                                onClick={() => router.push('/admin')}
                                className="hidden md:flex items-center gap-2 px-4 py-2 text-xs font-bold text-boda-text border border-gray-200 rounded-full hover:bg-gray-50 transition"
                            >
                                🛡️ Admin
                            </button>
                        )}

                        <button
                            onClick={handleLogout}
                            className="hidden md:flex text-xs font-bold text-gray-400 hover:text-red-500 transition"
                        >
                            Salir
                        </button>

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="md:hidden text-boda-text p-2"
                        >
                            <span className="text-2xl">{isMobileMenuOpen ? '✕' : '☰'}</span>
                        </button>
                    </div>
                </div>

                {/* MOBILE MENU DROPDOWN */}
                {isMobileMenuOpen && (
                    <div className="md:hidden absolute top-20 left-0 w-full bg-white border-b border-gray-100 p-4 shadow-xl animate-fade-in-up">
                        <nav className="flex flex-col space-y-4">
                            {navItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`text-lg font-medium px-4 py-2 rounded-lg ${pathname === item.href ? 'bg-gray-50 text-boda-text' : 'text-gray-500'
                                        }`}
                                >
                                    {item.name}
                                </Link>
                            ))}
                            <div className="border-t border-gray-100 my-2 pt-2"></div>
                            {isAdmin && (
                                <Link href="/admin" className="px-4 py-2 font-bold text-boda-text block">🛡️ Panel Admin</Link>
                            )}
                            <button onClick={handleLogout} className="px-4 py-2 font-bold text-red-500 block w-full text-left">
                                Cerrar Sesión
                            </button>
                        </nav>
                    </div>
                )}
            </header>

            {/* MAIN CONTENT */}
            <main className="pt-28 pb-12 px-4 md:px-8 max-w-7xl mx-auto min-h-screen animate-fade-in">
                {children}
            </main>
        </div>
    );
}
