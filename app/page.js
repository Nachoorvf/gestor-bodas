import Image from 'next/image';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar />

      {/* HERO SECTION - Editorial Style */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
        {/* Abstract Background Texture */}
        <div className="absolute inset-0 z-0 opacity-[0.03]" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/p5.png")' }}></div>

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          <p className="text-boda-accent uppercase tracking-[0.2em] text-sm md:text-base mb-6 font-medium animate-fade-in-up">
            Planificación de Bodas
          </p>
          <h1 className="font-script text-6xl md:text-8xl lg:text-9xl text-boda-text mb-8 leading-[0.9] animate-fade-in-up delay-100">
            El Convite
          </h1>
          <div className="h-px w-32 bg-boda-accent mx-auto mb-10"></div>
          <p className="font-body text-xl md:text-2xl text-gray-600 max-w-2xl mx-auto font-light leading-relaxed mb-12 animate-fade-in-up delay-200">
            Donde la organización impecable se encuentra con la elegancia atemporal. Diseñe el día más importante de su vida, sin esfuerzo.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center animate-fade-in-up delay-300">
            <Link
              href="/login"
              className="px-10 py-4 bg-boda-text text-white font-medium tracking-wide text-sm uppercase hover:bg-black transition-all duration-500 ease-out border border-boda-text hover:shadow-2xl hover:shadow-gray-200"
            >
              Comenzar la Experiencia
            </Link>
            <Link
              href="#features"
              className="px-10 py-4 bg-transparent text-boda-text border border-gray-300 font-medium tracking-wide text-sm uppercase hover:border-boda-text hover:bg-gray-50 transition-all duration-500"
            >
              Descubrir Más
            </Link>
          </div>
        </div>
      </section>

      {/* FEATUES - Bento Editorial Layout */}
      <section id="features" className="py-32 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-0 border border-gray-200 bg-white shadow-xl shadow-gray-200/50">

            {/* Feature 1 */}
            <div className="md:col-span-8 p-12 md:p-20 border-b md:border-b-0 md:border-r border-gray-100 flex flex-col justify-center">
              <span className="text-boda-accent text-6xl font-serif mb-6 block opacity-20">01</span>
              <h3 className="text-3xl font-serif text-boda-text mb-4">Invitaciones Digitales</h3>
              <p className="text-gray-500 font-light leading-loose text-lg">
                La primera impresión es la que cuenta. Diseñe invitaciones digitales que cautiven a sus invitados desde el primer clic. Gestión de RSVP en tiempo real, elegante y sin fricción.
              </p>
            </div>

            <div className="md:col-span-4 bg-[#F5F5F0] min-h-[300px] relative overflow-hidden group">
              {/* Placeholder for image */}
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1519225421980-715cb0202128?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center grayscale group-hover:grayscale-0 transition-all duration-700 ease-in-out opacity-80"></div>
            </div>

            {/* Feature 2 */}
            <div className="md:col-span-4 bg-[#1a1a1a] min-h-[300px] relative overflow-hidden flex items-center justify-center p-12">
              <div className="text-center">
                <span className="text-boda-accent text-5xl mb-4 block">€</span>
                <p className="text-white/80 font-serif text-xl italic">"El lujo reside en los detalles, y en el control."</p>
              </div>
            </div>

            <div className="md:col-span-8 p-12 md:p-20 border-t border-gray-100 flex flex-col justify-center">
              <span className="text-boda-accent text-6xl font-serif mb-6 block opacity-20">02</span>
              <h3 className="text-3xl font-serif text-boda-text mb-4">Control Financiero Exquisito</h3>
              <p className="text-gray-500 font-light leading-loose text-lg">
                Mantenga la elegancia en sus cuentas. Un seguimiento detallado de cada inversión, asegurando que su visión se materialice sin comprometer la tranquilidad.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* QUOTE SECTION */}
      <section className="py-32 bg-boda-text text-white text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] animate-pulse-slow"></div>
        <div className="max-w-4xl mx-auto px-6 relative z-10">
          <p className="font-serif text-3xl md:text-5xl leading-tight mb-10 italic text-white/90">
            "La sofisticación suprema es la simplicidad."
          </p>
          <div className="flex items-center justify-center gap-4 opacity-60">
            <div className="h-px w-12 bg-boda-accent"></div>
            <span className="uppercase tracking-widest text-sm text-boda-accent">Leonardo da Vinci</span>
            <div className="h-px w-12 bg-boda-accent"></div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS - Minimalist */}
      <section id="testimonials" className="py-32">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="font-script text-5xl text-boda-text mb-6">Historias de Amor</h2>
            <p className="text-gray-400 uppercase tracking-widest text-sm">Parejas que confiaron en nosotros</p>
          </div>

          <div className="grid md:grid-cols-2 gap-16">
            <div className="bg-white p-10 border border-gray-100 shadow-sm hover:shadow-xl transition-shadow duration-500 group">
              <div className="text-boda-accent text-6xl font-serif mb-6 opacity-30">"</div>
              <p className="text-gray-600 font-light text-xl leading-relaxed mb-8 group-hover:text-black transition-colors">
                Absolutamente esencial. Transformó el caos de la planificación en un proceso sereno y disfrutable. Nuestros invitados quedaron maravillados.
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded-full overflow-hidden">
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center text-xs text-gray-400">IMG</div>
                </div>
                <div>
                  <p className="font-bold text-sm tracking-wide uppercase text-boda-text">Sofía & Marc</p>
                  <p className="text-xs text-gray-400">Madrid, 2024</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-10 border border-gray-100 shadow-sm hover:shadow-xl transition-shadow duration-500 group">
              <div className="text-boda-accent text-6xl font-serif mb-6 opacity-30">"</div>
              <p className="text-gray-600 font-light text-xl leading-relaxed mb-8 group-hover:text-black transition-colors">
                La herramienta de presupuesto es una obra de arte por sí misma. Elegante, intuitiva y precisa. No podríamos haberlo hecho sin El Convite.
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded-full overflow-hidden">
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center text-xs text-gray-400">IMG</div>
                </div>
                <div>
                  <p className="font-bold text-sm tracking-wide uppercase text-boda-text">Elena & Javier</p>
                  <p className="text-xs text-gray-400">Sevilla, 2024</p>
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