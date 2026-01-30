'use client';
import { useState } from 'react';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../../firebase/config';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [inputIdentifier, setInputIdentifier] = useState(''); // Puede ser email O usuario
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  // DEFINIMOS TU DOMINIO "FANTASMA" PARA LEGADO
  const DOMINIO = '@boda.com';

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Check if user exists in Firestore
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        // 1. Create NEW user profile (without wedding)
        await setDoc(docRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          role: 'user',
          weddingId: null, // No wedding yet
          createdAt: new Date().toISOString()
        });

        // 2. Redirect to Request Wedding for new users
        router.push('/request-wedding');

      } else {
        // Existing user logic
        const userData = docSnap.data();

        if (userData.role === 'admin') {
          // Admin logic: Redirect to Admin Panel mostly, but if they have a wedding they might want dashboard.
          // User asked: "contact admin to delete account".
          // Let's redirect admins to /admin by default so they can manage things.
          router.push('/admin');
        } else if (userData.weddingId) {
          router.push('/dashboard');
        } else {
          // User exists but has no wedding -> Redirect to Request Wedding
          router.push('/request-wedding');
        }
      }

    } catch (error) {
      console.error("Google Auth Error", error);
      setError('Error al iniciar con Google. Verifica tu conexión.');
    }
  };

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
        } else if (userData.weddingId) {
          router.push('/dashboard');
        } else {
          // User has no wedding -> Redirect to Request Wedding (which handles Pending check)
          router.push('/request-wedding');
        }
      } else {
        // Fallback: If user doc is missing or weird state, send to request wedding to be safe
        router.push('/request-wedding');
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

        <div className="flex items-center my-6">
          <div className="flex-grow border-t border-gray-200"></div>
          <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-bold uppercase">O continúa con</span>
          <div className="flex-grow border-t border-gray-200"></div>
        </div>

        <button
          onClick={handleGoogleLogin}
          type="button"
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-50 font-bold transition-all shadow-sm"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
          Google
        </button>

        <p className="text-center mt-6 text-sm text-gray-500">
          ¿Aún no tienes cuenta? <Link href="/signup" className="text-boda-green font-bold hover:underline">Regístrate aquí</Link>
        </p>

      </div>
    </div>
  );
}