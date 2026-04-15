import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Revenue Agent — Autonomous Income System",
  description: "AI-powered revenue generation with content, lead gen, and freelance engines",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-gray-950 text-gray-100">
        {children}
      </body>
    </html>
  );
}
