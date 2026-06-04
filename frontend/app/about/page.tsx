import Image from "next/image";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";

const STATS = [
  { value: "Curated", label: "Discovery-first rotation" },
  { value: "Independent", label: "Artist focus" },
  { value: "After Hours", label: "Broadcast identity" },
  { value: "Uncompromised", label: "Audio direction" },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Artists submit. Curators decide.",
    body: "Independent artists submit their music directly. Every track is reviewed against clear curation standards — no personal gatekeeping, no pay-to-play. Guided curation, not a popularity contest.",
    accent: "#00e5ff",
  },
  {
    step: "02",
    title: "Music is curated into a radio experience",
    body: "Approved tracks are sequenced by energy, genre, and flow into a continuous radio-style broadcast. Real programmers, real decisions.",
    accent: "#7c4dff",
  },
  {
    step: "03",
    title: "Listeners discover early",
    body: "Fans tune in and hear artists before they break — before the algorithm catches up, before the major labels sign them.",
    accent: "#ff2da6",
  },
];

const COMPARISONS = [
  {
    platform: "Spotify / Apple Music",
    description: "Massive catalogs built for retention. Algorithms surface what you already know. Independent artists get buried under billions of tracks. Discovery is an afterthought.",
    tag: "Algorithm-first",
    tagColor: "#64748b",
    dim: true,
  },
  {
    platform: "FlowSoundz Radio",
    description: "A curated stream built for discovery. Every track is hand-selected. Every play reaches an engaged listener. Artists get real exposure before the mainstream catches on.",
    tag: "Discovery-first",
    tagColor: "#00e5ff",
    dim: false,
  },
];

const TEAM = [
  {
    name: "Adonyz",
    role: "Founder · Artist",
    bio: "Latin urban producer and the creative force behind FlowSoundz Radio. He built this platform from the inside out — as both an artist who needed it and a founder who could create it.",
    gradient: "from-cyan-400/20 to-fuchsia-500/20",
    glow: "rgba(0,229,255,0.18)",
    initials: "AZ",
  },
  {
    name: "The Programmers",
    role: "Curation · Rotation",
    bio: "A small team obsessed with sequence, energy, and the right record at the right moment. They decide what plays and in what order — no algorithm involved.",
    gradient: "from-violet-500/20 to-cyan-400/20",
    glow: "rgba(139,92,246,0.18)",
    initials: "TP",
  },
  {
    name: "The Community",
    role: "Listeners · Culture",
    bio: "Every session, every skip, every late-night tune-in shapes what FlowSoundz becomes. The listeners are not passive — they are part of the curation.",
    gradient: "from-fuchsia-500/20 to-violet-500/20",
    glow: "rgba(255,45,166,0.18)",
    initials: "TC",
  },
];

