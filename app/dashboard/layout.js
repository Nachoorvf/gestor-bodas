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
    const [scrolled, setScrolled] = useState(false);
    const { userData, stopImpersonation } = useAuth();
    const isAdmin = userData?.role === 'admin';
    const isImpersonating = userData?.isImpersonating;
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

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
        <div className="min-h-screen bg-apple-bg print:bg-white font-body selection:bg-apple-text/20 selection:text-apple-text pb-20 md:pb-0">
            
            {/* TOP NAVIGATION BAR - Full Width Liquid Glass */}
            <header className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 print:hidden ${scrolled ? 'bg-white/60 backdrop-blur-3xl saturate-[1.8] border-b border-black/5 shadow-sm' : 'bg-transparent'}`}>
                <div className="max-w-7xl mx-auto px-6 md:px-8 h-16 md:h-20 flex items-center justify-between">
                    
                    {/* 1. LOGO */}
                    <div className="flex-shrink-0 group cursor-pointer mr-8">
                        <Link href="/dashboard" className="flex items-center group">
                            <span className="font-script text-2xl text-apple-text font-medium group-hover:opacity-60 transition-opacity">
                                El Convite
                            </span>
                        </Link>
                    </div>

                    {/* 2. DESKTOP NAVIGATION */}
                    <nav className="hidden md:flex items-center gap-1 lg:gap-2 flex-1">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`px-4 py-2 text-sm transition-all duration-300 rounded-full
                                        ${isActive ? 'font-medium text-apple-text bg-black/5' : 'text-apple-text-secondary hover:text-apple-text hover:bg-black/5'}`
                                    }
                                >
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* 3. ACTIONS & MOBILE TOGGLE */}
                    <div className="flex items-center gap-4">
                        {isAdmin && !isImpersonating && (
                            <button
                                onClick={() => router.push('/admin')}
                                className="hidden md:flex items-center justify-center px-4 py-1.5 text-xs font-medium text-white bg-apple-text rounded-full hover:bg-black transition-colors"
                            >
                                Admin
                            </button>
                        )}

                        <button
                            onClick={handleLogout}
                            className="hidden md:flex text-sm font-medium text-apple-text-secondary hover:text-apple-text transition-colors"
                        >
                            Salir
                        </button>

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="md:hidden text-apple-text p-2 hover:bg-black/5 rounded-full transition-colors relative z-50"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}></path></svg>
                        </button>
                    </div>
                </div>

                {/* MOBILE MENU DROPDOWN - Apple Style Frost Overlay */}
                <div className={`fixed inset-0 top-0 left-0 w-full h-[100dvh] bg-white/70 backdrop-blur-3xl saturate-[1.8] z-40 transition-opacity duration-300 md:hidden flex flex-col pt-24 px-8
                    ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                    <nav className="flex flex-col space-y-6">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`text-2xl font-medium border-b border-black/5 pb-4 transition-colors
                                    ${pathname === item.href ? 'text-apple-text' : 'text-apple-text-secondary hover:text-apple-text'
                                    }`}
                            >
                                {item.name}
                            </Link>
                        ))}
                        
                        <div className="pt-8 flex flex-col gap-6">
                            {isAdmin && (
                                <Link href="/admin" onClick={() => setIsMobileMenuOpen(false)} className="text-xl font-medium text-apple-text">
                                    Panel de Admin
                                </Link>
                            )}
                            <button onClick={handleLogout} className="text-xl font-medium text-red-500 text-left">
                                Cerrar Sesión
                            </button>
                        </div>
                    </nav>
                </div>
            </header>

            {/* IMPERSONATION BANNER */}
            {isImpersonating && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-fade-in-up">
                    <div className="bg-white/80 backdrop-blur-xl saturate-150 px-6 py-3 rounded-full shadow-apple-lg flex items-center gap-4 border border-black/5">
                        <span className="text-sm font-medium flex items-center gap-2 text-apple-text">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                            Modo Novios
                        </span>
                        <button
                            onClick={stopImpersonation}
                            className="text-sm font-medium text-red-500 hover:text-red-600 transition-colors ml-2"
                        >
                            Salir
                        </button>
                    </div>
                </div>
            )}

            {/* MAIN CONTENT */}
            <main className="pt-28 md:pt-36 pb-16 px-4 md:px-8 max-w-7xl mx-auto min-h-screen relative z-10 print:p-0 print:m-0 print:min-h-0">
                {children}
            </main>
        </div>
    );
}
