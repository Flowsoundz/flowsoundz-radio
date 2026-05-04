"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const groups = [
  {
    label: "Core",
    items: [
      { href: "/", label: "Home" },
      { href: "/radio", label: "Radio" },
      { href: "/songs", label: "Songs" },
    ],
  },
  {
    label: "Creator",
    items: [
      { href: "/artists", label: "Artists" },
      { href: "/artist/dashboard", label: "Hub" },
      { href: "/visualizer", label: "Visualizer" },
    ],
  },
  {
    label: "Info",
    items: [
      { href: "/membership", label: "Membership" },
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
    ],
  },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/8 bg-[#050816]/78 backdrop-blur-2xl">
      <div className="mx-auto flex max-w-7xl items-center gap-1.5 overflow-x-auto px-2 pb-2 pt-2 scrollbar-none sm:gap-3 sm:px-4 sm:pb-3 sm:pt-2.5">
        {groups.map((group) => (
          <div
            key={group.label}
            className="shrink-0 rounded-[0.95rem] border border-white/8 bg-white/[0.025] px-1.5 py-1.5 sm:rounded-[1.1rem] sm:px-2 sm:py-2"
          >
            <p className="px-1.5 text-[8px] font-semibold uppercase tracking-[0.2em] text-white/24 sm:px-2 sm:text-[9px] sm:tracking-[0.24em] sm:text-white/28">
              {group.label}
            </p>
            <div className="mt-1 flex items-center gap-1 sm:mt-1.5 sm:gap-1.5">
              {group.items.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`state-fade flex min-h-9 shrink-0 items-center justify-center rounded-full px-2.5 py-1.5 text-[10px] font-medium sm:min-h-10 sm:px-4 sm:py-2 sm:text-sm ${
                      active
                        ? "border border-[#8B5CF6]/16 bg-[linear-gradient(90deg,rgba(0,229,255,0.16)_0%,rgba(139,92,246,0.2)_58%,rgba(255,45,166,0.18)_100%)] text-[#F8FAFC] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_18px_rgba(139,92,246,0.14)]"
                        : "border border-transparent text-[#CBD5E1] hover:bg-white/6 hover:text-[#F8FAFC]"
                    }`}
                    aria-current={active ? "page" : undefined}
                  >
                    <span
                      className={`truncate ${
                        active
                          ? "tracking-[0.01em] drop-shadow-[0_0_10px_rgba(0,229,255,0.14)]"
                          : ""
                      }`}
                    >
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </nav>
  );
}
