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

const flowLinks = [
  { href: "/agent", label: "Agent" },
  { href: "/create-service", label: "1. Create service" },
  { href: "/get-token", label: "2. Get token" },
  { href: "/api-tester", label: "3. Try APIs" },
];

const productLinks = [
  { href: "/identity", label: "Identity" },
  { href: "/chat", label: "Chat" },
  { href: "/pay", label: "Pay" },
  { href: "/signature", label: "Signature" },
  { href: "/tms", label: "TMS" },
];

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
            <nav className="hidden gap-6 text-sm text-zinc-600 md:flex">
              {flowLinks.map((l) => (
                <Link key={l.href} href={l.href} className="hover:text-zinc-900">
                  {l.label}
                </Link>
              ))}
              <span className="h-4 w-px bg-zinc-200" />
              {productLinks.map((l) => (
                <Link key={l.href} href={l.href} className="hover:text-zinc-900">
                  {l.label}
                </Link>
              ))}
            </nav>
            <a
              href="https://documentation.cloud.kobil.com/api/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden rounded-full border border-zinc-300 px-3 py-1.5 text-sm hover:border-zinc-900 sm:inline-block"
            >
              API reference ↗
            </a>
          </div>
          <nav className="flex gap-4 overflow-x-auto border-t border-zinc-100 px-6 py-2 text-sm md:hidden">
            {[...flowLinks, ...productLinks].map((l) => (
              <Link key={l.href} href={l.href} className="whitespace-nowrap text-zinc-600">
                {l.label}
              </Link>
            ))}
          </nav>
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
