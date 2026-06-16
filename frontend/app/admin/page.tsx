import Link from "next/link";
import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { prisma } from "@/lib/prisma";
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
  const [snapshot, submissions, promoPayments, insiderCount, vaultCount, paidPriorityCount, playAgg] =
    await Promise.all([
      readCatalogSnapshotFromStore().catch(() => null),
      readArtistSubmissions().catch(() => []),
      readPromoPayments().catch(() => []),
      prisma.user.count({ where: { tier: "INSIDER" } }).catch(() => 0),
      prisma.user.count({ where: { tier: "VAULT" } }).catch(() => 0),
      prisma.artistSubmission.count({ where: { reviewPaidAt: { not: null } } }).catch(() => 0),
      prisma.queuePreference
        .aggregate({ _sum: { playCount: true } })
        .catch(() => ({ _sum: { playCount: 0 } })),
    ]);

  const pendingSubmissions = submissions.filter((s) =>
    ["new", "reviewing"].includes(s.status),
  ).length;
  const pendingPromo = promoPayments.filter(
    (p) => p.status === "pending_review",
  ).length;

  // ── Business KPIs ──
  const approved = submissions.filter((s) => s.status === "approved").length;
  const rejected = submissions.filter((s) => s.status === "rejected").length;
  const reviewedCount = approved + rejected;
  const approvalRate = reviewedCount > 0 ? Math.round((approved / reviewedCount) * 100) : null;
  const priorityRevenue = paidPriorityCount * 5;
  const promoRevenue = promoPayments.reduce((sum, p) => sum + (p.amountCents ?? 0), 0) / 100;
  const mrr = insiderCount * 7.99 + vaultCount * 14.99;
  const totalPlays = playAgg._sum.playCount ?? 0;
  const oneTimeRevenue = priorityRevenue + promoRevenue;
  const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;

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
      href: "/admin/mastering",
      title: "Mastering Queue",
      description:
        "Live status of the loudness-mastering pipeline — watch jobs process and retry failures.",
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
    {
      href: "/admin/revenue",
      title: "Revenue Share",
      description:
        "Set monthly subscription revenue pools and compute per-artist payouts based on play share.",
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

      {/* ── Business at a glance ── */}
      <div className="mb-6">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200/70">Business at a glance</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {[
            { label: "MRR", value: fmt(mrr), sub: `${insiderCount + vaultCount} members`, accent: "text-emerald-300" },
            { label: "One-time rev.", value: fmt(oneTimeRevenue), sub: `${paidPriorityCount} priority · ${promoPayments.length} promo`, accent: "text-cyan-300" },
            { label: "Submissions", value: submissions.length.toLocaleString(), sub: `${pendingSubmissions} pending`, accent: "text-white" },
            { label: "Approval rate", value: approvalRate === null ? "—" : `${approvalRate}%`, sub: `${approved} live · ${rejected} passed`, accent: "text-violet-300" },
            { label: "Members", value: `${insiderCount} / ${vaultCount}`, sub: "Insider / Vault", accent: "text-fuchsia-300" },
            { label: "Total plays", value: totalPlays.toLocaleString(), sub: `${snapshot?.artists.length ?? 0} artists`, accent: "text-[#00e5ff]" },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-[1.4rem] border border-white/8 bg-[#0B1020]/70 px-4 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">{kpi.label}</p>
              <p className={`mt-1 text-2xl font-bold leading-none ${kpi.accent}`}>{kpi.value}</p>
              <p className="mt-1.5 text-[10px] text-slate-500">{kpi.sub}</p>
            </div>
          ))}
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
