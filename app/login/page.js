'use client';
import { useState } from 'react';
import { signInWithEmailAndPassword, signInWithPopup, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../../firebase/config';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [inputIdentifier, setInputIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const DOMINIO = '@boda.com';

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        await setDoc(docRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          role: 'user',
          weddingId: null,
          createdAt: new Date().toISOString()
        });
        router.push('/request-wedding');
      } else {
        const userData = docSnap.data();
        if (userData.role === 'admin') {
          router.push('/admin');
        } else if (userData.weddingId) {
          router.push('/dashboard');
        } else {
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
    let emailCompleto = inputIdentifier;
    if (!inputIdentifier.includes('@')) {
      emailCompleto = inputIdentifier + DOMINIO;
    }

    try {
      await setPersistence(auth, browserLocalPersistence);
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
          router.push('/request-wedding');
        }
      } else {
        router.push('/request-wedding');
      }
    } catch (error) {
      console.error(error);
      setError('Credenciales incorrectas. Inténtalo de nuevo.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6 bg-[#FAFAFA]">
      <div className="w-full max-w-md bg-white p-10 md:p-12 shadow-2xl shadow-gray-200/50 border border-gray-100 flex flex-col items-center">

        {/* Logo / Header */}
        <Link href="/" className="mb-10 text-center group">
          <h1 className="font-script text-5xl text-boda-text mb-2 group-hover:text-boda-accent transition-colors">El Convite</h1>
          <div className="h-px w-12 bg-boda-accent mx-auto"></div>
        </Link>

        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-8">Acceso a Clientes</h2>

        {error && <div className="w-full bg-red-50 text-red-500 text-xs font-bold p-3 mb-6 text-center border border-red-100 uppercase tracking-wide">{error}</div>}

        <form onSubmit={handleLogin} className="w-full flex flex-col gap-6">

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Email o Usuario</label>
            <input
              type="text"
              className="w-full border-b border-gray-200 py-2 text-boda-text focus:outline-none focus:border-boda-accent transition-colors bg-transparent placeholder-gray-300 font-serif"
              placeholder="su.nombre@ejemplo.com"
              value={inputIdentifier}
              onChange={(e) => setInputIdentifier(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Contraseña</label>
            <input
              type="password"
              className="w-full border-b border-gray-200 py-2 text-boda-text focus:outline-none focus:border-boda-accent transition-colors bg-transparent placeholder-gray-300 font-serif"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="mt-4 bg-boda-text text-white py-4 w-full font-bold text-xs uppercase tracking-widest hover:bg-black transition-all duration-500 shadow-lg hover:shadow-xl">
            Entrar
          </button>
        </form>

        <div className="w-full flex items-center gap-4 my-8">
          <div className="flex-1 h-px bg-gray-100"></div>
          <span className="text-[10px] uppercase tracking-widest text-gray-300 font-bold">O</span>
          <div className="flex-1 h-px bg-gray-100"></div>
        </div>

        <button
          onClick={handleGoogleLogin}
          type="button"
          className="w-full flex items-center justify-center gap-3 border border-gray-200 py-3 text-gray-500 hover:text-boda-text hover:border-boda-text transition-all duration-300 text-xs font-bold uppercase tracking-wide"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 h-4 grayscale opacity-60" alt="Google" />
          Acceder con Google
        </button>

        <p className="mt-10 text-xs text-gray-400">
          ¿Aún no es miembro? <Link href="/signup" className="text-boda-accent font-bold border-b border-boda-accent/50 hover:text-boda-text transition-colors pb-0.5">Solicite una invitación</Link>
        </p>

      </div>
    </div>
  );
}