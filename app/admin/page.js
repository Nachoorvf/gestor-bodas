'use client';
import { useState, useEffect } from 'react';
import { auth, db } from '../../firebase/config';
import { collection, query, onSnapshot, orderBy, doc, getDoc, updateDoc, addDoc, where, deleteDoc, getDocs, writeBatch } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { deleteWedding } from '../actions';
import Button from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';

export default function AdminDashboard() {
  const router = useRouter();
  const { user, userData, loading: authLoading } = useAuth();
  const isAuthorized = user && userData?.role === 'admin';

  // Local loading for actions (like creating/deleting), NOT for auth
  const [actionLoading, setActionLoading] = useState(false);

  const [bodas, setBodas] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [users, setUsers] = useState([]);

  // NEW: State for Create Wedding Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWeddingData, setNewWeddingData] = useState({
    novio1: '', novio2: '', fecha: ''
  });

  const handleCreateWedding = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      // 1. Create Wedding
      const weddingRef = await addDoc(collection(db, 'weddings'), {
        novios: [newWeddingData.novio1, newWeddingData.novio2],
        fecha: newWeddingData.fecha,
        creadoEn: new Date().toISOString(),
        adminId: user.uid, // Created by admin
        invitationConfig: {
          location: { enabled: false },
          bank: { enabled: false },
          timeline: { enabled: false }
        }
      });

      // 2. CRITICAL: Link this wedding to the Admin User ID so they "own" it for testing
      await updateDoc(doc(db, 'users', user.uid), {
        weddingId: weddingRef.id
      });

      alert("✅ Boda de prueba creada y vinculada a tu cuenta");
      setShowCreateModal(false);
      setNewWeddingData({ novio1: '', novio2: '', fecha: '' });

      // Force reload or let listener update? Listener should update userData in context if we were listening to it...
      // but Context usually listens to Auth object which doesn't change on doc update. 
      // Ideally AuthContext should listen to the user doc. 
      // For now, let's rely on the fact that if we navigate it updates, or page refresh.

    } catch (error) {
      console.error(error);
      alert("❌ Error al crear boda: " + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    // 1. Secure Route
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (userData?.role !== 'admin') {
        router.push('/dashboard');
      }
    }
  }, [user, userData, authLoading, router]);

  useEffect(() => {
    // 2. Load Admin Data only if authorized
    if (user && userData?.role === 'admin') {
      const qBodas = query(collection(db, "weddings"), orderBy("creadoEn", "desc"));
      const unsubBodas = onSnapshot(qBodas, (snapshot) => {
        setBodas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      const qSolicitudes = query(collection(db, "wedding_requests"), where("status", "==", "pending"));
      const unsubSolicitudes = onSnapshot(qSolicitudes, (snapshot) => {
        setSolicitudes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      const qUsers = query(collection(db, "users"));
      const unsubUsers = onSnapshot(qUsers, (snapshot) => {
        setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      return () => {
        unsubBodas();
        unsubSolicitudes();
        unsubUsers();
      };
    }
  }, [user, userData]); // Re-run when user/role is confirmed

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  const handleDeleteWedding = async (weddingId, adminId, nombreBoda) => {
    const confirmacion = confirm(`⚠️ PELIGRO:\n¿Estás seguro de que quieres BORRAR la boda de ${nombreBoda}?\nEsta acción eliminará permanentemente:\n- Lista de invitados\n- Confirmaciones\n- Mesas\n- Gastos\n- Usuario asociado`);
    if (!confirmacion) return;

    setActionLoading(true);

    try {
      // Get ID Token for Security
      const token = await user.getIdToken();

      // Call Server Action
      const result = await deleteWedding(token, weddingId);

      if (result.success) {
        alert("✅ " + result.message);
      } else {
        throw new Error(result.message);
      }

    } catch (error) {
      console.error(error);
      alert("❌ Error al eliminar: " + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (user) => {
    const confirmacion = confirm(`⚠️ DESTRUCCIÓN TOTAL:\n¿Vas a borrar al usuario ${user.email}?\n\nSi tiene una boda, SE BORRARÁ TAMBIÉN (invitados, mesas, todo).\n\n¿Proceder?`);
    if (!confirmacion) return;

    setLoading(true);
    try {
      const batch = writeBatch(db);

      // 1. Si tiene boda, borrar todo lo de la boda
      if (user.weddingId) {
        const subCollections = ['guests', 'tables', 'expenses'];
        for (const subCol of subCollections) {
          const subSnapshot = await getDocs(collection(db, 'weddings', user.weddingId, subCol));
          subSnapshot.forEach((doc) => {
            batch.delete(doc.ref);
          });
        }
        // Borrar Boda
        batch.delete(doc(db, 'weddings', user.weddingId));
      }

      // 2. Borrar Usuario
      batch.delete(doc(db, 'users', user.id));

      await batch.commit();
      alert("✅ Usuario y sus datos eliminados.");
    } catch (error) {
      console.error(error);
      alert("❌ Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectRequest = async (requestId) => {
    if (!confirm("¿Estás seguro de rechazar y eliminar esta solicitud?")) return;
    try {
      await deleteDoc(doc(db, 'wedding_requests', requestId));
    } catch (e) {
      console.error(e);
      alert("Error al rechazar");
    }
  };

  const handleApprove = async (request) => {
    if (!confirm(`¿Aprobar boda para ${request.novios.join(' y ')}?`)) return;
    setLoading(true);

    try {
      // 1. Crear la Boda en 'weddings'
      const weddingData = {
        novios: request.novios,
        fecha: request.fecha,
        creadoEn: new Date().toISOString(),
        adminId: request.userId,
        invitationConfig: { // Default Config
          location: { enabled: false },
          bank: { enabled: false },
          timeline: { enabled: false }
        }
      };

      const weddingRef = await addDoc(collection(db, 'weddings'), weddingData);

      // 2. Actualizar el usuario con su weddingId
      await updateDoc(doc(db, 'users', request.userId), {
        weddingId: weddingRef.id
      });

      // 3. Marcar solicitud como aprobada
      await updateDoc(doc(db, 'wedding_requests', request.id), {
        status: 'approved',
        processedAt: new Date().toISOString()
      });

      alert("✅ Solicitud Aprobada y Boda Creada");

    } catch (error) {
      console.error(error);
      alert("❌ Error al aprobar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthorized) return <div className="min-h-screen bg-boda-bg flex items-center justify-center text-boda-green font-bold animate-pulse">Verificando Credenciales...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* HEADER & NAV */}
        <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Panel Super Admin ⚡️</h1>
            <p className="text-sm text-gray-500">Control total de la plataforma</p>
          </div>
          <div className="flex gap-4">
            {(() => {
              const currentUserData = users.find(u => u.id === auth.currentUser?.uid);
              const adminHasWedding = currentUserData?.weddingId;
              return adminHasWedding ? (
                <Button
                  href="/dashboard"
                  variant="primary"
                  className="shadow-lg shadow-boda-green/20"
                >
                  👁️ Ver mi Boda de Prueba
                </Button>
              ) : (
                <Button
                  onClick={() => setShowCreateModal(true)}
                  variant="secondary"
                  className="shadow-lg shadow-boda-pink/20"
                >
                  + Crear Boda de Prueba
                </Button>
              );
            })()}

            <button onClick={handleLogout} className="text-red-500 font-bold text-sm bg-red-50 px-4 py-2 rounded-xl hover:bg-red-100 transition">
              Cerrar Sesión
            </button>
          </div>
        </div>

        {/* MODAL CREAR BODA */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-fade-in-up">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Crear Nueva Boda</h2>
              <form onSubmit={handleCreateWedding} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase">Novio/a 1</label>
                  <input
                    required
                    type="text"
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-gray-800 focus:outline-none"
                    value={newWeddingData.novio1}
                    onChange={e => setNewWeddingData({ ...newWeddingData, novio1: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase">Novio/a 2</label>
                  <input
                    required
                    type="text"
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-gray-800 focus:outline-none"
                    value={newWeddingData.novio2}
                    onChange={e => setNewWeddingData({ ...newWeddingData, novio2: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase">Fecha</label>
                  <input
                    required
                    type="date"
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-gray-800 focus:outline-none text-gray-600"
                    value={newWeddingData.fecha}
                    onChange={e => setNewWeddingData({ ...newWeddingData, fecha: e.target.value })}
                  />
                </div>
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-gray-500 font-bold hover:bg-gray-100 rounded-lg transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-gray-900 text-white font-bold rounded-lg hover:bg-black transition shadow-md"
                  >
                    {actionLoading ? 'Creando...' : 'Crear Boda'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-3xl">👥</div>
            <div>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Total Usuarios</p>
              <p className="text-4xl font-black text-gray-800">{users.length}</p>
            </div>
          </div>
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center text-3xl">💍</div>
            <div>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Bodas Activas</p>
              <p className="text-4xl font-black text-gray-800">{bodas.length}</p>
            </div>
          </div>
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center text-3xl">📩</div>
            <div>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Solicitudes</p>
              <p className="text-4xl font-black text-gray-800">{solicitudes.length}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* COLUMN 1: PENDING REQUESTS */}
          <div className="lg:col-span-1 space-y-6">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              Nuevas Solicitudes <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full text-xs">{solicitudes.length}</span>
            </h2>

            {solicitudes.length === 0 ? (
              <div className="bg-white p-8 rounded-3xl border border-dashed border-gray-300 text-center text-gray-400">
                Todo al día. No hay solicitudes pendientes.
              </div>
            ) : (
              <div className="space-y-4">
                {solicitudes.map(req => (
                  <div key={req.id} className="bg-white p-5 rounded-2xl shadow-sm border border-orange-100 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-orange-400"></div>
                    <h3 className="font-bold text-gray-800 text-lg">{req.novios.join(' & ')}</h3>
                    <p className="text-xs text-gray-500 mb-1">📅 {req.fecha}</p>
                    <p className="text-xs text-gray-400 mb-4 truncate">{req.userEmail}</p>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(req)}
                        disabled={actionLoading}
                        className="flex-1 bg-gray-900 text-white py-2 rounded-lg text-xs font-bold hover:bg-black transition"
                      >
                        Aprobar
                      </button>
                      <button
                        onClick={() => handleRejectRequest(req.id)}
                        className="px-3 py-2 bg-red-50 text-red-500 rounded-lg text-xs font-bold hover:bg-red-100 transition"
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* COLUMN 2 & 3: ACTIVE WEDDINGS */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              Bodas en la Plataforma <span className="bg-green-100 text-green-600 px-2 py-0.5 rounded-full text-xs">{bodas.length}</span>
            </h2>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="p-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Pareja</th>
                    <th className="p-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Fecha</th>
                    <th className="p-6 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bodas.map(boda => (
                    <tr key={boda.id} className="hover:bg-gray-50/50 transition">
                      <td className="p-6">
                        <p className="font-bold text-gray-800 text-lg font-serif">
                          {boda.novios ? boda.novios.join(' & ') : 'Sin nombre'}
                        </p>
                        <p className="text-xs text-gray-400 font-mono mt-1">ID: {boda.id.substring(0, 8)}...</p>
                      </td>
                      <td className="p-6">
                        <div className="inline-flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full text-xs font-medium text-gray-600">
                          📅 {boda.fecha}
                        </div>
                      </td>
                      <td className="p-6 text-right space-x-2">
                        <Link href={`/admin/boda/${boda.id}`} className="inline-block px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-bold hover:border-gray-400 transition">
                          👁️ Supervisar
                        </Link>
                        <button
                          onClick={() => handleDeleteWedding(boda.id, boda.adminId, boda.novios?.join(' y '))}
                          disabled={actionLoading}
                          className="px-4 py-2 bg-red-50 text-red-500 rounded-xl text-xs font-bold hover:bg-red-100 transition disabled:opacity-50"
                        >
                          {actionLoading ? '...' : '🗑️ Borrar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* SECTION: USERS MANAGEMENT */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">Gestión de Usuarios</h2>
            <span className="text-xs font-bold bg-white border px-3 py-1 rounded-full text-gray-500">{users.length} Registrados</span>
          </div>
          <table className="w-full text-left">
            <thead className="bg-white border-b border-gray-100">
              <tr>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Usuario / Email</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Rol</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Boda Asociada</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 transition">
                  <td className="p-4">
                    <div className="font-bold text-gray-700">{u.displayName || 'Sin Nombre'}</div>
                    <div className="text-xs text-gray-400">{u.email}</div>
                  </td>
                  <td className="p-4">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${u.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'}`}>
                      {u.role || 'user'}
                    </span>
                  </td>
                  <td className="p-4 text-xs text-gray-500 font-mono">
                    {u.weddingId ? (
                      <Link href={`/admin/boda/${u.weddingId}`} className="text-blue-500 hover:underline">
                        {u.weddingId}
                      </Link>
                    ) : <span className="text-gray-300">Ninguna</span>}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleDeleteUser(u)}
                      className="bg-red-50 text-red-500 hover:bg-red-100 px-3 py-1 rounded-lg text-xs font-bold transition"
                      title="Borrar Usuario y Boda"
                    >
                      🗑️ Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div >
  );
}