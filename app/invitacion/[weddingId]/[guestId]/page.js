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
  const [animateEntrance, setAnimateEntrance] = useState(false);

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
          setTimeout(() => setAnimateEntrance(true), 100);
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

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9F9F9]">
      <div className="animate-pulse flex flex-col items-center">
        <span className="text-4xl mb-4">🌿</span>
        <p className="font-serif text-[#333] tracking-widest text-sm uppercase">Cargando Invitación...</p>
      </div>
    </div>
  );

  if (!boda || !guest) return <div className="text-center p-10 font-serif text-[#333]">Invitación no encontrada</div>;

  const config = boda.invitationConfig || {};
  const busConfig = boda.busConfig || {};

  return (
    <div className="min-h-screen bg-[#F0F0F0] flex items-center justify-center p-4 md:p-8 relative overflow-hidden">
      {/* BACKGROUND TEXTURE */}
      <div className="absolute inset-0 opacity-40 bg-[url('https://www.transparenttextures.com/patterns/linen.png')] mix-blend-multiply"></div>

      {/* MAIN CARD CONTAINER - GLASSMORPHISM */}
      <div className={`
          w-full max-w-md bg-white/90 backdrop-blur-xl rounded-[2rem] shadow-2xl overflow-hidden relative border border-white/50 pb-10 transition-all duration-1000 ease-out transform
          ${animateEntrance ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}
      `}>

        {/* HEADER IMAGE / BANNER */}
        <div className="h-56 bg-gray-100 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1519741497674-611481863552?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80')] bg-cover bg-center opacity-80 filter grayscale hover:grayscale-0 transition-all duration-1000"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent"></div>
        </div>

        <div className="px-8 text-center space-y-8 -mt-20 relative z-10">

          {/* WEDDING INFO */}
          <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-sm border border-gray-50 flex flex-col items-center text-center">
            <p className="text-[#333] text-[10px] tracking-[0.3em] uppercase font-bold mb-4 opacity-60">
              {new Date(boda.fecha).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <h1 className="font-display text-5xl text-[#333] mb-2 leading-none flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 w-full">
              <span className="text-center w-full md:w-auto">{boda.novios ? boda.novios[0] : ''}</span>
              <span className="text-3xl text-boda-accent italic font-light">&</span>
              <span className="text-center w-full md:w-auto">{boda.novios ? boda.novios[1] : ''}</span>
            </h1>
          </div>

          {/* COUNTDOWN */}
          <div className="flex justify-center gap-6 py-4">
            <TimeBox num={timeLeft.days} label="Días" />
            <div className="h-8 w-[1px] bg-gray-200 self-center"></div>
            <TimeBox num={timeLeft.hours} label="Hrs" />
          </div>

          {/* FORMAL TEXT */}
          <div className="px-2">
            <p className="font-display italic text-2xl text-[#333] mb-4">
              Querido/a {guest.nombre.split(' ')[0]},
            </p>
            <p className="text-[#333]/80 text-sm leading-relaxed font-light font-sans">
              "Tenemos el inmenso placer de invitarte a celebrar nuestro enlace. Un día lleno de amor que no sería lo mismo sin ti."
            </p>
          </div>

          {/* RSVP ACTIONS */}
          <div className="flex flex-col gap-3 pt-2">
            <button
              onClick={() => responder(true)}
              className={`w-full py-4 rounded-xl transition-all duration-500 font-bold text-xs uppercase tracking-[0.2em] relative overflow-hidden group ${guest.confirmado === true
                ? 'bg-[#333] text-white shadow-xl'
                : 'bg-white border border-[#333] text-[#333] hover:bg-[#333] hover:text-white'
                }`}
            >
              <span className="relative z-10">{guest.confirmado === true ? 'Asistencia Confirmada ✓' : 'Confirmar Asistencia'}</span>
            </button>

            {guest.confirmado !== false && (
              <button
                onClick={() => responder(false)}
                className="text-[10px] text-gray-400 uppercase tracking-widest hover:text-red-400 transition-colors py-2"
              >
                No podré asistir
              </button>
            )}
            {guest.confirmado === false && (
              <p className="text-xs text-gray-400 italic">Has indicado que no asistirás.</p>
            )}
          </div>

          {/* MODULE ICONS */}
          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-100">
            {config.location?.enabled && (
              <ModuleButton icon="📍" label="Mapa" onClick={() => setActiveModal('location')} />
            )}
            {config.timeline?.enabled && config.timeline.events?.length > 0 && (
              <ModuleButton icon="📅" label="Agenda" onClick={() => setActiveModal('timeline')} />
            )}
            {config.bank?.enabled && (
              <ModuleButton icon="🎁" label="Regalo" onClick={() => setActiveModal('bank')} />
            )}
            {/* BUS BTN: ONLY IF CONFIRMED */}
            {guest.confirmado === true && busConfig.enabled && (
              <ModuleButton icon="🚌" label="Bus" onClick={() => setActiveModal('bus')} active={guest.bus} />
            )}
          </div>

        </div>
      </div>

      {/* --- MODALS (REFINED) --- */}
      {activeModal && (
        <div className="fixed inset-0 bg-[#333]/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4 animate-fade-in" onClick={() => setActiveModal(null)}>
          <div
            className="bg-white w-full max-w-sm rounded-t-[2rem] md:rounded-[2rem] p-8 pb-12 md:pb-8 shadow-2xl relative animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-6 md:hidden"></div>

            <button onClick={() => setActiveModal(null)} className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center bg-gray-50 rounded-full text-gray-400 hover:bg-gray-100 transition hidden md:flex">×</button>

            {/* LOCATION MODAL */}
            {activeModal === 'location' && (
              <div className="text-center">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl text-[#333]">📍</div>
                <h3 className="font-display text-2xl mb-2 text-[#333]">Ubicación</h3>
                <p className="text-gray-500 mb-8 font-light text-sm px-4">{config.location.address}</p>
                {config.location.mapUrl && (
                  <a href={config.location.mapUrl} target="_blank" className="block w-full py-4 bg-[#333] text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg hover:bg-black transition">
                    Ver en Google Maps
                  </a>
                )}
              </div>
            )}

            {/* TIMELINE MODAL */}
            {activeModal === 'timeline' && (
              <div className="text-center">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl text-[#333]">📅</div>
                <h3 className="font-display text-2xl mb-6 text-[#333]">Agenda</h3>
                <div className="space-y-0 text-left relative pl-6 border-l border-gray-100 ml-6 max-h-[50vh] overflow-y-auto pr-2">
                  {config.timeline.events.map((ev, i) => (
                    <div key={i} className="mb-8 relative last:mb-0">
                      <div className="absolute -left-[31px] top-1 w-4 h-4 bg-[#333] rounded-full border-4 border-white shadow-sm"></div>
                      <span className="font-bold text-lg text-[#333] block leading-none mb-1">{ev.time}</span>
                      <span className="text-sm text-gray-500 font-light uppercase tracking-wide">{ev.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* BANK MODAL */}
            {activeModal === 'bank' && (
              <div className="text-center">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl text-[#333]">🎁</div>
                <h3 className="font-display text-2xl mb-4 text-[#333]">Regalo</h3>
                <p className="text-gray-500 mb-6 italic font-serif leading-relaxed px-4">"{config.bank.message || 'Vuestra presencia es nuestro mejor regalo'}"</p>
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 relative overflow-hidden group">
                  <p className="text-[10px] text-gray-400 mb-2 uppercase tracking-widest font-bold">IBAN / Cuenta</p>
                  <p className="font-mono text-sm text-[#333] select-all font-medium tracking-wide">{config.bank.iban}</p>
                </div>
              </div>
            )}

            {/* BUS MODAL */}
            {activeModal === 'bus' && (
              <div className="text-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl transition-colors ${guest.bus ? 'bg-[#333] text-white' : 'bg-gray-50 text-[#333]'}`}>🚌</div>
                <h3 className="font-display text-2xl mb-2 text-[#333]">Autobús</h3>
                <p className="text-xs text-gray-400 uppercase tracking-widest mb-6">Información de rutas</p>

                <div className="bg-gray-50 rounded-xl p-5 mb-6 text-left space-y-4 border border-gray-100">
                  {busConfig.routes?.map(r => (
                    <div key={r.id} className="flex justify-between items-start">
                      <div>
                        <p className="text-[10px] font-bold text-[#333] uppercase mb-1">{r.name}</p>
                        <p className="text-sm text-gray-600">{r.location || 'Ubicación pendiente'}</p>
                      </div>
                      <div className="bg-white px-2 py-1 rounded text-xs font-bold border border-gray-100 shadow-sm">{r.time || '--:--'}</div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => toggleBus()}
                  className={`w-full py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${guest.bus
                    ? 'bg-[#333] text-white shadow-lg'
                    : 'bg-white border border-gray-200 text-gray-500 hover:border-[#333] hover:text-[#333]'
                    }`}
                >
                  {guest.bus ? 'Plaza Reservada ✓' : 'Reservar Plaza'}
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
    <div className="flex flex-col items-center min-w-[3rem]">
      <span className="font-display text-3xl text-[#333] leading-none mb-1">
        {num < 10 ? `0${num}` : num}
      </span>
      <span className="text-[9px] uppercase tracking-[0.2em] text-gray-400">{label}</span>
    </div>
  );
}

function ModuleButton({ icon, label, onClick, active }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2 group p-2 rounded-xl hover:bg-gray-50 transition-colors">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-sm border transition-all duration-300 group-hover:scale-110 ${active
        ? 'bg-[#333] text-white border-[#333]'
        : 'bg-white border-gray-100 text-gray-500 group-hover:border-[#333]'
        }`}>
        {icon}
      </div>
      <span className="text-[9px] uppercase tracking-widest text-gray-400 group-hover:text-[#333] transition-colors">{label}</span>
      {active && <div className="w-1 h-1 bg-[#333] rounded-full mt-[-4px]"></div>}
    </button>
  );
}