export default function AboutPage() {
  return (
    <AppShell eyebrow="About" title="Our Story">

      {/* ── Hero ── */}
      <div className="relative mb-16 overflow-hidden rounded-[2rem] border border-white/8 bg-[linear-gradient(135deg,#0c1328_0%,#07111f_55%,#050816_100%)] px-6 py-16 text-center shadow-[0_24px_90px_rgba(0,0,0,0.42)]">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/4 top-0 h-72 w-72 rounded-full bg-[#00e5ff]/8 blur-[100px]" />
          <div className="absolute bottom-0 right-1/4 h-72 w-72 rounded-full bg-[#7c4dff]/10 blur-[100px]" />
          <div className="absolute bottom-0 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-[#ff2da6]/6 blur-[80px]" />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-7">
          <div className="relative h-16 w-64 sm:h-20 sm:w-80">
            <Image
              src="/FSRLogo.svg"
              alt="FlowSoundz Radio"
              fill
              sizes="320px"
              className="object-contain"
              style={{ mixBlendMode: "screen", filter: "drop-shadow(0 0 28px rgba(0,229,255,0.4))" }}
              priority
            />
          </div>

          <div className="max-w-2xl">
            <h2 className="text-[clamp(1.5rem,4vw,2.25rem)] font-semibold leading-tight text-white">
              Where Music Gets Discovered First
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base sm:leading-8">
              FlowSoundz Radio is a discovery-first platform built to give independent artists
              real visibility and listeners early access to music that hasn&apos;t been
              filtered through a corporate algorithm yet.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/radio"
              className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] px-7 py-3 text-sm font-bold text-white shadow-[0_0_22px_rgba(0,229,255,0.35)] transition hover:shadow-[0_0_36px_rgba(0,229,255,0.55)]"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5,3 19,12 5,21" />
              </svg>
              Tune in live
            </Link>
            <Link
              href="/membership"
              className="inline-flex items-center rounded-full border border-white/15 px-7 py-3 text-sm font-semibold text-white transition hover:border-white/25 hover:bg-white/5"
            >
              Become a member
            </Link>
          </div>
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div className="mb-16 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="glass-card flex flex-col items-center gap-1.5 rounded-[1.4rem] p-5 text-center"
          >
            <span className="bg-[linear-gradient(135deg,#00e5ff,#7c4dff)] bg-clip-text text-3xl font-bold text-transparent">
              {stat.value}
            </span>
            <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-slate-400">
              {stat.label}
            </span>
          </div>
        ))}
      </div>

      {/* ── Mission ── */}
      <div className="mb-16">
        <p className="mb-6 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/75">
          Mission
        </p>
        <div className="glass-card rounded-[1.8rem] p-8 sm:p-10">
          <p className="text-[clamp(1.1rem,2.5vw,1.4rem)] font-semibold leading-snug text-white">
            FlowSoundz Radio is a discovery-first platform built to help independent artists
            get seen early and give listeners access to music before it reaches the mainstream.
          </p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <p className="text-sm leading-7 text-slate-300">
              The streaming landscape is oversaturated. Platforms built for scale buried independent
              music under recommendation engines that favor the already-famous. An independent artist
              releasing today competes with 100,000 tracks uploaded the same day — and the algorithm
              has no incentive to surface them first.
            </p>
            <p className="text-sm leading-7 text-slate-300">
              FlowSoundz solves this with curation. Every track is handpicked, sequenced, and broadcast
              in a continuous radio experience. No engagement metrics. No sponsored slots. Just music
              that deserves to be heard — played to listeners who are actively looking for what&apos;s next.
            </p>
          </div>
        </div>
      </div>

      {/* ── How It Works ── */}
      <div className="mb-16">
        <p className="mb-6 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/75">
          How It Works
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          {HOW_IT_WORKS.map((item) => (
            <div key={item.step} className="glass-card rounded-[1.6rem] p-6">
              <span
                className="text-[2.5rem] font-bold leading-none"
                style={{ color: item.accent, opacity: 0.25 }}
              >
                {item.step}
              </span>
              <h3
                className="mt-3 text-base font-semibold"
                style={{ color: item.accent }}
              >
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">{item.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Trust & Safety ── */}
      <div className="mb-16">
        <p className="mb-6 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/75">
          Trust &amp; Safety
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="glass-card rounded-[1.6rem] p-6">
            <h3 className="text-base font-semibold text-white">No fake streams. Ever.</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              FlowSoundz does not buy plays, inflate listener counts, or manufacture engagement.
              Every spin you see is a real listener. Every number is real.
            </p>
          </div>
          <div className="glass-card rounded-[1.6rem] p-6">
            <h3 className="text-base font-semibold text-white">Guided curation, not personal gatekeeping.</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Tracks are approved against clear curation standards — energy, fit, audio quality,
              rights clearance. Rejection is not personal. Any artist can resubmit with a stronger
              release.
            </p>
          </div>
          <div className="glass-card rounded-[1.6rem] p-6">
            <h3 className="text-base font-semibold text-white">Rights come first.</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Every submission requires explicit rights confirmation — ownership or control of
              the recording, cleared samples, and permission to stream and promote on the
              FlowSoundz platform. No exceptions.
            </p>
          </div>
          <div className="glass-card rounded-[1.6rem] p-6">
            <h3 className="text-base font-semibold text-white">AI &amp; virtual artists are welcome — with transparency.</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              AI-assisted and fully virtual artists can submit. All AI use must be disclosed
              at submission. AI promo assets generated by FlowSoundz are clearly labeled and
              always require artist review before use.
            </p>
          </div>
        </div>
      </div>

      {/* ── Why Different ── */}
      <div className="mb-16">
        <p className="mb-6 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/75">
          Why It&apos;s Different
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {COMPARISONS.map((item) => (
            <div
              key={item.platform}
              className={`glass-card rounded-[1.6rem] p-6 transition-all ${item.dim ? "opacity-60" : "ring-1 ring-[#00e5ff]/20 shadow-[0_0_30px_rgba(0,229,255,0.06)]"}`}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-white">{item.platform}</h3>
                <span
                  className="shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em]"
                  style={{ color: item.tagColor, borderColor: `${item.tagColor}40`, background: `${item.tagColor}12` }}
                >
                  {item.tag}
                </span>
              </div>
              <p className="text-sm leading-6 text-slate-300">{item.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Team ── */}
      <div className="mb-16">
        <p className="mb-6 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/75">
          People
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          {TEAM.map((member) => (
            <div key={member.name} className="glass-card overflow-hidden rounded-[1.8rem]">
              <div
                className={`flex h-28 items-center justify-center bg-gradient-to-br ${member.gradient}`}
                style={{ boxShadow: `inset 0 0 40px ${member.glow}` }}
              >
                <span className="text-3xl font-bold text-white/25">{member.initials}</span>
              </div>
              <div className="p-5">
                <h3 className="text-base font-semibold text-white">{member.name}</h3>
                <p className="mt-0.5 text-xs font-medium uppercase tracking-[0.22em] text-cyan-200/60">
                  {member.role}
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-300">{member.bio}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Closing vision ── */}
      <div className="mb-16 rounded-[1.8rem] border border-white/6 bg-[linear-gradient(135deg,#0c1328_0%,#07111f_100%)] px-8 py-12 text-center">
        <p className="mx-auto max-w-xl text-[clamp(1.1rem,2.5vw,1.5rem)] font-semibold leading-snug text-white">
          FlowSoundz is not just another platform —<br className="hidden sm:block" />
          it&apos;s where music gets discovered first.
        </p>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-slate-400">
          We are building the infrastructure for early discovery — a place where artists get
          a fair shot before the algorithm decides their fate, and where listeners find the
          next big thing before everyone else.
        </p>
      </div>

      {/* ── CTA footer ── */}
      <div
        className="rounded-[1.9rem] p-px"
        style={{ background: "linear-gradient(135deg, #00e5ff 0%, #7c4dff 100%)" }}
      >
        <div className="flex flex-col items-center gap-5 rounded-[calc(1.9rem-1px)] bg-[#07111f] px-8 py-10 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-cyan-300/80">
              Ready to listen?
            </p>
            <h2 className="mt-2 text-xl font-semibold text-white">
              The station is live right now.
            </h2>
            <p className="mt-1.5 text-sm text-slate-300">
              Tune in, explore the catalog, or become a member.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap justify-center gap-3 sm:justify-end">
            <Link
              href="/radio"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] px-6 py-2.5 text-sm font-bold text-white shadow-[0_0_18px_rgba(0,229,255,0.35)] transition hover:shadow-[0_0_28px_rgba(0,229,255,0.55)]"
            >
              Go to radio
            </Link>
            <Link
              href="/membership"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 px-6 py-2.5 text-sm font-semibold text-white transition hover:border-white/25 hover:bg-white/5"
            >
              Membership
            </Link>
          </div>
        </div>
      </div>

    </AppShell>
  );
}
