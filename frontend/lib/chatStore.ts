export type ChatRole = "ADMIN" | "ARTIST" | "VAULT" | "INSIDER" | "LISTENER";

export type ChatMessage = {
  id: string;
  createdAt: string;
  displayName: string;
  text: string;
  trackTitle: string | null;
  role: ChatRole;
};

// Module-level store — persists across requests on the same Fluid Compute instance.
// Ephemeral by design for MVP; cap keeps memory bounded.
const MAX_MESSAGES = 200;
const messages: ChatMessage[] = [];

// Rate limit: one message per IP per 5 seconds
const lastSentAt = new Map<string, number>();
const RATE_LIMIT_MS = 5_000;

export function getMessages(limit = 50): ChatMessage[] {
  return messages.slice(-limit);
}

export type SendResult =
  | { ok: true; message: ChatMessage }
  | { ok: false; error: string };

export function sendMessage(input: {
  ip: string;
  displayName: string;
  text: string;
  trackTitle: string | null;
  role?: ChatRole;
}): SendResult {
  const now = Date.now();
  const last = lastSentAt.get(input.ip) ?? 0;
  if (now - last < RATE_LIMIT_MS) {
    return { ok: false, error: "Slow down — one message every 5 seconds." };
  }

  const name = input.displayName.trim().slice(0, 32) || "Listener";
  const text = input.text.trim().slice(0, 200);
  if (!text) return { ok: false, error: "Message cannot be empty." };

  lastSentAt.set(input.ip, now);

  const message: ChatMessage = {
    id: `msg_${now.toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date(now).toISOString(),
    displayName: name,
    text,
    trackTitle: input.trackTitle?.trim().slice(0, 80) ?? null,
    role: input.role ?? "LISTENER",
  };

  messages.push(message);
  if (messages.length > MAX_MESSAGES) messages.splice(0, messages.length - MAX_MESSAGES);

  return { ok: true, message };
}
