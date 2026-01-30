'use client';
import { useState, useEffect } from 'react';
import { db } from '../../../../firebase/config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useParams } from 'next/navigation';

export default function PaginaInvitacion() {
  const { weddingId, guestId } = useParams();
  const [guest, setGuest] = useState(null);
  const [boda, setBoda] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState(null);

  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    if (!weddingId || !guestId) return;

    const fetchData = async () => {
      try {
        const bodaRef = doc(db, 'weddings', weddingId);
        const bodaSnap = await getDoc(bodaRef);
        const guestRef = doc(db, 'weddings', weddingId, 'guests', guestId);
        const guestSnap = await getDoc(guestRef);

        if (bodaSnap.exists() && guestSnap.exists()) {
          setBoda(bodaSnap.data());
          setGuest(guestSnap.data());
        }
      } catch (error) {
        console.error(error);
      }
      setLoading(false);
    };

    fetchData();
  }, [weddingId, guestId]);

  useEffect(() => {
    if (!boda?.fecha) return;

    const timer = setInterval(() => {
      const bodaDate = new Date(boda.fecha + "T00:00:00").getTime();
      const now = new Date().getTime();
      const difference = bodaDate - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
        });
      } else {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [boda]);

  const responder = async (asiste) => {
    try {
      const docRef = doc(db, 'weddings', weddingId, 'guests', guestId);
      await updateDoc(docRef, {
        confirmado: asiste,
        bus: asiste ? (guest.bus || false) : false
      });
      setGuest(prev => ({ ...prev, confirmado: asiste }));
    } catch (error) {
      alert("Error al guardar");
    }
  };

  const toggleBus = async () => {
    if (!guest.confirmado) return;
    const nuevoEstado = !guest.bus;
    const docRef = doc(db, 'weddings', weddingId, 'guests', guestId);
    await updateDoc(docRef, { bus: nuevoEstado });
    setGuest(prev => ({ ...prev, bus: nuevoEstado }));
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-boda-bg text-boda-green font-bold animate-pulse">Cargando invitación...</div>;
  if (!boda || !guest) return <div className="text-center p-10">Invitación no encontrada</div>;

  const config = boda.invitationConfig || {};
  const busConfig = boda.busConfig || {};

  return (
    <div className="min-h-screen bg-boda-bg flex items-center justify-center p-4 md:p-8 relative">

      <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden relative border border-white/50 pb-10">

        {/* HEADER */}
        <div className="h-40 bg-gradient-to-b from-slate-50 to-white flex items-center justify-center relative overflow-hidden">
          <span className="text-6xl z-10 opacity-80">🌿</span>
        </div>

        <div className="px-8 text-center space-y-8 -mt-10 relative z-10">

          {/* INFO BODA */}
          <div>
            <p className="text-boda-text-light text-xs tracking-[0.3em] uppercase font-bold mb-4 opacity-70">
              {boda.fecha}
            </p>
            <h1 className="font-serif text-5xl text-boda-text mb-2 leading-tight">
              {boda.novios ? boda.novios[0] : ''} <span className="text-3xl text-boda-green italic">&</span> {boda.novios ? boda.novios[1] : ''}
            </h1>

            <div className="flex justify-center gap-4 mt-6 mb-6 scale-90">
              <TimeBox num={timeLeft.days} label="Días" />
              <TimeBox num={timeLeft.hours} label="Hrs" />
              <TimeBox num={timeLeft.minutes} label="Min" />
            </div>
          </div>

          {/* FORMAL TEXT */}
          <div className="pt-2">
            <p className="font-serif italic text-xl text-boda-text mb-4">
              Querido/a {guest.nombre},
            </p>
            <p className="text-boda-text-light text-sm leading-relaxed px-4 font-light">
              Tenemos el inmenso placer de invitarte a celebrar nuestro enlace. Un día lleno de amor que no sería lo mismo sin ti.
            </p>
          </div>

          {/* CONFIRMACION */}
          <div className="flex justify-center gap-4 pt-2">
            <button
              onClick={() => responder(true)}
              className={`px-8 py-3 rounded-full transition-all duration-500 font-serif text-sm ${guest.confirmado === true
                ? 'bg-boda-text text-white shadow-xl scale-105'
                : 'bg-transparent border border-boda-text text-boda-text hover:bg-boda-text hover:text-white'
                }`}
            >
              Asistiré
            </button>

            <button
              onClick={() => responder(false)}
              className={`px-6 py-3 rounded-full transition-all duration-300 font-serif text-xs ${guest.confirmado === false
                ? 'bg-gray-200 text-gray-500 shadow-inner'
                : 'text-gray-400 hover:text-gray-600'
                }`}
            >
              No podré
            </button>
          </div>

          {/* MODULE ICONS */}
          <div className="flex justify-center flex-wrap gap-6 pt-8 border-t border-gray-50">

            {config.location?.enabled && (
              <ModuleButton icon="📍" label="Mapa" onClick={() => setActiveModal('location')} />
            )}

            {config.timeline?.enabled && config.timeline.events?.length > 0 && (
              <ModuleButton icon="📅" label="Agenda" onClick={() => setActiveModal('timeline')} />
            )}

            {config.bank?.enabled && (
              <ModuleButton icon="🎁" label="Regalo" onClick={() => setActiveModal('bank')} />
            )}

            {/* BUS BTN: ONLY VISIBLE IF ACTIVATED IN DASHBOARD AND GUEST CONFIRMED */}
            {guest.confirmado === true && busConfig.enabled && (
              <ModuleButton icon="🚌" label="Bus" onClick={() => setActiveModal('bus')} active={guest.bus} />
            )}

          </div>

        </div>
      </div>

      {/* --- MODALS --- */}
      {activeModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setActiveModal(null)}>
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl relative animate-scale-up" onClick={e => e.stopPropagation()}>
            <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200">×</button>

            {/* LOCATION MODAL */}
            {activeModal === 'location' && (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">📍</div>
                <h3 className="font-serif text-2xl mb-2 text-boda-text">Ubicación</h3>
                <p className="text-gray-600 mb-6 font-light">{config.location.address}</p>
                {config.location.mapUrl && (
                  <a href={config.location.mapUrl} target="_blank" className="bg-boda-text text-white px-6 py-3 rounded-xl text-sm font-bold shadow-lg hover:bg-black transition block">
                    Abrir en Google Maps
                  </a>
                )}
              </div>
            )}

            {/* TIMELINE MODAL */}
            {activeModal === 'timeline' && (
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">📅</div>
                <h3 className="font-serif text-2xl mb-6 text-boda-text">Agenda del Día</h3>
                <div className="space-y-0 text-left relative pl-4 border-l border-gray-100 ml-4 max-h-[50vh] overflow-y-auto">
                  {config.timeline.events.map((ev, i) => (
                    <div key={i} className="mb-6 relative">
                      <div className="absolute -left-[21px] top-1 w-3 h-3 bg-purple-400 rounded-full border-2 border-white"></div>
                      <span className="font-bold text-sm text-boda-text block">{ev.time}</span>
                      <span className="text-sm text-gray-500 font-light">{ev.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* BANK MODAL */}
            {activeModal === 'bank' && (
              <div className="text-center">
                <div className="w-16 h-16 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">🎁</div>
                <h3 className="font-serif text-2xl mb-4 text-boda-text">Regalo</h3>
                <p className="text-gray-600 mb-6 italic text-sm">"{config.bank.message || 'Vuestra presencia es nuestro mejor regalo'}"</p>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="text-xs text-gray-400 mb-1 uppercase tracking-widest">IBAN / Cuenta</p>
                  <p className="font-mono text-sm text-gray-800 select-all font-bold">{config.bank.iban}</p>
                </div>
              </div>
            )}

            {/* BUS MODAL (UPDATED WITH CONFIG) */}
            {activeModal === 'bus' && (
              <div className="text-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl transition-colors ${guest.bus ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-400'}`}>🚌</div>
                <h3 className="font-serif text-2xl mb-2 text-boda-text">Servicio de Autobús</h3>

                <div className="bg-purple-50 rounded-xl p-4 my-6 text-left space-y-3">
                  {busConfig.routes?.map(r => (
                    <div key={r.id}>
                      <p className="text-xs font-bold text-purple-800 uppercase mb-1">{r.name}</p>
                      <p className="text-sm text-gray-700">🕙 <b>{r.time || '--:--'}</b> - {r.location || 'Por definir'}</p>
                    </div>
                  ))}
                  {busConfig.notes && (
                    <p className="text-xs text-gray-500 italic pt-2 border-t border-purple-100">{busConfig.notes}</p>
                  )}
                </div>

                <button
                  onClick={() => toggleBus()}
                  className={`w-full py-3 rounded-xl font-bold transition-all ${guest.bus
                    ? 'bg-purple-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                >
                  {guest.bus ? 'Sí, quiero plaza en el bus ✓' : 'Confirmar plaza en el bus'}
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}

function TimeBox({ num, label }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-12 h-12 rounded-full border border-boda-green/30 flex items-center justify-center mb-1 bg-white shadow-sm">
        <span className="font-serif text-lg text-boda-text">
          {num < 10 ? `0${num}` : num}
        </span>
      </div>
      <span className="text-[9px] uppercase tracking-widest text-boda-text-light">{label}</span>
    </div>
  );
}

function ModuleButton({ icon, label, onClick, active }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2 group">
      <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-sm border transition-all duration-300 group-hover:scale-110 ${active
        ? 'bg-boda-text text-white border-boda-text shadow-lg'
        : 'bg-white border-gray-100 text-gray-600 hover:border-boda-green/50'
        }`}>
        {icon}
      </div>
      <span className="text-[10px] uppercase tracking-widest text-gray-400 group-hover:text-boda-text transition-colors">{label}</span>
    </button>
  );
}