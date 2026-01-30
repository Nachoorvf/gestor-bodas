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
                // 1. Check if already has wedding
                const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
                if (userDoc.exists() && userDoc.data().weddingId) {
                    router.push('/dashboard');
                    return;
                }

                // 2. Check if has PENDING request
                const q = query(
                    collection(db, 'wedding_requests'),
                    where('userId', '==', currentUser.uid),
                    where('status', '==', 'pending')
                );
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    // Already has a pending request -> Show success/processing view
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
            <div className="min-h-screen bg-boda-bg flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md text-center">
                    <div className="w-16 h-16 bg-boda-green/20 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                        🎉
                    </div>
                    <h1 className="text-2xl font-bold text-boda-text mb-2">¡Solicitud Enviada!</h1>
                    <p className="text-gray-600 mb-6">
                        Hemos recibido los datos de tu boda. El administrador revisará tu solicitud y te avisará cuando tu espacio esté listo.
                    </p>
                    <Button href="/" variant="outline">Volver al Inicio</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-boda-bg flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-lg border-t-8 border-boda-pink">
                <h1 className="text-3xl font-script text-boda-pink-dark text-center mb-2">Crea tu Boda</h1>
                <p className="text-center text-gray-500 mb-8">Cuéntanos los detalles básicos para preparar tu espacio.</p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex gap-4">
                        <div className="w-1/2">
                            <label className="text-sm font-bold text-boda-text mb-1 block">Tu Nombre</label>
                            <input
                                name="nombre1"
                                type="text"
                                placeholder="Ej: Ana"
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-boda-pink"
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="w-1/2">
                            <label className="text-sm font-bold text-boda-text mb-1 block">Tu Pareja</label>
                            <input
                                name="nombre2"
                                type="text"
                                placeholder="Ej: Carlos"
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-boda-pink"
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-bold text-boda-text mb-1 block">Fecha de la Boda</label>
                        <input
                            name="fecha"
                            type="date"
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-boda-pink text-gray-600"
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <Button type="submit" variant="secondary" className="w-full justify-center mt-4" disabled={loading}>
                        {loading ? 'Enviando...' : 'Solicitar Espacio'}
                    </Button>
                </form>
            </div>
        </div>
    );
}
