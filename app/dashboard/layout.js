'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase/config';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';

export default function DashboardLayout({ children }) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { user, userData, loading: authLoading, stopImpersonation } = useAuth();
    const isAdmin = userData?.role === 'admin';
    const isImpersonating = userData?.isImpersonating;
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        if (authLoading) return;
        
        // 1. Unauthenticated users go to login
        if (!user) {
            router.push('/login');
            return;
        }

        // 2. Authenticated users without a wedding (and not admin) go to lobby
        if (userData !== null && userData?.role !== 'admin' && !userData?.weddingId) {
            router.push('/request-wedding');
        }
    }, [user, userData, authLoading, router]);

    const handleLogout = async () => {
        await signOut(auth);
        router.push('/');
    };

    const navItems = [
        { name: 'Resumen', href: '/dashboard' },
        { name: 'Invitados', href: '/dashboard/invitados' },
        { name: 'Mesas', href: '/dashboard/mesas' },
        { name: 'Presupuesto', href: '/dashboard/presupuesto' },
        { name: 'Autobús', href: '/dashboard/bus' },
        { name: 'Invitación', href: '/dashboard/configuracion-invitacion' },
        { name: 'Respuestas', href: '/dashboard/respuestas' },
    ];

    return (
        <div className="min-h-screen bg-boda-bg font-body selection:bg-boda-accent selection:text-white pb-20 md:pb-0">

            {/* TOP NAVIGATION BAR */}
            <header className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-xl border-b border-gray-100 transition-all duration-300">
                {/* Gold Top Accent */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-boda-accent to-transparent opacity-50"></div>

                <div className="max-w-7xl mx-auto px-6 md:px-12 h-24 flex items-center justify-between">

                    {/* 1. LOGO */}
                    <div className="flex-shrink-0 group cursor-pointer">
                        <Link href="/dashboard" className="flex flex-col items-center md:items-start group">
                            <span className="font-script text-3xl md:text-4xl text-boda-text tracking-wide group-hover:opacity-80 transition-opacity">
                                El Convite
                            </span>
                        </Link>
                    </div>

                    {/* 2. DESKTOP NAVIGATION */}
                    <nav className="hidden md:flex items-center gap-10">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`text-xs font-bold uppercase tracking-[0.15em] transition-all duration-300 relative py-2 
                                        ${isActive ? 'text-boda-text' : 'text-gray-400 hover:text-boda-text'}`
                                    }
                                >
                                    {item.name}
                                    {isActive && (
                                        <span className="absolute bottom-0 left-0 w-full h-px bg-boda-accent"></span>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* 3. ACTIONS & MOBILE TOGGLE */}
                    <div className="flex items-center gap-6">
                        {isAdmin && !isImpersonating && (
                            <button
                                onClick={() => router.push('/admin')}
                                className="hidden md:flex items-center gap-2 px-6 py-2.5 text-[10px] uppercase font-bold tracking-widest text-white bg-boda-text hover:bg-black transition-all shadow-lg hover:shadow-xl"
                            >
                                Admin Panel
                            </button>
                        )}

                        <button
                            onClick={handleLogout}
                            className="hidden md:flex text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-boda-error transition-colors border-b border-transparent hover:border-boda-error pb-0.5"
                        >
                            Cerrar Sesión
                        </button>

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="md:hidden text-boda-text p-2 hover:bg-gray-50 rounded-full transition"
                        >
                            <span className="text-2xl font-light">{isMobileMenuOpen ? '✕' : '☰'}</span>
                        </button>
                    </div>
                </div>

                {/* MOBILE MENU DROPDOWN */}
                {isMobileMenuOpen && (
                    <div className="md:hidden absolute top-24 left-0 w-full bg-white/95 backdrop-blur-xl border-b border-gray-100 p-8 shadow-2xl animate-fade-in-up h-screen">
                        <nav className="flex flex-col space-y-6 text-center">
                            {navItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`text-xl font-serif italic py-2 ${pathname === item.href ? 'text-boda-accent' : 'text-boda-text'
                                        }`}
                                >
                                    {item.name}
                                </Link>
                            ))}
                            <div className="w-12 h-px bg-gray-200 mx-auto my-4"></div>
                            {isAdmin && (
                                <Link href="/admin" className="text-xs font-bold uppercase tracking-widest text-boda-text">Ir a Admin</Link>
                            )}
                            <button onClick={handleLogout} className="text-xs font-bold uppercase tracking-widest text-red-400 mt-4">
                                Cerrar Sesión
                            </button>
                        </nav>
                    </div>
                )}
            </header>

            {/* IMPERSONATION BANNER — discreet bottom-left pill */}
            {isImpersonating && (
                <div className="fixed bottom-24 md:bottom-6 left-4 z-[100]">
                    <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md text-white pl-3 pr-1.5 py-1.5 rounded-full shadow-lg border border-white/10 opacity-60 hover:opacity-100 transition-opacity duration-300">
                        <span className="text-sm leading-none">👁️</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap hidden sm:inline">Modo Novios</span>
                        <button
                            onClick={stopImpersonation}
                            className="bg-white/20 hover:bg-white/30 text-white px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider transition"
                        >
                            Salir
                        </button>
                    </div>
                </div>
            )}

            {/* MAIN CONTENT */}
            <main className="pt-28 pb-12 px-4 md:px-8 max-w-7xl mx-auto min-h-screen animate-fade-in">
                {children}
            </main>
        </div>
    );
}
