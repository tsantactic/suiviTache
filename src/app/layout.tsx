import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import GlobalLoading from "@/components/GlobalLoading";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SuiviTache - Gestion de tâches par projet",
  description: "Gérez vos projets et tâches simplement. Déployé sur Vercel + Supabase.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{if(localStorage.theme==='dark'||(!localStorage.theme&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch{}` }} />
      </head>
      <body className={inter.className}>
        <GlobalLoading />
        {children}
      </body>
    </html>
  );
}
