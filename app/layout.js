import { Playfair_Display, Inter } from 'next/font/google';
import "./globals.css";
import { AuthProvider } from '../context/AuthContext';

// 1. Configuramos la fuente Serif elegante (para títulos)
const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-script', // Keeping the same variable name for easy mapping, or I can change to --font-serif
});

// 2. Configuramos la fuente Sans limpia (para textos)
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
});

export const metadata = {
  title: "El Convite",
  description: "La app para organizar tu gran día",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className={`${playfair.variable} ${inter.variable} font-body bg-boda-bg text-boda-text antialiased`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}