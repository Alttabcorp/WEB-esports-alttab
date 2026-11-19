import type { Metadata } from "next";
import { Inter, Orbitron } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const body = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

const display = Orbitron({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "700", "900"],
});

export const metadata: Metadata = {
  title: "League Persua · Coach estatístico LoL",
  description:
    "Recomendações de campeão e build com Wilson score, lift e confiança estatística a partir do seu histórico Riot.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${body.variable} ${display.variable} h-full`}>
      <body className="min-h-full antialiased">
        <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col px-4 py-6 sm:px-6">
          <nav className="mb-8 flex items-center justify-between gap-4">
            <Link href="/" className="group flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0596aa]/20 text-sm font-bold text-[#7dd3de] ring-1 ring-[#0596aa]/40">
                LP
              </span>
              <div>
                <p className="font-[family-name:var(--font-display)] text-sm tracking-wide text-white group-hover:text-[#7dd3de]">
                  League Persua
                </p>
                <p className="text-xs text-zinc-500">ALTTAB Esports</p>
              </div>
            </Link>
            <p className="hidden text-xs text-zinc-500 sm:block">
              Decisões com confiança estatística
            </p>
          </nav>
          <main className="flex-1">{children}</main>
          <footer className="mt-12 border-t border-white/5 pt-6 text-center text-xs text-zinc-500">
            League Persua não é endossado pela Riot Games. League of Legends ©
            Riot Games.
          </footer>
        </div>
      </body>
    </html>
  );
}
