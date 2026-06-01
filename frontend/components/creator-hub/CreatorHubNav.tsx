"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const STEPS = [
  { href: "/artist/dashboard", label: "Dashboard", short: "Hub" },
  { href: "/artist/create", label: "Create", short: "Create" },
  { href: "/artist/distribution", label: "Distribution", short: "Dist." },
  { href: "/artist/rights", label: "Rights", short: "Rights" },
  { href: "/artist/video", label: "Video", short: "Video" },
  { href: "/artist/submit", label: "Submit", short: "Submit" },
] as const;

export function CreatorHubNav() {
  const pathname = usePathname();

  return (
    <nav
      className="mb-8 overflow-x-auto rounded-[1.4rem] border border-white/8 bg-white/[0.025] px-3 py-2 scrollbar-none"
      aria-label="Creator Hub steps"
    >
      <div className="flex min-w-max items-center gap-1.5 sm:gap-2">
        {STEPS.map((step, i) => {
          const active =
            pathname === step.href ||
            pathname.startsWith(`${step.href}/`);
          const done =
            STEPS.findIndex((s) => s.href === pathname) > i;

          return (
            <Link
              key={step.href}
              href={step.href}
              className={`flex min-h-9 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition sm:px-4 sm:text-xs ${
                active
                  ? "bg-[linear-gradient(90deg,rgba(0,229,255,0.18)_0%,rgba(124,77,255,0.22)_100%)] text-white border border-[#7c4dff]/25 shadow-[0_0_14px_rgba(0,229,255,0.12)]"
                  : done
                    ? "text-cyan-300/70 hover:text-white"
                    : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {done && !active ? (
                <span className="text-[#00e5ff] text-[10px]">✓</span>
              ) : (
                <span
                  className={`text-[10px] font-bold ${active ? "text-[#00e5ff]" : "text-white/30"}`}
                >
                  {i + 1}
                </span>
              )}
              <span className="hidden sm:inline">{step.label}</span>
              <span className="sm:hidden">{step.short}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
