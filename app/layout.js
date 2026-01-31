import { Playfair_Display, Inter, Cormorant_Garamond } from 'next/font/google';
import "./globals.css";
import { AuthProvider } from '../context/AuthContext';

// 1. Configuramos la fuente Serif elegante (para títulos)
const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-script',
});

// 2. Configuramos la fuente Sans limpia (para textos)
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
});

// 3. ALTERNATIVA: Cormorant Garamond (Más clásica, ampersand diferente)
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-display',
});

export const metadata = {
  title: "El Convite",
  description: "La app para organizar tu gran día",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className={`${playfair.variable} ${inter.variable} ${cormorant.variable} font-body bg-boda-bg text-boda-text antialiased`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}