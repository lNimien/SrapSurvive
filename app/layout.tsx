import type { Metadata } from 'next';
import { Orbitron, Share_Tech_Mono, Geist } from 'next/font/google';
import './globals.css';
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const orbitron = Orbitron({
  variable: '--font-orbitron',
  subsets: ['latin'],
  weight: ['400', '600', '800', '900'],
});

const shareTechMono = Share_Tech_Mono({
  variable: '--font-share-tech-mono',
  subsets: ['latin'],
  weight: '400',
});

export const metadata: Metadata = {
  title: 'Scrap & Survive',
  description:
    'Idle Extraction RPG. Equipa a tu chatarrero, lanza expediciones automáticas y extrae antes de que ocurra la catástrofe.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={cn(orbitron.variable, shareTechMono.variable, "font-sans", geist.variable)}>
      <body>{children}</body>

    </html>
  );
}
