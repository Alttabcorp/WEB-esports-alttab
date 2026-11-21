import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import { NavLinks } from "@/components/NavLinks";
import "./globals.css";

const plex = IBM_Plex_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
    statusBarStyle: "default",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F4F6F8",
  viewportFit: "cover",
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${plex.variable} h-full`}>
      <body className="min-h-full font-sans antialiased">
        <AppShell nav={<NavLinks />}>{children}</AppShell>
      </body>
    </html>
  );
}
