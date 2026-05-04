import type { Metadata } from "next";
import { Inter, Caveat } from "next/font/google";
import "./globals.css";

/**
 * Tipografías de Blue Book.
 *
 * - Inter: sans-serif para títulos, UI, body. Geométrico, clásico, neutro.
 * - Caveat: cursiva manuscrita para reseñas, marca, anotaciones decorativas.
 *   La cursiva es semántica — significa "esto es íntimo, esto es tuyo".
 *
 * Ambas se cargan con `next/font/google` (auto-optimized, sin FOUT).
 */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Blue Book — Tu diario de música",
    template: "%s · Blue Book",
  },
  description:
    "Captura los momentos de tu vida con música. Un diario, no un servicio de streaming.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${caveat.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
