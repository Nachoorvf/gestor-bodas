import { Great_Vibes, Montserrat } from 'next/font/google';
import "./globals.css";

// 1. Configuramos la fuente manuscrita (para títulos)
const greatVibes = Great_Vibes({ 
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-script', // Esta variable la usaremos en Tailwind
});

// 2. Configuramos la fuente moderna (para textos)
const montserrat = Montserrat({ 
  subsets: ['latin'],
  variable: '--font-body',
});

export const metadata = {
  title: "Gestor de Bodas",
  description: "La app para organizar tu gran día",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className={`${greatVibes.variable} ${montserrat.variable} font-body bg-boda-bg text-boda-text antialiased`}>
        {children}
      </body>
    </html>
  );
}