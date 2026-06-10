import Link from "next/link";
import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { readCatalogSnapshotFromStore } from "@/lib/catalogSnapshotStore";
import { readArtistSubmissions } from "@/lib/artistSubmissionStore";
import { readPromoPayments } from "@/lib/promoPaymentStore";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin — FlowSoundz Radio",
};

const MODE_STYLE: Record<string, string> = {
  live: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
  playable_archive: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
  maintenance: "border-amber-400/20 bg-amber-400/10 text-amber-300",
};

const MODE_LABEL: Record<string, string> = {
  live: "Live",
  playable_archive: "Archive",
  maintenance: "Maintenance",
};

export default async function AdminPage() {
  const [snapshot, submissions, promoPayments] = await Promise.all([
    readCatalogSnapshotFromStore().catch(() => null),
    readArtistSubmissions().catch(() => []),
    readPromoPayments().catch(() => []),
  ]);

  const pendingSubmissions = submissions.filter((s) =>
    ["new", "reviewing"].includes(s.status),
  ).length;
  const pendingPromo = promoPayments.filter(
    (p) => p.status === "pending_review",
  ).length;

  const stationMode = snapshot?.stationMode ?? "maintenance";
  const modeStyle = MODE_STYLE[stationMode] ?? MODE_STYLE.maintenance;
  const modeLabel = MODE_LABEL[stationMode] ?? "Maintenance";

  type ToolDef = {
    href: string;
    title: string;
    description: string;
    badge?: number;
    badgeCls?: string;
  };

  const ADMIN_TOOLS: ToolDef[] = [
    {
      href: "/admin/insights",
      title: "Listener Insights",
      description:
        "Play, skip, completion, visualizer, and Creator Hub conversion in one dashboard.",
    },
    {
      href: "/admin/artist-submissions",
      title: "Artist Hub Inbox",
      description:
        "Review Creator Hub submissions, inspect AI promo drafts, approve or reject.",
      badge: pendingSubmissions,
      badgeCls: "bg-cyan-400/15 text-cyan-300",
    },
    {
      href: "/admin/promo",
      title: "Promo Review",
      description:
        "Review paid Stripe promo submissions, update status, and add internal notes.",
      badge: pendingPromo,
      badgeCls: "bg-fuchsia-400/15 text-fuchsia-300",
    },
    {
      href: "/admin/release-submissions",
      title: "Release Inbox",
      description:
        "Review homepage release submissions, inspect assets, mark as reviewed or approved.",
    },
    {
      href: "/admin/waitlist",
      title: "Waitlist",
      description:
        "View and export email signups collected from the homepage waitlist form.",
    },
    {
      href: "/admin/contact",
      title: "Contact Inbox",
      description:
        "Read incoming contact messages, reply by email, mark threads as read.",
    },
    {
      href: "/admin/music",
      title: "Music Uploads",
      description:
        "Upload MP3/WAV files and write songs directly into the local catalog.",
    },
    {
      href: "/admin/covers",
      title: "Cover Uploads",
      description:
        "Upload cover art and assign it to songs without editing mapping code.",
    },
    {
      href: "/admin/releases",
      title: "Release Settings",
      description:
        "Edit access tiers, release windows, featured flags, vault state, and Behind the Mix notes.",
    },
    {
      href: "/admin/outreach",
      title: "Artist Outreach",
      description:
        "Generate brand-safe DM invitations for artists using the AI outreach route.",
    },
    {
      href: "/admin/content",
      title: "Homepage Content",
      description:
        "Edit homepage copy, CTA buttons, value cards, and brand text without touching code.",
    },
    {
      href: "/admin/songs/new",
      title: "Add Song",
      description:
        "Add a new song to the rotation catalog directly via Prisma — no media backend needed.",
    },
    {
      href: "/admin/digest",
      title: "Weekly Digest",
      description:
        "Preview and send the weekly pulse email to all waitlist subscribers and registered users.",
    },
  ];

  const totalPending = pendingSubmissions + pendingPromo;

  return (
    <AppShell
      eyebrow="Admin"
      title="FlowSoundz Admin"
      subtitle={
        totalPending > 0
          ? `${totalPending} item${totalPending === 1 ? "" : "s"} need your attention.`
          : "Everything reviewed — station is running clean."
      }
    >
      {/* ── Station status bar ── */}
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-[1.4rem] border border-white/8 bg-white/[0.03] px-5 py-4">
        <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${modeStyle}`}>
          {modeLabel}
        </span>
        <span className="text-xs text-slate-400">
          {snapshot?.releases.length ?? 0} releases · {snapshot?.artists.length ?? 0} artists
        </span>
        <div className="ml-auto flex gap-2">
          <Link
            href="/artist/metrics"
            className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400 transition hover:border-white/20 hover:text-white"
          >
            Metrics →
          </Link>
          <Link
            href="/radio"
            className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400 transition hover:border-white/20 hover:text-white"
          >
            Radio →
          </Link>
        </div>
      </div>

      {/* ── Tool grid ── */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {ADMIN_TOOLS.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="glass-card relative block rounded-[1.8rem] border border-white/10 p-5 transition hover:-translate-y-1 hover:border-white/16"
          >
            {tool.badge != null && tool.badge > 0 && (
              <span
                className={`absolute right-4 top-4 flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${tool.badgeCls ?? "bg-white/10 text-white"}`}
              >
                {tool.badge}
              </span>
            )}
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-cyan-200/75">
              Admin Tool
            </p>
            <h2 className="mt-3 text-xl font-semibold text-white">{tool.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              {tool.description}
            </p>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
