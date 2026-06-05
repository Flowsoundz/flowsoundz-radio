export function HomepageSocialProof() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12">
      <StatItem icon={<UsersIcon />} count="57" label="Tracks in Rotation" />
      <span className="hidden h-4 w-px bg-white/[0.12] md:block" />
      <StatItem
        icon={<HeadphonesIcon />}
        live
        label="Station Active Now"
      />
      <span className="hidden h-4 w-px bg-white/[0.12] md:block" />
      <StatItem icon={<SignalIcon />} label="24/7 Live Radio" />
    </div>
  );
}

function StatItem({
  icon,
  label,
  count,
  live = false,
}: {
  icon: React.ReactNode;
  label: string;
  count?: string;
  live?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-white/30">{icon}</span>
      <div className="flex items-center gap-2">
        {live ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/8 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.8)]" />
            Live
          </span>
        ) : null}
        {count ? (
          <span className="text-sm font-bold text-white/80">{count}</span>
        ) : null}
        <span className="text-sm font-medium text-white/50">{label}</span>
      </div>
    </div>
  );
}

function UsersIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

function HeadphonesIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 18v-6a9 9 0 0118 0v6" />
      <path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3z" />
      <path d="M3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z" />
    </svg>
  );
}

function SignalIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="2" y1="20" x2="2" y2="14" />
      <line x1="7" y1="20" x2="7" y2="4" />
      <line x1="12" y1="20" x2="12" y2="8" />
      <line x1="17" y1="20" x2="17" y2="11" />
      <line x1="22" y1="20" x2="22" y2="16" />
    </svg>
  );
}
