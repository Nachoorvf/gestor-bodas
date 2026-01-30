'use client';
import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [inputIdentifier, setInputIdentifier] = useState(''); // Puede ser email O usuario
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  // DEFINIMOS TU DOMINIO "FANTASMA" PARA LEGADO
  const DOMINIO = '@boda.com';

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    // Lógica dual: Si tiene '@' es un email normal, sino es un usuario legacy
    let emailCompleto = inputIdentifier;
    if (!inputIdentifier.includes('@')) {
      emailCompleto = inputIdentifier + DOMINIO;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, emailCompleto, password);
      const user = userCredential.user;

      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const userData = docSnap.data();
        if (userData.role === 'admin') {
          router.push('/admin');
        } else {
          router.push('/dashboard');
        }
      } else {
        // Fallback si no tiene rol (no debería pasar con new signup)
        router.push('/dashboard');
      }

    } catch (error) {
      console.error(error);
      setError('Usuario o contraseña incorrectos');
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-boda-bg">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-boda-pink/20">
        <h1 className="text-2xl font-script text-boda-pink-dark text-center mb-6 text-3xl">Bienvenido</h1>

        {error && <div className="bg-red-50 text-red-500 text-sm p-3 rounded mb-4 text-center">{error}</div>}

        <form onSubmit={handleLogin} className="flex flex-col gap-4">

          <div className="flex flex-col">
            <label className="text-sm font-bold text-boda-text mb-1">Email o Usuario</label>
            <input
              type="text"
              placeholder="ejemplo@correo.com o usuario"
              className="p-3 border border-gray-300 rounded-lg w-full text-black focus:outline-none focus:border-boda-pink"
              value={inputIdentifier}
              onChange={(e) => setInputIdentifier(e.target.value)}
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-bold text-boda-text mb-1">Contraseña</label>
            <input
              type="password"
              placeholder="******"
              className="p-3 border border-gray-300 rounded-lg text-black focus:outline-none focus:border-boda-pink"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="bg-boda-pink text-white py-3 rounded-lg hover:bg-boda-pink-dark font-bold mt-2 shadow-md transition-all transform hover:-translate-y-0.5">
            Entrar
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-500">
          ¿Aún no tienes cuenta? <Link href="/signup" className="text-boda-green font-bold hover:underline">Regístrate aquí</Link>
        </p>

      </div>
    </div>
  );
}