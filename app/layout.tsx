import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { KobilLogo } from "./components/KobilLogo";
import EngineeredInGermany from "./components/EngineeredInGermany";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "KOBIL Partner Developer Guide",
  description:
    "Build on the KOBIL SuperApp platform. Create a service, get a token, and try Identity, Chat, Pay, Signature, and TMS APIs.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white text-zinc-900">
        <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/85 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-3">
            <Link href="/" className="flex items-center gap-2.5 font-semibold text-[var(--kobil-navy)]">
              <KobilLogo variant="blue" size={20} />
              <span className="hidden text-zinc-400 sm:inline">/</span>
              <span className="hidden text-sm font-medium text-zinc-700 sm:inline">Partner Guide</span>
            </Link>
            <a
              href="https://documentation.cloud.kobil.com/api/"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-zinc-300 px-3 py-1.5 text-sm hover:border-[var(--kobil-blue)] hover:text-[var(--kobil-blue)]"
            >
              API reference ↗
            </a>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-zinc-200 bg-zinc-50">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <KobilLogo variant="navy" size={16} />
              <span className="text-xs italic text-[var(--kobil-blue)]">Shift. Thrive. Win.</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-zinc-600">
              <a className="hover:text-[var(--kobil-blue)]" href="https://documentation.cloud.kobil.com/" target="_blank" rel="noopener noreferrer">
                Official docs
              </a>
              <a className="hover:text-[var(--kobil-blue)]" href="https://documentation.cloud.kobil.com/api/" target="_blank" rel="noopener noreferrer">
                API reference
              </a>
              <EngineeredInGermany />
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
