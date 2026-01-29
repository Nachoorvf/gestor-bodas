'use client';
import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase/config'; 
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState(''); // Ahora guardamos "usuario", no "email"
  const [password, setPassword] = useState('');
  const router = useRouter();

  // DEFINIMOS TU DOMINIO "FANTASMA"
  const DOMINIO = '@boda.com'; 

  const handleLogin = async (e) => {
    e.preventDefault();

    // Fabricamos el email
    const emailCompleto = username + DOMINIO;

    try {
      // Usamos el email trucado para hablar con Firebase
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
        alert('Usuario sin rol asignado');
      }

    } catch (error) {
      console.error(error);
      // Mensaje de error más amigable
      alert('Error: Usuario o contraseña incorrectos'); 
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-2xl font-bold mb-4">Acceso a Bodas</h1>
      <form onSubmit={handleLogin} className="flex flex-col gap-4 w-full max-w-md">
        
        {/* Input cambiado a tipo TEXTO, no EMAIL */}
        <div className="flex flex-col">
          <label className="text-sm font-bold mb-1">Usuario</label>
          <div className="flex">
            <input 
              type="text" 
              placeholder="Ej: admin" 
              className="p-2 border border-gray-300 rounded-l w-full text-black"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />

          </div>
        </div>
        
        <div className="flex flex-col">
           <label className="text-sm font-bold mb-1">Contraseña</label>
           <input 
            type="password" 
            placeholder="******" 
            className="p-2 border border-gray-300 rounded text-black"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        
        <button type="submit" className="bg-pink-600 text-white p-2 rounded hover:bg-pink-700 font-bold mt-2">
          Entrar
        </button>
      </form>
    </div>
  );
}