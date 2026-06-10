import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import BottomNav from "@/components/BottomNav";
import { InstallPrompt } from "@/components/InstallPrompt";
import { AuthButton } from "@/components/AuthButton";

type AppShellProps = {
  children: ReactNode;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
};

const SHELL_LINKS = [
  { href: "/radio", label: "Radio" },
  { href: "/songs", label: "Songs" },
  { href: "/artists", label: "Artists" },
  { href: "/search", label: "Search" },
  { href: "/artist/dashboard", label: "Creator Hub" },
  { href: "/for-artists", label: "For Artists" },
] as const;

export function AppShell({
  children,
  eyebrow,
  title,
  subtitle,
}: AppShellProps) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-28 pt-5 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-3xl">
          <Link
            href="/"
            className="inline-flex w-fit items-center rounded-full border border-white/10 bg-white/6 px-4 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:border-white/16 hover:bg-white/8"
          >
            <Image
              src="/FSRLogo.svg"
              alt="FlowSoundz Radio"
              width={160}
              height={24}
              className="h-5 w-auto md:h-6"
              style={{
                mixBlendMode: "screen",
                filter: "brightness(1.3) drop-shadow(0 0 8px rgba(0,230,255,0.3))",
              }}
            />
          </Link>
          <div className="mt-4 flex flex-wrap gap-2">
            {SHELL_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300 transition hover:border-cyan-300/22 hover:bg-cyan-300/[0.08] hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>
          {eyebrow ? (
            <p className="mt-4 text-xs font-medium uppercase tracking-[0.28em] text-cyan-200/75">
              {eyebrow}
            </p>
          ) : null}
          {title ? (
            <h1 className="mt-3 font-display text-3xl font-semibold text-white md:text-5xl">
              {title}
            </h1>
          ) : null}
          {subtitle ? (
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 md:text-base md:leading-7">
              {subtitle}
            </p>
          ) : null}
        </div>

        <div className="flex w-full flex-col items-end gap-3 sm:w-auto sm:shrink-0">
          <AuthButton />
          <InstallPrompt />
        </div>
      </header>

      <main className="flex-1">{children}</main>
      <BottomNav />
    </div>
  );
}
