'use client';
import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import DashboardSkeleton from '../../components/loaders/DashboardSkeleton';
import { IconUsers, IconWallet, IconTable, IconBrush, IconEnvelope, IconDiamond } from '../../components/ui/Icons';

const weddingTips = [
  "Los pequeños detalles son la suma del diseño.",
  "Invierte en un buen fotógrafo, los recuerdos son para siempre.",
  "Haz una lista de canciones prohibidas para el DJ.",
  "No olvides comer algo antes de la ceremonia.",
  "Ten un plan B para la lluvia, incluso en verano.",
  "Agradece a tus invitados personalmente durante el banquete.",
  "Confirma la asistencia 1 mes antes del evento.",
  "Delega tareas el día de la boda, ¡disfruta!",
  "Prueba los zapatos de la boda en casa días antes.",
  "La iluminación crea el 80% del ambiente."
];

const getWeekNumber = (d) => {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

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
    // 2. Fetch Data
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
  const currentWeek = getWeekNumber(new Date());
  const weeklyTip = weddingTips[currentWeek % weddingTips.length];

  return (
    <div className="space-y-6 md:space-y-10 animate-fade-in pb-24 md:pb-20">

      {/* HEADER - Compact on Mobile */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-gray-100 pb-4 md:pb-8">
        <div>
          <p className="text-gray-400 uppercase tracking-[0.2em] text-[10px] font-bold mb-1 md:mb-4">Panel de Control</p>
          <h1 className="text-3xl md:text-6xl font-display text-[#333] leading-tight flex items-center gap-2">
            {weddingData?.novios ? `${weddingData.novios[0]} & ${weddingData.novios[1]}` : 'Tu Boda'}
          </h1>
          <p className="text-gray-400 text-[10px] md:text-xs mt-2 md:mt-4 font-body font-medium tracking-widest uppercase">
            {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* MOBILE-FIRST GRID: 2 Columns on Mobile, 4 on Desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">

        {/* 1. COUNTDOWN STRIP (Col-span-2) */}
        <div className="col-span-2 bg-[#333] text-white rounded-[1.5rem] p-6 md:p-10 flex items-center justify-between relative overflow-hidden shadow-lg">
          <div className="absolute right-0 top-0 w-32 h-32 bg-gradient-to-br from-white/10 to-transparent blur-2xl rounded-full transform translate-x-10 -translate-y-10"></div>

          <div>
            <p className="text-[9px] md:text-xs font-bold tracking-[0.3em] uppercase text-gray-400 mb-1">Quedan</p>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl md:text-6xl font-light text-white leading-none">{daysLeft}</span>
              <span className="text-xs font-bold uppercase tracking-widest text-[#B88E2F]">Días</span>
            </div>
          </div>

          <div className="hidden sm:block text-right">
            <IconDiamond className="w-8 h-8 text-[#B88E2F] opacity-50 ml-auto mb-2" />
            <p className="font-serif italic text-lg">
              {weddingData?.fecha ? new Date(weddingData.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Fecha por definir'}
            </p>
          </div>
        </div>

        {/* 2. STATS (Side by Side on Mobile) */}
        <Link href="/dashboard/invitados" className="col-span-1 bg-white p-5 md:p-8 rounded-[1.5rem] border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between aspect-[4/3] md:aspect-auto group">
          <div className="flex justify-between items-start mb-2">
            <IconEnvelope className="w-6 h-6 text-gray-400 group-hover:text-[#333] transition-colors" />
            <span className="text-[10px] font-bold bg-gray-50 px-2 py-0.5 rounded-full text-gray-500">{stats.confirmedGuests} OK</span>
          </div>
          <div>
            <h3 className="text-2xl md:text-3xl font-bold text-[#333]">{stats.totalGuests}</h3>
            <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-gray-400">Invitados</p>
          </div>
        </Link>

        <Link href="/dashboard/presupuesto" className="col-span-1 bg-white p-5 md:p-8 rounded-[1.5rem] border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between aspect-[4/3] md:aspect-auto group">
          <div className="flex justify-between items-start mb-2">
            <IconWallet className="w-6 h-6 text-gray-400 group-hover:text-[#333] transition-colors" />
          </div>
          <div>
            <h3 className="text-xl md:text-3xl font-serif text-[#333] truncate">{stats.totalPaid.toLocaleString()}€</h3>
            <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-gray-400">Pagado</p>
          </div>
        </Link>

        {/* 3. QUICK ACTIONS (Col-span-2) */}
        <div className="col-span-2 bg-[#F8F8F8] p-4 md:p-8 rounded-[1.5rem] border border-gray-100">
          <div className="flex justify-between items-center mb-4 px-2">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Accesos Rápidos</h4>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-3 gap-3">
            <QuickAction icon={<IconUsers className="w-6 h-6" />} label="Lista" onClick={() => router.push('/dashboard/invitados')} />
            <QuickAction icon={<IconTable className="w-6 h-6" />} label="Mesas" onClick={() => router.push('/dashboard/mesas')} />
            <QuickAction icon={<IconBrush className="w-6 h-6" />} label="Diseño" onClick={() => router.push('/dashboard/configuracion-invitacion')} />
          </div>
        </div>

        {/* 4. TIP BANNER (Col-span-2) */}
        <div className="col-span-2 rounded-[1.5rem] bg-white border border-gray-200 p-5 md:p-8 flex items-start gap-4 shadow-sm">
          <div className="w-8 h-8 rounded-full bg-[#B88E2F]/10 text-[#B88E2F] flex items-center justify-center font-serif italic text-lg shrink-0">i</div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">Tip de la semana {currentWeek}</p>
            <p className="font-serif italic text-gray-600 text-sm md:text-lg leading-relaxed">"{weeklyTip}"</p>
          </div>
        </div>

      </div>
    </div>
  );
}

function QuickAction({ icon, label, onClick }) {
  return (
    <button onClick={onClick} className="bg-white p-3 md:p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-[#333] hover:shadow-md transition-all flex flex-col items-center justify-center gap-3 group h-full">
      <span className="text-gray-400 group-hover:text-[#333] group-hover:scale-110 transition-all duration-500">{icon}</span>
      <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-gray-400 group-hover:text-[#333] transition-colors">{label}</span>
    </button>
  );
}