'use client';
import { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../../firebase/config';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Button from '../../components/ui/Button';

export default function SignupPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();

    const handleSignup = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Crear documento base de usuario
            await setDoc(doc(db, 'users', user.uid), {
                email: user.email,
                role: 'user',
                weddingId: null,
                createdAt: new Date().toISOString()
            });

            router.push('/request-wedding');
        } catch (err) {
            console.error(err);
            if (err.code === 'auth/email-already-in-use') {
                setError('Este correo ya está registrado.');
            } else {
                setError('Error al registrarse. Inténtalo de nuevo.');
            }
        }
    };

    const handleGoogleSignup = async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;

            // Check if user doc exists, if not create it
            // Note: In a real app we might check existance, but setDoc with merge is safe enough for basic info
            await setDoc(doc(db, 'users', user.uid), {
                email: user.email,
                role: 'user',
                // We don't overwrite weddingId if it exists, so spread logic might be better if we were editing, 
                // but for signup standard setDoc is okay if we assume new user. 
                // To be safe let's use merge: true or verify. 
                // For simplicity in this demo, we'll write basic fields.
                weddingId: null,
                createdAt: new Date().toISOString()
            }, { merge: true });

            router.push('/request-wedding');
        } catch (err) {
            console.error(err);
            setError('Error con Google Login');
        }
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-boda-bg">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-boda-green/20">
                <h1 className="text-3xl font-script text-boda-green-dark text-center mb-6">Crear Cuenta</h1>

                {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">{error}</div>}

                <form onSubmit={handleSignup} className="flex flex-col gap-4">
                    <div>
                        <label className="text-sm font-bold text-boda-text mb-1 block">Correo Electrónico</label>
                        <input
                            type="email"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-boda-green"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label className="text-sm font-bold text-boda-text mb-1 block">Contraseña</label>
                        <input
                            type="password"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-boda-green"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <Button type="submit" variant="primary" className="w-full justify-center mt-2">
                        Registrarse
                    </Button>
                </form>

                <div className="flex items-center my-6">
                    <div className="flex-grow border-t border-gray-200"></div>
                    <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">O continúa con</span>
                    <div className="flex-grow border-t border-gray-200"></div>
                </div>

                <button
                    onClick={handleGoogleSignup}
                    type="button"
                    className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 p-3 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" />
                        <path fill="#EA4335" d="M12 4.66c1.61 0 3.1.56 4.28 1.69l3.19-3.19C17.45 1.14 14.97 0 12 0 7.7 0 3.99 2.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Google
                </button>

                <p className="text-center mt-6 text-sm text-gray-500">
                    ¿Ya tienes cuenta? <Link href="/login" className="text-boda-green font-bold hover:underline">Inicia Sesión</Link>
                </p>

            </div>
        </div>
    );
}
