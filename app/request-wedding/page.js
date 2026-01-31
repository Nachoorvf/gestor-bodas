'use client';
import { useState, useEffect } from 'react';
import { addDoc, collection, doc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';
import { useRouter } from 'next/navigation';
import Button from '../../components/ui/Button';

export default function RequestWeddingPage() {
    const [formData, setFormData] = useState({
        nombre1: '',
        nombre2: '',
        fecha: ''
    });
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('initial'); // initial, loading, success, error
    const router = useRouter();
    const [user, setUser] = useState(null);

    useEffect(() => {
        const unsub = auth.onAuthStateChanged(async (currentUser) => {
            if (!currentUser) {
                router.push('/login');
            } else {
                setUser(currentUser);
                const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
                if (userDoc.exists() && userDoc.data().weddingId) {
                    router.push('/dashboard');
                    return;
                }

                const q = query(
                    collection(db, 'wedding_requests'),
                    where('userId', '==', currentUser.uid),
                    where('status', '==', 'pending')
                );
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    setStatus('success');
                }
            }
        });
        return () => unsub();
    }, [router]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            await addDoc(collection(db, 'wedding_requests'), {
                userId: user.uid,
                userEmail: user.email,
                novios: [formData.nombre1, formData.nombre2],
                fecha: formData.fecha,
                status: 'pending',
                createdAt: new Date().toISOString()
            });
            setStatus('success');
        } catch (error) {
            console.error(error);
            setStatus('error');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    if (status === 'success') {
        return (
            <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6">
                <div className="w-full max-w-md bg-white p-12 shadow-2xl shadow-gray-200/50 border border-gray-100 flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                        <span className="text-4xl">✨</span>
                    </div>
                    <h1 className="font-script text-4xl text-boda-text mb-4">Solicitud Recibida</h1>
                    <div className="h-px w-12 bg-boda-accent mx-auto mb-6"></div>
                    <p className="text-gray-500 mb-10 font-light leading-relaxed">
                        Su petición ha sido registrada. Nuestro equipo de concierges revisará los detalles y habilitará su espacio exclusivo en breve.
                    </p>
                    <button onClick={() => router.push('/')} className="px-8 py-3 bg-transparent text-boda-text border border-gray-300 font-bold text-xs uppercase tracking-widest hover:border-boda-text hover:bg-gray-50 transition-all">
                        Volver al Inicio
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6">
            <div className="w-full max-w-lg bg-white p-10 md:p-12 shadow-2xl shadow-gray-200/50 border border-gray-100 flex flex-col">
                <div className="text-center mb-10">
                    <h1 className="font-script text-4xl md:text-5xl text-boda-text mb-4">Diseñe su Boda</h1>
                    <p className="text-gray-400 text-sm uppercase tracking-widest font-bold">Detalles Preliminares</p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-8">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Su Nombre</label>
                            <input
                                name="nombre1"
                                type="text"
                                placeholder="Ej: Ana"
                                className="w-full border-b border-gray-200 py-2 text-boda-text focus:outline-none focus:border-boda-accent transition-colors bg-transparent placeholder-gray-300 font-serif"
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Su Pareja</label>
                            <input
                                name="nombre2"
                                type="text"
                                placeholder="Ej: Carlos"
                                className="w-full border-b border-gray-200 py-2 text-boda-text focus:outline-none focus:border-boda-accent transition-colors bg-transparent placeholder-gray-300 font-serif"
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Fecha del Evento</label>
                        <input
                            name="fecha"
                            type="date"
                            className="w-full border-b border-gray-200 py-2 text-boda-text focus:outline-none focus:border-boda-accent transition-colors bg-transparent text-gray-600 font-serif"
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <button type="submit" className="mt-6 bg-boda-text text-white py-4 w-full font-bold text-xs uppercase tracking-widest hover:bg-black transition-all duration-500 shadow-lg hover:shadow-xl disabled:opacity-50" disabled={loading}>
                        {loading ? 'Procesando...' : 'Solicitar Espacio'}
                    </button>

                    <p className="text-center text-[10px] text-gray-300 mt-4 leading-relaxed">
                        Al continuar, acepta nuestros términos de servicio exclusivos y política de privacidad.
                    </p>
                </form>
            </div>
        </div>
    );
}
