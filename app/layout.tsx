import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Interview System",
  description: "AI-powered interview system for collecting user feedback",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased flex flex-col min-h-screen">
        <main className="flex-1">
          {children}
        </main>
        <footer className="bg-gray-100 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 py-4 mt-auto">
          <div className="container mx-auto px-4 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              © 2025 GenomicsChain / Masaomi Hatakeyama. All rights reserved.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
