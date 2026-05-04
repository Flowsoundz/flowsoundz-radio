import { AppShell } from "@/components/AppShell";
import {
  AdminPromoReview,
  type PromoSubmission,
} from "@/components/AdminPromoReview";

export const dynamic = "force-dynamic";
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

async function loadSubmissions(): Promise<PromoSubmission[]> {
  try {
    const response = await fetch(`${API_BASE}/admin/promo/submissions`, {
      cache: "no-store",
    });
    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as {
      submissions?: Array<PromoSubmission & { package_tier?: string }>;
    };
    return data.submissions ?? [];
  } catch {
    return [];
  }
}

export default async function AdminPromoPage() {
  const isConfigured = Boolean(process.env.ADMIN_UPLOAD_PASSWORD);
  const submissions = isConfigured ? await loadSubmissions() : [];

  const pendingCount = submissions.filter(
    (s) => s.status === "pending_review",
  ).length;

  return (
    <AppShell
      eyebrow="Admin"
      title="Promo Review"
      subtitle={
        !isConfigured
          ? "Review artist submissions after configuring the admin password."
          : submissions.length === 0
            ? "No submissions yet — they will appear here after artists submit through the Promo page."
            : pendingCount > 0
              ? `${submissions.length} submission${submissions.length === 1 ? "" : "s"} · ${pendingCount} pending review.`
              : `${submissions.length} submission${submissions.length === 1 ? "" : "s"} · all reviewed.`
      }
    >
      {isConfigured ? (
        <AdminPromoReview submissions={submissions} />
      ) : (
        <div className="glass-card rounded-[1.8rem] p-6 text-sm leading-6 text-rose-100">
          Set `ADMIN_UPLOAD_PASSWORD` in `.env.local` to enable this admin
          tool.
        </div>
      )}
    </AppShell>
  );
}
