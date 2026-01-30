import Image from 'next/image';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-white/50 to-transparent"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <span className="font-script text-boda-green text-3xl md:text-5xl mb-4 block animate-fade-in-up">
            Tu boda, perfecta
          </span>
          <h1 className="text-5xl md:text-7xl font-bold text-boda-text mb-6 tracking-tight">
            Organiza el día <br />
            <span className="text-boda-pink-dark">de tus sueños</span>
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-xl text-boda-text-light mb-10">
            La herramienta todo en uno para gestionar invitados, presupuesto y cada detalle especial sin estrés.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button href="/login" variant="primary" className="text-lg px-8 py-4">
              Comenzar Gratis
            </Button>
            <Button href="#features" variant="outline" className="text-lg px-8 py-4">
              Descubrir más
            </Button>
          </div>
        </div>

        {/* Abstract shapes/decoration */}
        <div className="absolute top-1/4 left-0 w-64 h-64 bg-boda-pink-light/30 rounded-full blur-3xl -z-10 animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-boda-green-light/30 rounded-full blur-3xl -z-10 animate-pulse delay-1000"></div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-boda-text mb-4">Todo lo que necesitas</h2>
            <p className="text-boda-text-light max-w-2xl mx-auto">
              Simplificamos la planificación para que tú solo te preocupes de disfrutar.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center">
              <div className="w-12 h-12 bg-boda-green/10 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                ✉️
              </div>
              <h3 className="text-xl font-bold text-boda-text mb-2">Invitaciones Digitales</h3>
              <p className="text-boda-text-light">
                Crea, envía y gestiona las confirmaciones de asistencia (RSVP) en tiempo real.
              </p>
            </Card>

            <Card className="text-center">
              <div className="w-12 h-12 bg-boda-pink/10 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                💰
              </div>
              <h3 className="text-xl font-bold text-boda-text mb-2">Control de Presupuesto</h3>
              <p className="text-boda-text-light">
                Lleva un seguimiento detallado de cada gasto y evita sorpresas de última hora.
              </p>
            </Card>

            <Card className="text-center">
              <div className="w-12 h-12 bg-boda-green/10 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                📅
              </div>
              <h3 className="text-xl font-bold text-boda-text mb-2">Agenda Inteligente</h3>
              <p className="text-boda-text-light">
                Cronograma del día, listas de tareas y recordatorios automáticos.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials / Social Proof */}
      <section id="testimonials" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-boda-green-dark rounded-3xl p-8 md:p-16 text-center shadow-xl relative overflow-hidden">
            {/* Decorative pattern */}
            <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>

            <div className="relative z-10">
              <span className="font-script text-white/80 text-3xl mb-4 block">Ellos dijeron sí...</span>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-8">
                "La mejor decisión que tomamos para nuestra boda, aparte de casarnos."
              </h2>
              <div className="flex items-center justify-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-white font-bold">
                  M&J
                </div>
                <div className="text-left text-white">
                  <p className="font-bold">María y Juan</p>
                  <p className="text-sm opacity-80">Casados en 2024</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}