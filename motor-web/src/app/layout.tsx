import type { Metadata } from 'next';
import { Quicksand, Nunito, Cormorant_Garamond } from 'next/font/google';
import './globals.css';

const quicksand = Quicksand({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-quicksand',
});

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  variable: '--font-nunito',
});

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-cormorant',
});

export const metadata: Metadata = {
  title: 'AMVI · Tu Agencia de Marketing Virtual Inhouse',
  description: 'Módulo 1: Motor de generación de contenido visual premium',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html 
      lang="es" 
      className={`${quicksand.variable} ${nunito.variable} ${cormorant.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
