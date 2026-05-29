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
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    const fetchWeddingDetails = async () => {
      if (userData?.weddingId) {
        const weddingDoc = await getDoc(doc(db, 'weddings', userData.weddingId));
        if (weddingDoc.exists()) {
          setWeddingData(weddingDoc.data());

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
    <div className="space-y-8 md:space-y-12 pb-24 md:pb-20">

      {/* HEADER */}
      <div className="flex flex-col border-b border-black/5 pb-8 animate-fade-in-up">
        <p className="text-apple-text-secondary text-sm font-medium mb-2">Panel de Control</p>
        <h1 className="text-4xl md:text-6xl font-display text-apple-text leading-tight tracking-tight">
          {weddingData?.novios ? (
            <>
              <span className="italic font-script">{weddingData.novios[0]}</span> 
              <span className="font-light mx-2">&</span> 
              <span className="italic font-script">{weddingData.novios[1]}</span>
            </>
          ) : 'Tu Boda'}
        </h1>
        <p className="text-apple-text-secondary text-sm mt-2">
          {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* BENTO GRID LAYOUT */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">

        {/* 1. COUNTDOWN HERO (Col-span-2) */}
        <div className="col-span-2 bg-apple-surface rounded-3xl p-8 md:p-10 flex items-center justify-between shadow-apple-sm hover:shadow-apple-md transition-shadow duration-300 animate-fade-in-up animation-delay-100">
          <div>
            <p className="text-sm font-medium text-apple-text-secondary mb-2">Quedan</p>
            <div className="flex items-baseline gap-2">
              <span className="text-6xl md:text-7xl font-light text-apple-text tracking-tighter">{daysLeft}</span>
              <span className="text-base font-medium text-apple-text-secondary">días</span>
            </div>
          </div>

          <div className="hidden sm:block text-right">
            <div className="w-12 h-12 rounded-full bg-apple-bg flex items-center justify-center ml-auto mb-4 text-apple-text">
                <IconDiamond className="w-6 h-6" />
            </div>
            <p className="text-lg font-medium text-apple-text">{new Date(weddingData?.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
          </div>
        </div>

        {/* 2. GUESTS STAT */}
        <Link href="/dashboard/invitados" className="col-span-1 bg-apple-surface p-6 md:p-8 rounded-3xl shadow-apple-sm hover:shadow-apple-md transition-shadow duration-300 flex flex-col justify-between aspect-square md:aspect-auto group animate-fade-in-up animation-delay-200">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2.5 bg-apple-bg rounded-full text-apple-text-secondary group-hover:text-apple-text transition-colors">
                <IconEnvelope className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium bg-green-50 text-green-700 px-2 py-1 rounded-full">{stats.confirmedGuests} OK</span>
          </div>
          <div>
            <h3 className="text-3xl md:text-4xl font-semibold text-apple-text mb-1 tracking-tight">{stats.totalGuests}</h3>
            <p className="text-sm font-medium text-apple-text-secondary">Invitados</p>
          </div>
        </Link>

        {/* 3. BUDGET STAT */}
        <Link href="/dashboard/presupuesto" className="col-span-1 bg-apple-surface p-6 md:p-8 rounded-3xl shadow-apple-sm hover:shadow-apple-md transition-shadow duration-300 flex flex-col justify-between aspect-square md:aspect-auto group animate-fade-in-up animation-delay-300">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2.5 bg-apple-bg rounded-full text-apple-text-secondary group-hover:text-apple-text transition-colors">
                <IconWallet className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl md:text-4xl font-semibold text-apple-text mb-1 tracking-tight truncate">{stats.totalPaid.toLocaleString()}€</h3>
            <p className="text-sm font-medium text-apple-text-secondary">Pagado</p>
          </div>
        </Link>

        {/* 4. QUICK ACTIONS */}
        <div className="col-span-2 bg-transparent animate-fade-in-up animation-delay-400">
          <p className="text-sm font-medium text-apple-text-secondary mb-4 px-1">Accesos Rápidos</p>
          <div className="grid grid-cols-3 gap-4">
            <QuickAction icon={<IconUsers className="w-6 h-6" />} label="Lista" onClick={() => router.push('/dashboard/invitados')} />
            <QuickAction icon={<IconTable className="w-6 h-6" />} label="Mesas" onClick={() => router.push('/dashboard/mesas')} />
            <QuickAction icon={<IconBrush className="w-6 h-6" />} label="Diseño" onClick={() => router.push('/dashboard/configuracion-invitacion')} />
          </div>
        </div>

        {/* 5. TIP BANNER */}
        <div className="col-span-2 bg-apple-surface rounded-3xl shadow-apple-sm p-6 md:p-8 flex items-start gap-5 animate-fade-in-up animation-delay-500">
          <div className="w-10 h-10 rounded-full bg-apple-bg flex items-center justify-center shrink-0 text-apple-text">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <div>
            <p className="text-sm font-medium text-apple-text-secondary mb-1">Inspiración (Semana {currentWeek})</p>
            <p className="text-lg font-medium text-apple-text">"{weeklyTip}"</p>
          </div>
        </div>

      </div>
    </div>
  );
}

function QuickAction({ icon, label, onClick }) {
  return (
    <button onClick={onClick} className="bg-apple-surface p-4 md:p-6 rounded-3xl shadow-apple-sm hover:shadow-apple-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col items-center justify-center gap-3 group h-full">
      <div className="text-apple-text-secondary group-hover:text-apple-text transition-colors">
        {icon}
      </div>
      <span className="text-xs font-medium text-apple-text-secondary group-hover:text-apple-text transition-colors">{label}</span>
    </button>
  );
}