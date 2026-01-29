'use client';
import { useState, useEffect } from 'react';
import { auth, db } from '../../firebase/config';
import { collection, query, onSnapshot, orderBy, doc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { createNewWedding, deleteWedding } from '../actions';
import Link from 'next/link';

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [bodas, setBodas] = useState([]);
  
  const [formData, setFormData] = useState({
    nombre1: '', nombre2: '', fecha: '', usuario: '', password: ''
  });

  // (Misma lógica de seguridad que antes...)
  useEffect(() => {
    const checkAdmin = async () => {
      auth.onAuthStateChanged(async (user) => {
        if (!user) { router.push('/login'); return; }
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().role === 'admin') {
          setIsAuthorized(true);
        } else {
          router.push('/dashboard');
        }
      });
    };
    checkAdmin();
  }, [router]);

  useEffect(() => {
    if (!isAuthorized) return;
    const q = query(collection(db, "weddings"), orderBy("creadoEn", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBodas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [isAuthorized]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleDelete = async (weddingId, nombreBoda) => {
    const confirmacion = confirm(`⚠️ ¿Borrar boda de ${nombreBoda}?`);
    if (!confirmacion) return;
    const resultado = await deleteWedding(weddingId);
    if (resultado.success) alert("🗑️ Boda eliminada.");
    else alert("❌ Error: " + resultado.message);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const resultado = await createNewWedding(formData);
    setLoading(false);
    if (resultado.success) {
      alert("✅ " + resultado.message);
      setFormData({ nombre1: '', nombre2: '', fecha: '', usuario: '', password: '' });
    } else {
      alert("❌ Error: " + resultado.message);
    }
  };

  if (!isAuthorized) return <div className="min-h-screen bg-boda-bg flex items-center justify-center text-boda-text">Verificando...</div>;

  return (
    <div className="min-h-screen bg-boda-bg p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* HEADER ADMIN */}
        <div className="flex justify-between items-center mb-10 bg-white p-6 rounded-2xl shadow-sm border border-boda-green/10">
          <div>
            <h1 className="text-3xl font-script text-boda-green mb-1">Panel de Administración</h1>
            <p className="text-xs uppercase tracking-widest text-boda-text-light">Gestión de Clientes</p>
          </div>
          <button onClick={handleLogout} className="text-boda-pink hover:text-red-500 font-bold text-sm transition-colors">
            Salir
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* TARJETA FORMULARIO */}
          <div className="lg:col-span-1 h-fit">
            <div className="bg-white p-8 rounded-3xl shadow-xl border-t-8 border-boda-green">
              <h2 className="text-2xl font-serif text-boda-text mb-6">✨ Nueva Boda</h2>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex gap-3">
                  <input name="nombre1" type="text" placeholder="Novio/a 1" className="w-1/2 p-3 bg-boda-bg/50 border border-gray-200 rounded-xl focus:outline-none focus:border-boda-green" onChange={handleChange} value={formData.nombre1} required />
                  <input name="nombre2" type="text" placeholder="Novio/a 2" className="w-1/2 p-3 bg-boda-bg/50 border border-gray-200 rounded-xl focus:outline-none focus:border-boda-green" onChange={handleChange} value={formData.nombre2} required />
                </div>
                <input name="fecha" type="date" className="w-full p-3 bg-boda-bg/50 border border-gray-200 rounded-xl text-gray-500" onChange={handleChange} value={formData.fecha} required />
                
                <div className="my-2 border-t border-gray-100"></div>
                
                <div className="flex items-center">
                    <input name="usuario" type="text" placeholder="Usuario" className="w-full p-3 bg-boda-bg/50 border border-gray-200 rounded-l-xl focus:outline-none focus:border-boda-green" onChange={handleChange} value={formData.usuario} required />
                    <span className="p-3 bg-gray-100 border border-gray-200 border-l-0 rounded-r-xl text-gray-400 text-sm font-bold">@boda.com</span>
                </div>
                <input name="password" type="text" placeholder="Contraseña prov." className="w-full p-3 bg-boda-bg/50 border border-gray-200 rounded-xl focus:outline-none focus:border-boda-green" onChange={handleChange} value={formData.password} required />

                <button type="submit" disabled={loading} className="mt-4 bg-boda-text text-white py-4 rounded-xl hover:bg-black font-bold transition shadow-lg">
                  {loading ? 'Procesando...' : 'Dar de Alta'}
                </button>
              </form>
            </div>
          </div>

          {/* LISTA DE BODAS */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-serif text-boda-text mb-4 ml-2">Bodas Activas ({bodas.length})</h2>
            <div className="grid gap-4">
              {bodas.map((boda) => (
                <div key={boda.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-boda-bg rounded-full flex items-center justify-center text-2xl">💍</div>
                    <div>
                      <h3 className="font-serif text-xl text-boda-text">
                        {boda.novios ? `${boda.novios[0]} & ${boda.novios[1]}` : 'Sin nombres'}
                      </h3>
                      <p className="text-xs text-boda-text-light uppercase tracking-wider">Fecha: {boda.fecha}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <button 
                        onClick={() => handleDelete(boda.id, boda.novios?.join(' y '))}
                        className="text-boda-text-light hover:text-red-500 hover:bg-red-50 px-4 py-2 rounded-xl text-sm font-bold transition-colors"
                    >
                      Borrar
                    </button>

                    <Link 
                        href={`/admin/boda/${boda.id}`}
                        className="bg-boda-green text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-boda-green-dark shadow-md shadow-boda-green/20"
                    >
                      Gestionar
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}