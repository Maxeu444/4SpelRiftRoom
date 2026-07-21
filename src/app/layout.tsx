import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "4Spel Rift Room | LoL Team Coaching",
  description: "Le QG de coaching League of Legends de 4Spel : équipe, drafts et progression."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
