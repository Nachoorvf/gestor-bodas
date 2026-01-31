'use client';
import { useState, useEffect } from 'react';
import { auth, db } from '../../firebase/config';
import { collection, query, onSnapshot, orderBy, doc, updateDoc, addDoc, where, deleteDoc, getDocs, writeBatch } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { deleteWedding } from '../actions';
import { useAuth } from '../../context/AuthContext';

// COMPONENTS
import AdminHeader from '../../components/admin/AdminHeader';
import AdminStatsCard from '../../components/admin/AdminStatsCard';
import AdminTabs from '../../components/admin/AdminTabs';
import AdminRequests from '../../components/admin/AdminRequests';
import AdminWeddingsTable from '../../components/admin/AdminWeddingsTable';
import AdminUsersTable from '../../components/admin/AdminUsersTable';

export default function AdminDashboard() {
  const router = useRouter();
  const { user, userData, loading: authLoading } = useAuth();
  const isAuthorized = user && userData?.role === 'admin';

  // --- STATE ---
  const [activeTab, setActiveTab] = useState('overview'); // overview, requests, weddings, users
  const [searchTerm, setSearchTerm] = useState('');

  const [actionLoading, setActionLoading] = useState(false);
  const [bodas, setBodas] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [users, setUsers] = useState([]);

  // Create Wedding Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWeddingData, setNewWeddingData] = useState({ novio1: '', novio2: '', fecha: '' });

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState(null); // The user object being edited


  // --- AUTH CHECK ---
  useEffect(() => {
    if (!authLoading) {
      if (!user) router.push('/login');
      else if (userData?.role !== 'admin') router.push('/dashboard');
    }
  }, [user, userData, authLoading, router]);

  // --- DATA LISTENER ---
  useEffect(() => {
    if (user && userData?.role === 'admin') {
      const qBodas = query(collection(db, "weddings"), orderBy("creadoEn", "desc"));
      const unsubBodas = onSnapshot(qBodas, (snap) => setBodas(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

      const qSolicitudes = query(collection(db, "wedding_requests"), where("status", "==", "pending"));
      const unsubSolicitudes = onSnapshot(qSolicitudes, (snap) => setSolicitudes(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

      const qUsers = query(collection(db, "users"));
      const unsubUsers = onSnapshot(qUsers, (snap) => setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

      return () => { unsubBodas(); unsubSolicitudes(); unsubUsers(); };
    }
  }, [user, userData]);

  // --- ACTIONS ---

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  const handleDeleteWedding = async (weddingId, adminId, nombreBoda) => {
    if (!confirm(`⚠️ PELIGRO: ¿Borrar boda de ${nombreBoda}?`)) return;
    setActionLoading(true);
    try {
      const token = await user.getIdToken();
      const result = await deleteWedding(token, weddingId); // Server Action
      if (result.success) alert("✅ Eliminado correctamente");
      else throw new Error(result.message);
    } catch (e) {
      console.error(e);
      alert("❌ Error: " + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveRequest = async (request) => {
    if (!confirm(`¿Aprobar boda para ${request.novios.join(' & ')}?`)) return;
    setActionLoading(true);
    try {
      const weddingData = {
        novios: request.novios,
        fecha: request.fecha,
        creadoEn: new Date().toISOString(),
        adminId: request.userId,
        invitationConfig: { location: { enabled: false }, bank: { enabled: false }, timeline: { enabled: false } }
      };

      const weddingRef = await addDoc(collection(db, 'weddings'), weddingData);
      await updateDoc(doc(db, 'users', request.userId), { weddingId: weddingRef.id });
      await updateDoc(doc(db, 'wedding_requests', request.id), { status: 'approved', processedAt: new Date().toISOString() });

      alert("✅ Solicitud Aprobada");
    } catch (e) {
      console.error(e);
      alert("❌ Error: " + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectRequest = async (requestId) => {
    if (!confirm("¿Rechazar solicitud?")) return;
    try {
      await deleteDoc(doc(db, 'wedding_requests', requestId));
    } catch (e) { console.error(e); }
  };

  const handleDeleteUser = async (targetUser) => {
    if (!confirm(`¿Borrar usuario ${targetUser.email} y TODOS sus datos?`)) return;
    setActionLoading(true);
    try {
      const batch = writeBatch(db);
      if (targetUser.weddingId) {
        // Delete subcollections manually (client-side specific logic for now if server action doesn't cover it)
        // Ideally this should be a cloud function or server action too.
        // For simplicity reusing logic:
        batch.delete(doc(db, 'weddings', targetUser.weddingId));
      }
      batch.delete(doc(db, 'users', targetUser.id));
      await batch.commit();
      alert("✅ Usuario eliminado");
    } catch (e) { alert("Error: " + e.message); }
    finally { setActionLoading(false); }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'users', editingUser.id), {
        displayName: editingUser.displayName || null,
        email: editingUser.email || null,
        role: editingUser.role || 'user',
        weddingId: editingUser.weddingId || null
      });
      alert("✅ Usuario actualizado correctamente");
      setEditingUser(null);
    } catch (error) {
      alert("❌ Error al actualizar: " + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateTestWedding = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const weddingRef = await addDoc(collection(db, 'weddings'), {
        novios: [newWeddingData.novio1, newWeddingData.novio2],
        fecha: newWeddingData.fecha,
        creadoEn: new Date().toISOString(),
        adminId: user.uid,
        invitationConfig: { location: { enabled: false }, bank: { enabled: false }, timeline: { enabled: false } }
      });
      await updateDoc(doc(db, 'users', user.uid), { weddingId: weddingRef.id });
      alert("✅ Boda de prueba creada");
      setShowCreateModal(false);
      setNewWeddingData({ novio1: '', novio2: '', fecha: '' });
    } catch (e) { alert("Error: " + e.message); }
    finally { setActionLoading(false); }
  };

  // --- RENDERING ---

  if (!isAuthorized) return <div className="min-h-screen flex items-center justify-center animate-pulse">Cargando...</div>;

  // Filter Logic
  const filteredUsers = users.filter(u => (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) || (u.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredWeddings = bodas.filter(b => b.novios?.some(n => (n || '').toLowerCase().includes(searchTerm.toLowerCase())) || (b.id || '').includes(searchTerm));

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 md:p-12 font-body text-gray-800">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* HEADER */}
        <AdminHeader user={user} onLogout={handleLogout} />

        {/* SEARCH & ACTIONS BAR */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Global Search */}
          <div className="relative w-full md:w-96">
            <input
              type="text"
              placeholder="🔍 Buscar usuarios, bodas, IDs..."
              className="w-full pl-5 pr-4 py-3 rounded-xl border border-gray-200 focus:border-boda-text focus:ring-1 focus:ring-boda-text outline-none transition shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Create Test Wedding Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-white border border-gray-200 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-50 hover:border-gray-300 transition shadow-sm"
          >
            + Boda de Prueba
          </button>
        </div>

        {/* TABS */}
        <AdminTabs
          activeTab={activeTab}
          onChange={setActiveTab}
          tabs={[
            { id: 'overview', label: 'Visión General' },
            { id: 'requests', label: 'Solicitudes', count: solicitudes.length },
            { id: 'weddings', label: 'Bodas', count: filteredWeddings.length },
            { id: 'users', label: 'Usuarios', count: filteredUsers.length }
          ]}
        />

        {/* CONTENT AREA */}
        <div className="animate-fade-in-up">

          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* KPI CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <AdminStatsCard title="Usuarios Totales" value={users.length} icon="👥" color="bg-gray-100 text-gray-600" />
                <AdminStatsCard title="Bodas Activas" value={bodas.length} icon="💍" color="bg-gray-100 text-gray-600" />
                <AdminStatsCard title="Solicitudes" value={solicitudes.length} icon="📩" color={solicitudes.length > 0 ? "bg-boda-accent text-white" : "bg-gray-100 text-gray-600"} />
                <AdminStatsCard title="Ingresos (Sim)" value="0€" icon="💶" color="bg-gray-100 text-gray-600" />
              </div>

              {/* Pending Requests Preview */}
              {solicitudes.length > 0 && (
                <div>
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2">Solicitudes Pendientes <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span></h2>
                  <AdminRequests requests={solicitudes} onApprove={handleApproveRequest} onReject={handleRejectRequest} loading={actionLoading} />
                </div>
              )}
            </div>
          )}

          {/* REQUESTS TAB */}
          {activeTab === 'requests' && (
            <AdminRequests requests={solicitudes} onApprove={handleApproveRequest} onReject={handleRejectRequest} loading={actionLoading} />
          )}

          {/* WEDDINGS TAB */}
          {activeTab === 'weddings' && (
            <AdminWeddingsTable weddings={filteredWeddings} onDelete={handleDeleteWedding} loading={actionLoading} />
          )}

          {/* USERS TAB */}
          {activeTab === 'users' && (
            <AdminUsersTable users={filteredUsers} requests={solicitudes} onDelete={handleDeleteUser} onEdit={setEditingUser} />
          )}

        </div>

        {/* MODAL EDIT USER */}
        {editingUser && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl scale-100 animate-scale-up relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-boda-text"></div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-serif font-bold text-gray-800">Editar Usuario</h2>
                <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>

              <form onSubmit={handleUpdateUser} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase">Nombre</label>
                  <input
                    type="text"
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-boda-text outline-none font-bold text-gray-800"
                    value={editingUser.displayName || ''}
                    onChange={e => setEditingUser({ ...editingUser, displayName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase">Email (Solo DB)</label>
                  <input
                    type="email"
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-boda-text outline-none text-gray-600"
                    value={editingUser.email || ''}
                    onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                  />
                  <p className="text-[10px] text-orange-400 mt-1">* Cambiar esto aqui NO cambia el login de Firebase Auth, solo el documento.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase">Rol</label>
                    <select
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-boda-text outline-none"
                      value={editingUser.role || 'user'}
                      onChange={e => setEditingUser({ ...editingUser, role: e.target.value })}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase">Wedding ID</label>
                    <input
                      type="text"
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-boda-text outline-none font-mono text-xs"
                      value={editingUser.weddingId || ''}
                      onChange={e => setEditingUser({ ...editingUser, weddingId: e.target.value })}
                      placeholder="Ninguna"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                  <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 text-gray-500 font-bold hover:bg-gray-100 rounded-lg transition">Cancelar</button>
                  <button type="submit" disabled={actionLoading} className="px-6 py-2 bg-boda-text text-white font-bold rounded-lg hover:bg-black transition shadow-md">{actionLoading ? 'Guardando...' : 'Guardar Cambios'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL CREATE WEDDING */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl scale-100 animate-scale-up relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-boda-accent"></div>
              <h2 className="text-2xl font-serif font-bold text-gray-800 mb-6">Crear Boda de Prueba</h2>
              <form onSubmit={handleCreateTestWedding} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase">Pareja</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input required placeholder="Novio/a 1" type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-boda-text outline-none" value={newWeddingData.novio1} onChange={e => setNewWeddingData({ ...newWeddingData, novio1: e.target.value })} />
                    <input required placeholder="Novio/a 2" type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-boda-text outline-none" value={newWeddingData.novio2} onChange={e => setNewWeddingData({ ...newWeddingData, novio2: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase">Fecha</label>
                  <input required type="date" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-boda-text outline-none" value={newWeddingData.fecha} onChange={e => setNewWeddingData({ ...newWeddingData, fecha: e.target.value })} />
                </div>
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-gray-500 font-bold hover:bg-gray-100 rounded-lg transition">Cancelar</button>
                  <button type="submit" disabled={actionLoading} className="px-6 py-2 bg-boda-text text-white font-bold rounded-lg hover:bg-black transition shadow-md">{actionLoading ? '...' : 'Crear'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}