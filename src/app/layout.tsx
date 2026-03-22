import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AutoSetter - AI Instagram DM Automation",
  description: "Automatiza tus DMs de Instagram con IA",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-gray-950 text-white min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
