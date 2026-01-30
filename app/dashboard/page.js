'use client';
import { useState, useEffect } from 'react';
import { auth, db } from '../../firebase/config';
import { doc, getDoc, collection, getDocs, query } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Card from '../../components/ui/Card';
import Link from 'next/link';

export default function DashboardOverview() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [weddingData, setWeddingData] = useState(null);
  const [stats, setStats] = useState({
    totalGuests: 0,
    confirmedGuests: 0,
    totalBudget: 0,
    totalPaid: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      auth.onAuthStateChanged(async (user) => {
        if (!user) { router.push('/login'); return; }

        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const weddingId = userDoc.data().weddingId;
          if (!weddingId) return;

          const weddingDoc = await getDoc(doc(db, 'weddings', weddingId));
          if (weddingDoc.exists()) {
            setWeddingData(weddingDoc.data());

            // 1. Get Guests Stats
            const qGuests = query(collection(db, 'weddings', weddingId, 'guests'));
            const guestsSnap = await getDocs(qGuests);
            const guests = guestsSnap.docs.map(d => d.data());

            // 2. Get Budget Stats
            const qExpenses = query(collection(db, 'weddings', weddingId, 'expenses'));
            const expensesSnap = await getDocs(qExpenses);
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
        setLoading(false);
      });
    };
    fetchData();
  }, [router]);

  const calculateDaysLeft = (dateString) => {
    if (!dateString) return 0;
    const eventDate = new Date(dateString);
    const today = new Date();
    const diffTime = eventDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  if (loading) return <div className="p-8 text-center text-boda-text-light">Cargando...</div>;

  const daysLeft = calculateDaysLeft(weddingData?.fecha);
  const guestPercentage = stats.totalGuests > 0 ? (stats.confirmedGuests / stats.totalGuests) * 100 : 0;
  const budgetPercentage = stats.totalBudget > 0 ? (stats.totalPaid / stats.totalBudget) * 100 : 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-serif text-boda-text mb-2">
          Hola, {weddingData?.novios ? weddingData.novios.join(' y ') : 'Novios'}
        </h1>
        <p className="text-boda-text-light">Aquí tienes el resumen actualizado de tu boda.</p>
      </div>

      {/* COUNTDOWN HERO */}
      <div className="bg-boda-green text-white p-8 rounded-3xl shadow-lg shadow-boda-green/20 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <p className="uppercase tracking-widest text-xs font-bold opacity-80 mb-2">Cuenta Atrás</p>
            <p className="text-5xl md:text-7xl font-bold font-script">{daysLeft} Días</p>
            <p className="text-sm opacity-90 mt-2">Para el gran día ({weddingData?.fecha})</p>
          </div>
          <div className="bg-white/20 backdrop-blur-md p-4 rounded-xl text-center min-w-[150px]">
            <span className="block text-2xl font-bold">❤️</span>
            <span className="text-sm font-medium">Todo listo</span>
          </div>
        </div>
      </div>

      {/* QUICK STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

        {/* INVITED CARD */}
        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-purple-50 rounded-xl text-purple-500 text-xl">✉️</div>
              <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded-full">{guestPercentage.toFixed(0)}% Asistencia</span>
            </div>
            <p className="text-boda-text-light text-sm font-medium">Total Invitados</p>
            <h3 className="text-3xl font-bold text-boda-text mt-1">{stats.totalGuests}</h3>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex justify-between text-xs text-boda-text-light mb-1">
              <span>Confirmados</span>
              <span className="font-bold text-purple-500">{stats.confirmedGuests}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
              <div className="bg-purple-400 h-2 rounded-full transition-all duration-1000" style={{ width: `${guestPercentage}%` }}></div>
            </div>
            <Link href="/dashboard/invitados" className="text-xs font-bold text-purple-500 hover:text-purple-700 block text-right">Gestionar →</Link>
          </div>
        </Card>

        {/* BUDGET CARD */}
        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-pink-50 rounded-xl text-pink-500 text-xl">💰</div>
            </div>
            <p className="text-boda-text-light text-sm font-medium">Pagado vs Presupuesto</p>
            <h3 className="text-3xl font-bold text-boda-text mt-1">
              {stats.totalPaid.toLocaleString()}€
              <span className="text-base text-gray-300 font-normal"> / {stats.totalBudget.toLocaleString()}€</span>
            </h3>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex justify-between text-xs text-boda-text-light mb-1">
              <span>Progreso Pagos</span>
              <span className="font-bold text-pink-500">{budgetPercentage.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
              <div className="bg-pink-400 h-2 rounded-full transition-all duration-1000" style={{ width: `${budgetPercentage}%` }}></div>
            </div>
            <Link href="/dashboard/presupuesto" className="text-xs font-bold text-pink-500 hover:text-pink-700 block text-right">Ver Detalles →</Link>
          </div>
        </Card>

        {/* TIP CARD */}
        <Card className="flex flex-col justify-between bg-gradient-to-br from-boda-bg to-white">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-blue-50 rounded-xl text-blue-500 text-xl">💡</div>
            </div>
            <h3 className="text-lg font-bold text-boda-text mb-2">Consejo del día</h3>
            <p className="text-xs text-boda-text-light leading-relaxed">
              "Recuerda confirmar el menú de niños con el catering al menos 2 semanas antes."
            </p>
          </div>
        </Card>
      </div>

      {/* SHORTCUTS */}
      <h3 className="text-lg font-bold text-boda-text mb-4">Acciones Rápidas</h3>
      <div className="flex gap-4 overflow-x-auto pb-4">
        <button onClick={() => router.push('/dashboard/invitados')} className="flex items-center gap-3 px-6 py-4 bg-white border border-gray-200 rounded-xl hover:border-boda-green hover:shadow-md transition-all min-w-[200px]">
          <span className="text-2xl">➕</span>
          <div className="text-left">
            <p className="font-bold text-boda-text text-sm">Añadir Invitado</p>
            <p className="text-xs text-gray-400">Lista de espera</p>
          </div>
        </button>
        <button onClick={() => router.push('/dashboard/presupuesto')} className="flex items-center gap-3 px-6 py-4 bg-white border border-gray-200 rounded-xl hover:border-boda-pink hover:shadow-md transition-all min-w-[200px]">
          <span className="text-2xl">💶</span>
          <div className="text-left">
            <p className="font-bold text-boda-text text-sm">Registrar Gasto</p>
            <p className="text-xs text-gray-400">Nuevo pago</p>
          </div>
        </button>
      </div>
    </div>
  );
}