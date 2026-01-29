import Link from 'next/link'; // Importamos la herramienta de enlaces de Next.js

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-4">Gestor de Bodas</h1>
      <p className="mb-8 text-xl">Bienvenido a la plataforma de gestión.</p>
      
      {/* Este es el botón que te lleva a la otra página */}
      <Link 
        href="/login" 
        className="bg-blue-500 text-white px-6 py-3 rounded-lg text-lg hover:bg-blue-600 transition"
      >
        Ir a Iniciar Sesión
      </Link>
    </div>
  );
}