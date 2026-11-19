import type { Metadata, Viewport } from "next";
import { Manrope, Orbitron } from "next/font/google";
import Link from "next/link";
import { NavLinks } from "@/components/NavLinks";
import "./globals.css";

const body = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const display = Orbitron({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "700"],
});

export const metadata: Metadata = {
  title: "League Persua · Coach estatístico LoL",
  description:
    "Companion de ranked: picks, builds e itens com base no seu histórico — ALTTAB Esports.",
  applicationName: "League Persua",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "League Persua",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#070c10",
  viewportFit: "cover",
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${body.variable} ${display.variable} h-full`}>
      <body className="min-h-full font-sans antialiased">
        <div className="mx-auto flex min-h-full w-full max-w-7xl flex-col px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
          <header className="mb-5 flex items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
            <Link href="/" className="group flex min-h-11 items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--alttab)]/15 text-xs font-bold text-[var(--alttab-soft)] ring-1 ring-[var(--border-strong)]">
                LP
              </span>
              <div>
                <p className="font-[family-name:var(--font-display)] text-sm tracking-wide text-white group-hover:text-[var(--alttab-soft)]">
                  League Persua
                </p>
                <p className="text-[11px] text-[var(--muted)]">ALTTAB Esports</p>
              </div>
            </Link>
            <NavLinks />
          </header>
          <main className="flex-1">{children}</main>
          <footer className="mt-10 border-t border-[var(--border)] pt-5 text-center text-[11px] text-[var(--muted)]/80">
            League Persua não é endossado pela Riot Games. League of Legends ©
            Riot Games.
          </footer>
        </div>
      </body>
    </html>
  );
}
