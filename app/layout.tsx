import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const sans = Geist({ subsets: ["latin"], variable: "--font-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://liens.ae2v.fr"),
  title: { default: "AE2V — Tous nos liens", template: "%s — AE2V" },
  description: "Tous les liens officiels de l’AE2V, le BDE de Vélizy.",
  openGraph: { title: "AE2V — Tous nos liens", description: "Réseaux, événements et liens utiles de l’AE2V.", type: "website", locale: "fr_FR" },
  twitter: { card: "summary_large_image" },
  icons: { icon: "/assets/favicon.ico" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr"><body className={`${sans.variable} ${mono.variable}`}>{children}</body></html>;
}
