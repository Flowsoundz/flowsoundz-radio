import { AppShell } from "@/components/AppShell";
import { ContactInbox } from "@/components/ContactInbox";
import {
  CONTACT_STORAGE_MODE,
  readContactMessages,
} from "@/lib/adminContactStore";

export const dynamic = "force-dynamic";

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
  const messages = await readContactMessages();
  return [...messages].reverse();
}

export default async function AdminContactPage() {
  const messages = await loadMessages();
  const unreadCount = messages.filter((m) => m.status === "unread").length;
  const isStorageConfigured = CONTACT_STORAGE_MODE !== "unconfigured";

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
      {isStorageConfigured ? (
        <ContactInbox messages={messages} />
      ) : (
        <div className="glass-card rounded-[1.8rem] p-6 text-sm leading-6 text-amber-100">
          Contact form notifications are being emailed, but durable inbox storage
          is not configured for this production deployment yet.
        </div>
      )}
    </AppShell>
  );
}
