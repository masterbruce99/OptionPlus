import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Options Trading Command Center",
  description: "Learn options trading with real market data and clear English translations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <header className="navbar">
          <div className="container flex items-center justify-between">
            <h1 className="logo">Options Command Center</h1>
            <nav>
              {/* Future navigation */}
            </nav>
          </div>
        </header>
        <main className="container">
          {children}
        </main>
      </body>
    </html>
  );
}
