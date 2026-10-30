import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { AdminIngestPanel } from "@/components/AdminIngestPanel";

export const dynamic = "force-dynamic";

export default function AdminMusicPage() {
  return (
    <AppShell
      eyebrow="Admin"
      title="Add Music"
      subtitle="Add one song at a time. Upload audio and cover art, then let the mastering worker prepare the broadcast-ready track."
    >
      <AdminIngestPanel />
      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href="/admin/mastering"
          className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100 transition hover:bg-cyan-300/15"
        >
          View mastering queue
        </Link>
        <Link
          href="/songs"
          className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/70 transition hover:bg-white/[0.08] hover:text-white"
        >
          View public library
        </Link>
      </div>
    </AppShell>
  );
}
