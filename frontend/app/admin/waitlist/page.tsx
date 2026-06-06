import { AppShell } from "@/components/AppShell";
import { WaitlistTable } from "@/components/WaitlistTable";
import {
  WAITLIST_STORAGE_MODE,
  readWaitlistEntries,
} from "@/lib/adminWaitlistStore";

export const dynamic = "force-dynamic";

type WaitlistEntry = {
  id: string;
  email: string;
  joined_at: string;
  source: string;
};

async function loadWaitlist(): Promise<WaitlistEntry[]> {
  const entries = await readWaitlistEntries();
  return [...entries].reverse();
}

export default async function AdminWaitlistPage() {
  const entries = await loadWaitlist();
  const isStorageConfigured = WAITLIST_STORAGE_MODE !== "unconfigured";

  return (
    <AppShell
      eyebrow="Admin"
      title="Waitlist"
      subtitle={
        entries.length === 0
          ? "No signups yet — they will appear here after visitors submit on the homepage."
          : `${entries.length} signup${entries.length === 1 ? "" : "s"} — most recent first.`
      }
    >
      {isStorageConfigured ? (
        <WaitlistTable entries={entries} />
      ) : (
        <div className="glass-card rounded-[1.8rem] p-6 text-sm leading-6 text-amber-100">
          Waitlist emails are being captured for notifications, but durable admin
          storage is not configured for this production deployment yet.
        </div>
      )}
    </AppShell>
  );
}
