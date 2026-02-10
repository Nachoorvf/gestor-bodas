'use client';
import { useState, useEffect } from 'react';
import { auth, db } from '../../firebase/config';
import { collection, query, onSnapshot, orderBy, doc, updateDoc, addDoc, where, deleteDoc, getDocs, writeBatch } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { deleteWedding } from '../actions';
import { useAuth } from '../../context/AuthContext';
import {
  Users, Gem, Calendar, Search, Plus,
  LogOut, LayoutDashboard, Check, X,
  Trash2, Edit, Euro
} from 'lucide-react';

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

  if (!isAuthorized) return <div className="min-h-screen flex items-center justify-center animate-pulse font-serif text-[#C5A065]">Cargando Panel...</div>;

  // Filter Logic
  const filteredUsers = users.filter(u => (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) || (u.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredWeddings = bodas.filter(b => b.novios?.some(n => (n || '').toLowerCase().includes(searchTerm.toLowerCase())) || (b.id || '').includes(searchTerm));

  return (
    <div className="min-h-screen bg-[#FDFBF7] font-sans text-[#333]">

      {/* BACKGROUND DECOR */}
      <div className="fixed inset-0 z-0 opacity-[0.4] bg-[url('https://www.transparenttextures.com/patterns/p5.png')] pointer-events-none"></div>

      <div className="relative z-10 max-w-7xl mx-auto p-4 md:p-12 space-y-8 md:space-y-12">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <p className="text-[#C5A065] text-[10px] font-bold uppercase tracking-[0.2em] mb-1">Panel de Control</p>
            <h1 className="font-display text-3xl md:text-4xl text-[#333]">Administración</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden md:block">
              <p className="text-sm font-bold">{user.displayName || 'Super Admin'}</p>
              <p className="text-[10px] text-gray-400">{user.email}</p>
            </div>
            <button onClick={handleLogout} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors">
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {/* SEARCH & ACTIONS BAR - Premium Style */}
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-white p-2 rounded-2xl shadow-sm border border-gray-100">

          {/* Global Search */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Buscar usuarios, bodas..."
              className="w-full pl-10 pr-4 py-3 bg-transparent border-none focus:outline-none focus:ring-0 text-gray-600 placeholder-gray-400 font-serif text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#C5A065]"><Search size={16} /></span>
          </div>

          <div className="h-8 w-px bg-gray-100 hidden md:block"></div>

          {/* Create Test Wedding Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-[#333] text-white text-[10px] font-bold uppercase tracking-[0.15em] rounded-xl hover:bg-black transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
          >
            <Plus size={14} /> Nueva Boda
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
              {/* KPI CARDS - Responsive Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                <AdminStatsCard title="Usuarios" value={users.length} icon={<Users size={20} />} color="bg-gray-50 text-gray-500" />
                <AdminStatsCard title="Bodas" value={bodas.length} icon={<Gem size={20} />} color="bg-gray-50 text-gray-500" />
                <AdminStatsCard title="Solicitudes" value={solicitudes.length} icon={<Calendar size={20} />} color={solicitudes.length > 0 ? "bg-[#C5A065] text-white" : "bg-gray-50 text-gray-500"} />
                <AdminStatsCard title="Ingresos" value="0€" icon={<Euro size={20} />} color="bg-gray-50 text-gray-500" />
              </div>

              {/* Pending Requests Preview */}
              {solicitudes.length > 0 && (
                <div>
                  <h2 className="text-lg font-serif italic text-gray-500 mb-4 flex items-center gap-2">
                    Solicitudes Pendientes <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></span>
                  </h2>
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
          <div className="fixed inset-0 bg-[#333]/60 backdrop-blur-sm flex items-end md:items-center justify-center z-50 p-0 md:p-4 animate-fade-in">
            <div className="bg-white rounded-t-3xl md:rounded-3xl p-8 max-w-md w-full shadow-2xl scale-100 animate-slide-up-mobile md:animate-scale-up relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-[#C5A065]"></div>
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-display text-[#333]">Editar Usuario</h2>
                <button onClick={() => setEditingUser(null)} className="text-gray-300 hover:text-gray-500"><X size={24} /></button>
              </div>

              <form onSubmit={handleUpdateUser} className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Nombre</label>
                  <input
                    type="text"
                    className="w-full pb-2 border-b border-gray-200 focus:border-[#C5A065] outline-none text-lg font-serif text-[#333] transition-colors bg-transparent"
                    value={editingUser.displayName || ''}
                    onChange={e => setEditingUser({ ...editingUser, displayName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Email (Solo DB)</label>
                  <input
                    type="email"
                    className="w-full pb-2 border-b border-gray-200 focus:border-[#C5A065] outline-none text-sm text-gray-600 transition-colors bg-transparent"
                    value={editingUser.email || ''}
                    onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                  />
                  <p className="text-[10px] text-orange-400 mt-1 italic">* No cambia el login de Firebase Auth.</p>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Rol</label>
                    <div className="relative">
                      <select
                        className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-[#C5A065] outline-none appearance-none"
                        value={editingUser.role || 'user'}
                        onChange={e => setEditingUser({ ...editingUser, role: e.target.value })}
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400"><LayoutDashboard size={14} /></div>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Wedding ID</label>
                    <input
                      type="text"
                      className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-[#C5A065] outline-none font-mono text-xs text-gray-500"
                      value={editingUser.weddingId || ''}
                      onChange={e => setEditingUser({ ...editingUser, weddingId: e.target.value })}
                      placeholder="Ninguna"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-50">
                  <button type="button" onClick={() => setEditingUser(null)} className="px-5 py-3 text-gray-400 text-xs font-bold uppercase tracking-wider hover:text-gray-600 transition">Cancelar</button>
                  <button type="submit" disabled={actionLoading} className="px-6 py-3 bg-[#333] text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-black transition shadow-lg">{actionLoading ? 'Guardando...' : 'Guardar Cambios'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL CREATE WEDDING */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-[#333]/60 backdrop-blur-sm flex items-end md:items-center justify-center z-50 p-0 md:p-4 animate-fade-in">
            <div className="bg-white rounded-t-3xl md:rounded-3xl p-8 max-w-md w-full shadow-2xl scale-100 animate-slide-up-mobile md:animate-scale-up relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-[#333]"></div>
              <h2 className="text-2xl font-display text-[#333] mb-8">Crear Boda de Prueba</h2>
              <form onSubmit={handleCreateTestWedding} className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Pareja</label>
                  <div className="grid grid-cols-2 gap-3">
                    <input required placeholder="Novio/a 1" type="text" className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-[#C5A065] outline-none transition" value={newWeddingData.novio1} onChange={e => setNewWeddingData({ ...newWeddingData, novio1: e.target.value })} />
                    <input required placeholder="Novio/a 2" type="text" className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-[#C5A065] outline-none transition" value={newWeddingData.novio2} onChange={e => setNewWeddingData({ ...newWeddingData, novio2: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Fecha</label>
                  <input required type="date" className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-[#C5A065] outline-none transition font-mono text-sm" value={newWeddingData.fecha} onChange={e => setNewWeddingData({ ...newWeddingData, fecha: e.target.value })} />
                </div>
                <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-50">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="px-5 py-3 text-gray-400 text-xs font-bold uppercase tracking-wider hover:text-gray-600 transition">Cancelar</button>
                  <button type="submit" disabled={actionLoading} className="px-6 py-3 bg-[#333] text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-black transition shadow-lg">{actionLoading ? '...' : 'Crear Boda'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}