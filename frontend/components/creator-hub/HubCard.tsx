import Link from "next/link";
import type { ReactNode } from "react";

type HubCardProps = {
  title: string;
  description: string;
  href?: string;
  cta?: string;
  icon?: ReactNode;
  accent?: string;
  done?: boolean;
};

export function HubCard({
  title,
  description,
  href,
  cta,
  icon,
  accent = "#00e5ff",
  done = false,
}: HubCardProps) {
  const inner = (
    <div
      className="glass-card group relative flex h-full flex-col gap-3 rounded-[1.6rem] p-5 transition-all hover:shadow-[0_0_32px_rgba(0,229,255,0.08)]"
      style={
        done
          ? { borderColor: `${accent}30` }
          : undefined
      }
    >
      {done && (
        <span
          className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold"
          style={{ background: `${accent}22`, color: accent }}
        >
          ✓
        </span>
      )}
      {icon ? (
        <div
          className="flex h-10 w-10 items-center justify-center rounded-[0.9rem] text-xl"
          style={{ background: `${accent}14` }}
        >
          {icon}
        </div>
      ) : null}
      <div className="flex-1">
        <h3
          className="text-sm font-semibold text-white"
          style={done ? { color: accent } : undefined}
        >
          {title}
        </h3>
        <p className="mt-1.5 text-xs leading-5 text-slate-400">{description}</p>
      </div>
      {cta ? (
        <span
          className="inline-flex w-fit items-center gap-1 text-xs font-semibold transition group-hover:gap-2"
          style={{ color: accent }}
        >
          {cta} →
        </span>
      ) : null}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {inner}
      </Link>
    );
  }

  return inner;
}
