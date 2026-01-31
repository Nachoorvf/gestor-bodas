'use client';

import { useState } from 'react';
import Link from 'next/link';
import Button from '../ui/Button';

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <nav className="fixed w-full z-50 bg-white/90 backdrop-blur-sm border-b border-boda-green/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-20 items-center">

                    {/* Logo */}
                    <div className="flex-shrink-0 flex items-center">
                        <Link href="/" className="font-script text-3xl text-boda-text group hover:text-boda-accent transition-colors">
                            El Convite
                        </Link>
                    </div>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center space-x-8">
                        <Link href="#features" className="text-boda-text hover:text-boda-green transition-colors">
                            Características
                        </Link>
                        <Link href="#testimonials" className="text-boda-text hover:text-boda-green transition-colors">
                            Testimonios
                        </Link>
                        <div className="flex items-center gap-2 ml-4">
                            <Link href="/login" className="text-boda-text hover:text-boda-green text-sm font-medium">
                                Iniciar Sesión
                            </Link>
                            <Button href="/signup" variant="primary" className="px-6 py-2 text-sm">
                                Registrarse
                            </Button>
                        </div>
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden flex items-center">
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="text-boda-text hover:text-boda-green focus:outline-none"
                        >
                            <span className="sr-only">Abrir menú</span>
                            {!isOpen ? (
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            ) : (
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isOpen && (
                <div className="md:hidden bg-white border-b border-gray-100">
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                        <Link
                            href="#features"
                            className="block px-3 py-2 rounded-md text-base font-medium text-boda-text hover:text-boda-green hover:bg-gray-50"
                            onClick={() => setIsOpen(false)}
                        >
                            Características
                        </Link>
                        <Link
                            href="#testimonials"
                            className="block px-3 py-2 rounded-md text-base font-medium text-boda-text hover:text-boda-green hover:bg-gray-50"
                            onClick={() => setIsOpen(false)}
                        >
                            Testimonios
                        </Link>
                        <div className="pt-4">
                            <Button href="/login" variant="primary" className="w-full justify-center">
                                Iniciar Sesión
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
}
