'use client';
import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Card from '../../components/ui/Card';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import DashboardSkeleton from '../../components/loaders/DashboardSkeleton';

export default function DashboardOverview() {
  const router = useRouter();
  const { user, userData, loading: authLoading } = useAuth();
  const [weddingData, setWeddingData] = useState(null);
  const [stats, setStats] = useState({
    totalGuests: 0,
    confirmedGuests: 0,
    totalBudget: 0,
    totalPaid: 0
  });

  useEffect(() => {
    // 1. Auth Check (Redirect if not logged in)
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    // 2. Fetch Wedding Data if User has Wedding
    const fetchWeddingDetails = async () => {
      if (userData?.weddingId) {
        const weddingDoc = await getDoc(doc(db, 'weddings', userData.weddingId));
        if (weddingDoc.exists()) {
          setWeddingData(weddingDoc.data());

          // Get Subcollection Stats
          const weddingId = userData.weddingId;
          const [guestsSnap, expensesSnap] = await Promise.all([
            getDocs(collection(db, 'weddings', weddingId, 'guests')),
            getDocs(collection(db, 'weddings', weddingId, 'expenses'))
          ]);

          const guests = guestsSnap.docs.map(d => d.data());
          const expenses = expensesSnap.docs.map(d => d.data());

          const calculatedBudget = expenses.reduce((acc, curr) => acc + Number(curr.estimated || 0), 0);
          const calculatedPaid = expenses.reduce((acc, curr) => acc + Number(curr.paid || 0), 0);

          setStats({
            totalGuests: guests.length,
            confirmedGuests: guests.filter(g => g.confirmado === true).length,
            totalBudget: calculatedBudget,
            totalPaid: calculatedPaid
          });
        }
      }
    };

    if (!authLoading && user) {
      fetchWeddingDetails();
    }
  }, [user, userData, authLoading, router]);

  const calculateDaysLeft = (dateString) => {
    if (!dateString) return 0;
    const eventDate = new Date(dateString);
    const today = new Date();
    const diffTime = eventDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  if (authLoading) return <DashboardSkeleton />;

  const daysLeft = calculateDaysLeft(weddingData?.fecha);
  const guestPercentage = stats.totalGuests > 0 ? (stats.confirmedGuests / stats.totalGuests) * 100 : 0;
  const budgetPercentage = stats.totalBudget > 0 ? (stats.totalPaid / stats.totalBudget) * 100 : 0;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-end">
        <div>
          <h1 className="text-3xl font-serif text-boda-text">
            {weddingData?.novios ? weddingData.novios.join(' & ') : 'Vuestra Boda'}
          </h1>
          <p className="text-gray-400 text-sm mt-1 font-medium tracking-wide">
            {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <Link href="/dashboard/configuracion-invitacion" className="mt-4 md:mt-0 text-xs font-bold text-boda-text border-b border-boda-text pb-0.5 hover:opacity-70 transition">
          VER INVITACIÓN →
        </Link>
      </div>

      {/* COMPACT BENTO GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

        {/* 1. HERO BANNER - COUNTDOWN (Span 2 cols, 1 row) */}
        <div className="lg:col-span-2 bg-boda-text text-white rounded-[2rem] p-6 md:p-8 flex flex-row items-center justify-between relative overflow-hidden shadow-xl shadow-gray-200 group h-full min-h-[180px]">
          {/* Background Deco */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 transition-transform duration-700 group-hover:scale-125"></div>

          <div className="relative z-10 flex-1">
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-400 mb-2 block">Cuenta Atrás</span>
            <div className="flex items-baseline gap-2">
              <span className="text-6xl md:text-7xl font-serif leading-none tracking-tighter">
                {daysLeft}
              </span>
              <span className="text-xl font-script opacity-80">Días</span>
            </div>
            <p className="text-xs text-gray-500 mt-2 font-medium">
              {daysLeft === 0 ? '¡Hoy es el gran día!' : `Hasta el ${weddingData?.fecha || '...'}`}
            </p>
          </div>

          <div className="relative z-10 hidden sm:flex flex-col items-end justify-center pl-6 border-l border-white/10 h-12">
            <span className="text-3xl">💍</span>
          </div>
        </div>

        {/* 2. GUESTS STAT */}
        <Link href="/dashboard/invitados" className="bg-white rounded-[2rem] p-6 border border-gray-100 hover:border-gray-300 hover:shadow-lg transition-all group flex flex-col justify-between h-full min-h-[180px]">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-gray-50 rounded-xl group-hover:bg-gray-100 transition">
              <span className="text-2xl">✉️</span>
            </div>
            <span className="bg-gray-50 text-gray-600 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide">
              {guestPercentage.toFixed(0)}% Asistencia
            </span>
          </div>
          <div>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">Total Invitados</p>
            <h3 className="text-3xl font-serif text-boda-text">{stats.totalGuests}</h3>
            <p className="text-xs text-boda-text-light mt-1"><strong className="text-boda-text">{stats.confirmedGuests}</strong> confirmados</p>
          </div>
        </Link>

        {/* 3. BUDGET STAT */}
        <Link href="/dashboard/presupuesto" className="bg-white rounded-[2rem] p-6 border border-gray-100 hover:border-gray-300 hover:shadow-lg transition-all group flex flex-col justify-between h-full min-h-[180px]">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-gray-50 rounded-xl group-hover:bg-gray-100 transition">
              <span className="text-2xl">💰</span>
            </div>
            <span className="bg-gray-50 text-gray-600 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide">
              {budgetPercentage.toFixed(0)}% Pagado
            </span>
          </div>
          <div>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">Presupuesto</p>
            <h3 className="text-3xl font-serif text-boda-text">{stats.totalPaid.toLocaleString()}€</h3>
            <div className="w-full bg-gray-100 h-1 mt-3 rounded-full overflow-hidden">
              <div className="bg-boda-text h-full transition-all duration-1000" style={{ width: `${budgetPercentage}%` }}></div>
            </div>
          </div>
        </Link>

        {/* 4. ACTIONS ROW (Span 2) */}
        <div className="lg:col-span-2 bg-white rounded-[2rem] p-6 border border-gray-100 flex flex-col justify-center">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Acciones Rápidas</h4>
          <div className="grid grid-cols-3 gap-3">
            <button onClick={() => router.push('/dashboard/invitados')} className="p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition text-center group">
              <span className="block text-xl mb-1 group-hover:-translate-y-0.5 transition-transform">👯‍♀️</span>
              <span className="text-xs font-bold text-boda-text">Invitados</span>
            </button>
            <button onClick={() => router.push('/dashboard/mesas')} className="p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition text-center group">
              <span className="block text-xl mb-1 group-hover:-translate-y-0.5 transition-transform">🍽️</span>
              <span className="text-xs font-bold text-boda-text">Mesas</span>
            </button>
            <button onClick={() => router.push('/dashboard/presupuesto')} className="p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition text-center group">
              <span className="block text-xl mb-1 group-hover:-translate-y-0.5 transition-transform">💶</span>
              <span className="text-xs font-bold text-boda-text">Pagos</span>
            </button>
          </div>
        </div>

        {/* 5. TIP OF THE DAY (Span 2) */}
        <div className="lg:col-span-2 bg-gray-50 rounded-[2rem] p-6 border border-dashed border-gray-200 flex items-center gap-5 justify-between">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-2xl shadow-sm flex-shrink-0">
              💡
            </div>
            <div>
              <h4 className="font-bold text-boda-text text-sm mb-0.5">Consejo Semanal</h4>
              <p className="text-xs text-gray-500 leading-relaxed max-w-sm">
                "Revisa las alergias alimentarias. Es un detalle que tus invitados agradecerán."
              </p>
            </div>
          </div>
          <button className="text-gray-300 hover:text-boda-text transition">✕</button>
        </div>

      </div>

    </div>
  );
}