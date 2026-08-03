import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "Emplobo",
  description:
    "AI-powered SDM/training brain for UMKM — train once, onboard everyone.",
  icons: {
    icon: "/favicon.ico",
    apple: "/logo-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="id">
        <body className="antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}

