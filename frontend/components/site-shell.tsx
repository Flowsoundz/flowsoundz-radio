import Link from "next/link";
import type { ReactNode } from "react";

const nav = [
  { href: "/", label: "Home" },
  { href: "/radio", label: "Radio" },
  { href: "/visualizer", label: "Visualizer" },
  { href: "/artists", label: "Artists" },
  { href: "/admin", label: "Admin" },
];

export function SiteShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
      <header className="mb-10 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-cyan-950/20 backdrop-blur">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">
              FlowSoundz Radio
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-white md:text-5xl">
              {title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-300 md:text-base">
              {description}
            </p>
          </div>
          <nav className="flex flex-wrap gap-3 text-sm">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-cyan-100 hover:border-cyan-300 hover:bg-cyan-300/20"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      {children}
    </main>
  );
}
