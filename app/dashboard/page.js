'use client';
import { useState, useEffect } from 'react';
import { auth, db } from '../../firebase/config';
import { doc, getDoc, collection, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';

export default function DashboardNovios() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [weddingId, setWeddingId] = useState(null);
  const [guests, setGuests] = useState([]);
  const [nuevoInvitado, setNuevoInvitado] = useState('');
  
  // ESTADO PARA EL MODAL DE EDICIÓN
  const [editingGuest, setEditingGuest] = useState(null); // Guardará el invitado que estamos editando
  const [tempData, setTempData] = useState({}); // Guardará los cambios temporales antes de guardar

  // 1. Cargar Usuario y Boda
  useEffect(() => {
    const fetchUserData = async () => {
      auth.onAuthStateChanged(async (user) => {
        if (!user) { router.push('/login'); return; }
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setWeddingId(userDoc.data().weddingId);
        }
        setLoading(false);
      });
    };
    fetchUserData();
  }, [router]);

  // 2. Escuchar Invitados
  useEffect(() => {
    if (!weddingId) return;
    const q = query(collection(db, 'weddings', weddingId, 'guests'), orderBy('creadoEn', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setGuests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [weddingId]);

  // --- FUNCIONES DE ACCIÓN ---

  const handleAddGuest = async (e) => {
    e.preventDefault();
    if (!nuevoInvitado.trim()) return;
    await addDoc(collection(db, 'weddings', weddingId, 'guests'), {
      nombre: nuevoInvitado, confirmado: null, bus: false, creadoEn: new Date().toISOString()
    });
    setNuevoInvitado('');
  };

  const copiarEnlace = (e, guestId, nombre) => {
    e.stopPropagation(); // Para que no se abra el modal al dar al botón de copiar
    const url = `${window.location.origin}/invitacion/${weddingId}/${guestId}`;
    navigator.clipboard.writeText(`Hola ${nombre}! Confirma aquí: ${url}`);
    alert("¡Enlace copiado! 📋");
  };

  // Abrir el modal con los datos del invitado
  const openEditModal = (guest) => {
    setEditingGuest(guest);
    setTempData({ ...guest }); // Copiamos los datos para editarlos sin tocar la lista real aún
  };

  // Guardar cambios manuales (Simulando ser el invitado)
  const saveChanges = async () => {
    try {
      const docRef = doc(db, 'weddings', weddingId, 'guests', editingGuest.id);
      await updateDoc(docRef, {
        confirmado: tempData.confirmado,
        bus: tempData.bus
      });
      setEditingGuest(null); // Cerrar modal
    } catch (error) {
      alert("Error al guardar cambios");
    }
  };

  // Borrar invitado
  const handleDeleteGuest = async () => {
    if (!confirm("¿Seguro que quieres borrar a este invitado?")) return;
    try {
      await deleteDoc(doc(db, 'weddings', weddingId, 'guests', editingGuest.id));
      setEditingGuest(null);
    } catch (error) {
      alert("Error al borrar");
    }
  };

  // --- CÁLCULOS ---
  const totalInvitados = guests.length;
  const confirmados = guests.filter(g => g.confirmado === true).length;
  const autobus = guests.filter(g => g.bus === true).length;
  const porcentaje = totalInvitados > 0 ? (confirmados / totalInvitados) * 100 : 0;

  if (loading) return <div className="min-h-screen bg-boda-bg flex items-center justify-center text-boda-green animate-pulse">Cargando...</div>;

  return (
    <div className="min-h-screen bg-boda-bg p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        
        {/* HEADER */}
        <div className="flex justify-between items-end mb-8 border-b border-boda-green/20 pb-4">
          <div>
            <p className="text-boda-text-light text-xs uppercase tracking-widest font-bold mb-1">Panel de Control</p>
            <h1 className="text-4xl md:text-5xl font-script text-boda-green">Nuestra Boda</h1>
          </div>
          <button onClick={() => signOut(auth)} className="text-boda-pink hover:text-boda-pink-dark text-xs font-bold transition-colors">
            Cerrar Sesión
          </button>
        </div>

        {/* ESTADÍSTICAS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Invitados', value: totalInvitados, color: 'text-boda-text' },
            { label: 'Confirmados', value: confirmados, color: 'text-boda-green' },
            { label: 'Autobús', value: autobus, color: 'text-purple-500' },
          ].map((stat, i) => (
            <div key={i} className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-boda-green/10 text-center">
                <p className="text-boda-text-light text-[10px] uppercase font-bold tracking-wider mb-2">{stat.label}</p>
                <p className={`text-3xl md:text-4xl font-serif ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-boda-green/10 flex flex-col justify-center">
              <div className="flex justify-between text-xs text-boda-text-light mb-2">
                <span>Progreso</span>
                <span>{Math.round(porcentaje)}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div className="bg-gradient-to-r from-boda-green-light to-boda-green h-3 rounded-full transition-all duration-1000" style={{ width: `${porcentaje}%` }}></div>
              </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* AÑADIR */}
          <div className="md:col-span-1">
              <div className="bg-white p-6 rounded-3xl shadow-xl sticky top-8">
                  <h2 className="font-serif text-xl text-boda-text mb-4">Añadir Invitado</h2>
                  <form onSubmit={handleAddGuest} className="flex flex-col gap-3">
                      <input 
                          type="text" placeholder="Ej: Tio Paco" 
                          className="border-2 border-gray-100 p-3 rounded-xl w-full text-boda-text focus:outline-none focus:border-boda-green/50 bg-boda-bg/30"
                          value={nuevoInvitado} onChange={(e) => setNuevoInvitado(e.target.value)}
                      />
                      <button type="submit" className="bg-boda-green text-white p-3 rounded-xl font-bold hover:bg-boda-green-dark shadow-lg shadow-boda-green/20 transition-all">
                        + Añadir
                      </button>
                  </form>
              </div>
          </div>

          {/* LISTA */}
          <div className="md:col-span-2">
              <div className="bg-white p-8 rounded-3xl shadow-xl min-h-[400px]">
                  <h2 className="font-serif text-xl text-boda-text mb-6">Lista de Invitados</h2>
                  <p className="text-xs text-boda-text-light mb-4">💡 Pincha en un invitado para editarlo manualmente.</p>
                  
                  <div className="flex flex-col gap-3">
                      {guests.map(guest => (
                          <div 
                            key={guest.id} 
                            onClick={() => openEditModal(guest)} // <--- AQUÍ SE ABRE EL MODAL
                            className="group cursor-pointer border border-gray-100 p-4 rounded-2xl flex justify-between items-center hover:border-boda-green hover:bg-green-50/30 transition-all relative overflow-hidden"
                          >
                              <div className="flex items-center gap-4 z-10">
                                  <div className={`w-3 h-3 rounded-full transition-colors ${
                                    guest.confirmado === true ? 'bg-green-500' : 
                                    guest.confirmado === false ? 'bg-red-400' : 'bg-gray-300'
                                  }`}></div>
                                  <div>
                                    <p className="font-bold text-boda-text group-hover:text-boda-green transition-colors">{guest.nombre}</p>
                                    <div className="flex gap-2 text-[10px] uppercase font-bold tracking-wider mt-1 opacity-70">
                                        {guest.confirmado === true ? 'Confirmado' : guest.confirmado === false ? 'No Asiste' : 'Pendiente'}
                                        {guest.bus && <span className="text-purple-500 ml-1">• Bus</span>}
                                    </div>
                                  </div>
                              </div>
                              
                              <button 
                                  onClick={(e) => copiarEnlace(e, guest.id, guest.nombre)}
                                  className="z-20 bg-white text-boda-green border border-boda-green/30 px-4 py-2 rounded-full text-xs font-bold hover:bg-boda-green hover:text-white transition-all shadow-sm"
                              >
                                  Copiar Link
                              </button>
                          </div>
                      ))}
                      {guests.length === 0 && <p className="text-center py-10 opacity-50">Lista vacía</p>}
                  </div>
              </div>
          </div>
        </div>

        {/* --- MODAL FLOTANTE (Solo visible si editingGuest existe) --- */}
        {editingGuest && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 animate-in fade-in zoom-in duration-200">
              
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-xs uppercase text-boda-text-light font-bold">Editando a</p>
                  <h2 className="text-3xl font-script text-boda-green">{editingGuest.nombre}</h2>
                </div>
                <button onClick={() => setEditingGuest(null)} className="bg-gray-100 hover:bg-gray-200 w-8 h-8 rounded-full flex items-center justify-center text-gray-500">✕</button>
              </div>

              {/* OPCIONES MANUALES */}
              <div className="space-y-6">
                
                {/* 1. Confirmación */}
                <div>
                  <p className="text-sm font-bold text-boda-text mb-3">¿Asistirá a la boda?</p>
                  <div className="grid grid-cols-3 gap-2">
                    <button 
                      onClick={() => setTempData({...tempData, confirmado: true})}
                      className={`py-2 rounded-xl text-xs font-bold transition-all ${tempData.confirmado === true ? 'bg-green-500 text-white shadow-lg' : 'bg-gray-50 text-gray-500 hover:bg-green-50'}`}
                    >
                      SÍ, VIENE
                    </button>
                    <button 
                      onClick={() => setTempData({...tempData, confirmado: false, bus: false})}
                      className={`py-2 rounded-xl text-xs font-bold transition-all ${tempData.confirmado === false ? 'bg-red-400 text-white shadow-lg' : 'bg-gray-50 text-gray-500 hover:bg-red-50'}`}
                    >
                      NO VIENE
                    </button>
                    <button 
                      onClick={() => setTempData({...tempData, confirmado: null, bus: false})}
                      className={`py-2 rounded-xl text-xs font-bold transition-all ${tempData.confirmado === null ? 'bg-gray-400 text-white shadow-lg' : 'bg-gray-50 text-gray-500 hover:bg-gray-200'}`}
                    >
                      PENDIENTE
                    </button>
                  </div>
                </div>

                {/* 2. Autobús (Solo si viene) */}
                <div className={`transition-all duration-300 ${tempData.confirmado ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                  <p className="text-sm font-bold text-boda-text mb-3">Servicio de Autobús</p>
                  <label className="flex items-center gap-3 p-4 border rounded-xl cursor-pointer hover:bg-purple-50 transition-colors">
                    <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${tempData.bus ? 'bg-purple-500 border-purple-500' : 'border-gray-300 bg-white'}`}>
                      {tempData.bus && <span className="text-white text-xs">✓</span>}
                    </div>
                    <input 
                      type="checkbox" className="hidden" 
                      checked={tempData.bus || false} 
                      onChange={(e) => setTempData({...tempData, bus: e.target.checked})}
                    />
                    <span className="text-sm text-gray-600">Necesita plaza de autobús</span>
                  </label>
                </div>

                <hr className="border-gray-100"/>

                <div className="flex justify-between items-center pt-2">
                  <button onClick={handleDeleteGuest} className="text-red-400 hover:text-red-600 text-xs font-bold flex items-center gap-1 px-2 py-2 rounded hover:bg-red-50 transition-colors">
                    🗑️ Eliminar invitado
                  </button>

                  <button onClick={saveChanges} className="bg-boda-green text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-boda-green-dark hover:scale-105 transition-all">
                    Guardar Cambios
                  </button>
                </div>

              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}