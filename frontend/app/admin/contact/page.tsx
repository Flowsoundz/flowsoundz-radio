import { AppShell } from "@/components/AppShell";
import { ContactInbox } from "@/components/ContactInbox";

export const dynamic = "force-dynamic";
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

export type ContactMessage = {
  id: string;
  topic: string;
  name: string;
  email: string;
  message: string;
  received_at: string;
  status: "unread" | "read";
};

async function loadMessages(): Promise<ContactMessage[]> {
  try {
    const response = await fetch(`${API_BASE}/admin/contact`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as { messages?: ContactMessage[] };
    const messages = Array.isArray(payload.messages) ? payload.messages : [];
    return [...messages].reverse();
  } catch {
    return [];
  }
}

export default async function AdminContactPage() {
  const messages = await loadMessages();
  const unreadCount = messages.filter((m) => m.status === "unread").length;

  return (
    <AppShell
      eyebrow="Admin"
      title="Contact Inbox"
      subtitle={
        messages.length === 0
          ? "No messages yet — they will appear here after visitors submit the contact form."
          : unreadCount > 0
            ? `${messages.length} message${messages.length === 1 ? "" : "s"} · ${unreadCount} unread`
            : `${messages.length} message${messages.length === 1 ? "" : "s"} · all read`
      }
    >
      <ContactInbox messages={messages} />
    </AppShell>
  );
}
