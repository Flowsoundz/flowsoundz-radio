import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Earnings — FlowSoundz Radio",
};

export default async function ArtistEarningsPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/signin?next=/artist/earnings");

  const artist = await prisma.artist.findFirst({
    where: { email: session.user.email },
    select: { id: true, name: true },
  });

  if (!artist) {
    return (
      <AppShell eyebrow="Creator Hub" title="My Earnings">
        <div className="mb-8">
          <Link href="/artist/dashboard" className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400 transition hover:border-white/20 hover:text-white">
            ← Creator Hub
          </Link>
        </div>
        <div className="rounded-[1.8rem] border border-white/8 bg-[#0B1020]/80 p-12 text-center">
          <p className="mb-1 text-sm font-semibold text-white">No artist profile linked</p>
          <p className="mb-6 text-xs text-slate-500">Submit your first track to start earning from FlowSoundz radio plays.</p>
          <Link href="/artist/submit" className="inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] px-5 py-2.5 text-sm font-bold text-white shadow-[0_0_18px_rgba(0,229,255,0.3)] transition hover:shadow-[0_0_28px_rgba(0,229,255,0.5)]">
            Submit a Track
          </Link>
        </div>
      </AppShell>
    );
  }

  const payouts = await prisma.artistPayout.findMany({
    where: { artistId: artist.id },
    orderBy: { month: "desc" },
    include: { pool: { select: { totalRevenue: true, artistPool: true } } },
    take: 24,
  });

  const totalEarned = payouts.reduce((s, p) => s + p.estimatedAmount, 0);
  const totalPaid = payouts.filter((p) => p.paid).reduce((s, p) => s + p.estimatedAmount, 0);
  const pending = totalEarned - totalPaid;
  const totalPlays = payouts[0]?.totalPlays ?? 0;

  return (
    <AppShell eyebrow="Creator Hub" title="My Earnings">
      {/* Nav */}
      <div className="mb-8 flex flex-wrap items-center gap-2">
        <Link href="/artist/dashboard" className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400 transition hover:border-white/20 hover:text-white">
          ← Creator Hub
        </Link>
        <span className="rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
          {artist.name}
        </span>
        <Link href="/artist/my-stats" className="ml-auto rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400 transition hover:border-white/20 hover:text-white">
          My Stats →
        </Link>
      </div>

      {/* How it works banner */}
      <div className="mb-6 rounded-[1.6rem] border border-emerald-400/15 bg-emerald-400/[0.04] p-5">
        <p className="mb-1 text-xs font-semibold text-emerald-300">How FSR revenue share works</p>
        <p className="text-xs leading-5 text-slate-400">
          Every month, FlowSoundz allocates <span className="text-white font-semibold">30% of subscription revenue</span> to a shared artist pool.
          Your share is calculated as <span className="text-emerald-300 font-mono">your plays ÷ total plays × pool</span>.
          Payments are processed manually — contact us when a month shows a balance.
        </p>
      </div>

      {/* Summary cards */}
      <section className="mb-6 grid grid-cols-3 gap-3">
        {[
          { label: "Total earned", value: `$${totalEarned.toFixed(2)}`, accent: "text-emerald-300" },
          { label: "Paid out", value: `$${totalPaid.toFixed(2)}`, accent: "text-cyan-300" },
          { label: "Pending", value: `$${pending.toFixed(2)}`, accent: pending > 0 ? "text-amber-300" : "text-slate-500" },
        ].map(({ label, value, accent }) => (
          <div key={label} className="flex flex-col gap-1 rounded-[1.6rem] border border-white/8 bg-[#0B1020]/80 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
            <p className={`text-3xl font-bold leading-none ${accent}`}>{value}</p>
          </div>
        ))}
      </section>

      {/* Payout history */}
      <section className="overflow-hidden rounded-[1.8rem] border border-white/8 bg-[#0B1020]/80">
        <div className="border-b border-white/[0.05] px-6 py-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Monthly breakdown</h2>
        </div>

        {payouts.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-slate-500">No earnings recorded yet.</p>
            <p className="mt-1 text-xs text-slate-600">Earnings appear once FlowSoundz publishes a monthly pool. Keep getting plays.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {payouts.map((p) => {
              const pct = (p.playShare * 100).toFixed(2);
              return (
                <div key={p.id} className="flex flex-wrap items-center gap-3 px-6 py-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white">{p.month}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {p.playCount.toLocaleString()} of {p.totalPlays.toLocaleString()} total plays · {pct}% share
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-300">${p.estimatedAmount.toFixed(2)}</p>
                    <p className="text-xs text-slate-500">of ${p.pool.artistPool.toFixed(2)} pool</p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${p.paid ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300" : "border-amber-400/25 bg-amber-400/10 text-amber-300"}`}>
                    {p.paid ? "Paid" : "Pending"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {pending > 0 && (
        <div className="mt-4 rounded-[1.6rem] border border-amber-400/15 bg-amber-400/[0.04] p-4 text-center">
          <p className="text-xs text-slate-400">
            You have <span className="font-bold text-amber-300">${pending.toFixed(2)}</span> pending.{" "}
            <Link href="/contact" className="underline hover:text-white">Contact us</Link> to arrange payment.
          </p>
        </div>
      )}

      {totalPlays > 0 && payouts.length === 0 && (
        <p className="mt-4 text-center text-xs text-slate-600">
          You have plays recorded. Earnings will appear once the admin publishes a monthly pool.
        </p>
      )}
    </AppShell>
  );
}
