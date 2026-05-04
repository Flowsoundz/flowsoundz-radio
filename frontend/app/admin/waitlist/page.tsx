import { AppShell } from "@/components/AppShell";
import { WaitlistTable } from "@/components/WaitlistTable";

export const dynamic = "force-dynamic";
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

type WaitlistEntry = {
  id: string;
  email: string;
  joined_at: string;
  source: string;
};

async function loadWaitlist(): Promise<WaitlistEntry[]> {
  try {
    const response = await fetch(`${API_BASE}/admin/waitlist`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as { entries?: WaitlistEntry[] };
    const entries = Array.isArray(payload.entries) ? payload.entries : [];
    return [...entries].reverse();
  } catch {
    return [];
  }
}

export default async function AdminWaitlistPage() {
  const entries = await loadWaitlist();

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
      <WaitlistTable entries={entries} />
    </AppShell>
  );
}
