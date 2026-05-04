"use client";

import { useState } from "react";

const inputClass =
  "w-full min-h-10 rounded-[0.9rem] border border-white/8 bg-[#111827] px-3 py-2 text-sm text-[#F8FAFC] outline-none transition placeholder:text-[#CBD5E1]/40 focus:border-[#00E5FF]/35";

const textareaClass =
  "w-full rounded-[0.9rem] border border-white/8 bg-[#111827] px-3 py-2 text-sm text-[#F8FAFC] outline-none transition placeholder:text-[#CBD5E1]/40 focus:border-[#00E5FF]/35 resize-none";

const labelTextClass =
  "text-xs font-semibold uppercase tracking-[0.18em] text-[#CBD5E1]/60";

const sectionClass =
  "rounded-[1.8rem] border border-white/8 bg-[#0B1020]/86 p-6 space-y-4";

type Tone = "casual" | "confident" | "exclusive" | "friendly";
type LeadStatus = "new" | "messaged" | "replied" | "joined";

type Lead = {
  id: string;
  artistName: string;
  handle: string;
  genre: string;
  status: LeadStatus;
  notes: string;
  createdAt: string;
};

type FormState = {
  artistName: string;
  songName: string;
  genre: string;
  description: string;
};

const INITIAL_FORM: FormState = {
  artistName: "",
  songName: "",
  genre: "",
  description: "",
};

const TONES: { value: Tone; label: string }[] = [
  { value: "casual", label: "Casual" },
  { value: "confident", label: "Confident" },
  { value: "exclusive", label: "Exclusive" },
  { value: "friendly", label: "Friendly" },
];

const STATUS_OPTIONS: { value: LeadStatus; label: string; color: string }[] = [
  { value: "new", label: "New", color: "text-slate-400" },
  { value: "messaged", label: "Messaged", color: "text-cyan-300" },
  { value: "replied", label: "Replied", color: "text-fuchsia-300" },
  { value: "joined", label: "Joined", color: "text-green-400" },
];

const LS_KEY = "flowsoundz_outreach_leads";

function loadLeads(): Lead[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Lead[]) : [];
  } catch {
    return [];
  }
}

function saveLeads(leads: Lead[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(leads));
  } catch {
    // ignore quota errors
  }
}

export function AdminOutreachAgent() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [tone, setTone] = useState<Tone>("confident");
  const [messages, setMessages] = useState<string[]>([]);
  const [followupMessages, setFollowupMessages] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [followupLoading, setFollowupLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedFollowupIndex, setCopiedFollowupIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const [leads, setLeads] = useState<Lead[]>(loadLeads);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function callOutreach(mode: "generate" | "followup") {
    const res = await fetch("/api/outreach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, tone, mode }),
    });

    const payload = (await res.json().catch(() => ({}))) as {
      messages?: string[];
      error?: string;
    };

    if (!res.ok) throw new Error(payload.error || "Unable to generate outreach copy.");
    return Array.isArray(payload.messages) ? payload.messages : [];
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessages([]);
    setFollowupMessages([]);

    try {
      setMessages(await callOutreach("generate"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate outreach copy.");
    } finally {
      setLoading(false);
    }
  }

  async function handleFollowup() {
    setFollowupLoading(true);
    setFollowupMessages([]);

    try {
      setFollowupMessages(await callOutreach("followup"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate follow-up copy.");
    } finally {
      setFollowupLoading(false);
    }
  }

  async function handleCopy(message: string, index: number) {
    await navigator.clipboard.writeText(message);
    setCopiedIndex(index);
    window.setTimeout(() => setCopiedIndex(null), 2000);
  }

  async function handleCopyFollowup(message: string, index: number) {
    await navigator.clipboard.writeText(message);
    setCopiedFollowupIndex(index);
    window.setTimeout(() => setCopiedFollowupIndex(null), 2000);
  }

  async function handleCopyAll() {
    const all = messages.map((m, i) => `--- Message ${i + 1} ---\n${m}`).join("\n\n");
    await navigator.clipboard.writeText(all);
    setCopiedAll(true);
    window.setTimeout(() => setCopiedAll(false), 2000);
  }

  function addLead() {
    const lead: Lead = {
      id: crypto.randomUUID(),
      artistName: form.artistName || "Unknown Artist",
      handle: "",
      genre: form.genre || "",
      status: "new",
      notes: "",
      createdAt: new Date().toISOString(),
    };
    const updated = [lead, ...leads];
    setLeads(updated);
    saveLeads(updated);
  }

  function updateLeadStatus(id: string, status: LeadStatus) {
    const updated = leads.map((l) => (l.id === id ? { ...l, status } : l));
    setLeads(updated);
    saveLeads(updated);
  }

  function updateLeadHandle(id: string, handle: string) {
    const updated = leads.map((l) => (l.id === id ? { ...l, handle } : l));
    setLeads(updated);
    saveLeads(updated);
  }

  function commitNotes(id: string) {
    const updated = leads.map((l) => (l.id === id ? { ...l, notes: notesDraft } : l));
    setLeads(updated);
    saveLeads(updated);
    setEditingNotes(null);
  }

  function removeLead(id: string) {
    const updated = leads.filter((l) => l.id !== id);
    setLeads(updated);
    saveLeads(updated);
  }

  return (
    <div className="space-y-5">
      {/* ── Generator form ── */}
      <form onSubmit={(e) => void handleSubmit(e)} className={sectionClass}>
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-semibold text-[#F8FAFC]/75">AI Outreach Generator</p>

          {/* Tone selector */}
          <div className="flex gap-1">
            {TONES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTone(t.value)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  tone === t.value
                    ? "bg-[#00E5FF]/15 text-[#00E5FF] border border-[#00E5FF]/30"
                    : "border border-white/8 text-white/40 hover:border-white/16 hover:text-white/60"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1.5">
            <span className={labelTextClass}>Artist name</span>
            <input
              type="text"
              value={form.artistName}
              onChange={(e) => updateField("artistName", e.target.value)}
              className={inputClass}
              placeholder="Artist name"
            />
          </label>

          <label className="grid gap-1.5">
            <span className={labelTextClass}>Song name</span>
            <input
              type="text"
              value={form.songName}
              onChange={(e) => updateField("songName", e.target.value)}
              className={inputClass}
              placeholder="Song title"
            />
          </label>
        </div>

        <label className="grid gap-1.5">
          <span className={labelTextClass}>Genre</span>
          <input
            type="text"
            value={form.genre}
            onChange={(e) => updateField("genre", e.target.value)}
            className={inputClass}
            placeholder="Afrobeats, alt-R&B, reggaeton..."
          />
        </label>

        <label className="grid gap-1.5">
          <span className={labelTextClass}>Description</span>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            className={textareaClass}
            placeholder="Short context on the artist, track, vibe, or why they fit FlowSoundz."
          />
        </label>

        {error ? (
          <p className="rounded-[1rem] border border-[#ff2d55]/25 bg-[#ff2d55]/10 px-4 py-3 text-sm text-[#fecdd3]">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_24px_rgba(0,229,255,0.22)] transition hover:shadow-[0_0_30px_rgba(124,77,255,0.24)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Generating…" : "Generate 5 DM messages"}
          </button>

          {form.artistName && (
            <button
              type="button"
              onClick={addLead}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/12 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/70 transition hover:border-white/20 hover:bg-white/8 hover:text-white"
            >
              + Add to lead tracker
            </button>
          )}
        </div>
      </form>

      {/* ── Generated messages ── */}
      <div className={sectionClass}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-[#F8FAFC]/75">Generated messages</p>

          {messages.length > 0 && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void handleCopyAll()}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:border-white/20 hover:text-white"
              >
                {copiedAll ? "Copied all ✓" : "Copy all"}
              </button>

              <button
                type="button"
                onClick={() => void handleFollowup()}
                disabled={followupLoading}
                className="inline-flex items-center gap-1.5 rounded-full border border-fuchsia-400/25 bg-fuchsia-400/8 px-3 py-1.5 text-xs font-medium text-fuchsia-200/80 transition hover:border-fuchsia-400/40 hover:bg-fuchsia-400/12 disabled:opacity-50"
              >
                {followupLoading ? "Generating…" : "Generate follow-ups"}
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <p className="text-sm text-slate-400">Generating outreach copy…</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-slate-400">
            Fill in the form above and generate — 5 unique messages will appear here.
          </p>
        ) : (
          <div className="space-y-3">
            {messages.map((message, index) => (
              <div
                key={`msg-${index}-${message.slice(0, 16)}`}
                className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-4"
              >
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">
                  Option {index + 1}
                </p>
                <p className="whitespace-pre-wrap text-sm leading-7 text-slate-200">
                  {message}
                </p>
                <button
                  type="button"
                  onClick={() => void handleCopy(message, index)}
                  className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 py-2 text-xs font-medium text-white/70 transition hover:border-white/20 hover:bg-white/8 hover:text-white"
                >
                  {copiedIndex === index ? "Copied ✓" : "Copy"}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Follow-up messages */}
        {followupMessages.length > 0 && (
          <div className="mt-4 space-y-3 border-t border-white/6 pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fuchsia-300/60">
              Follow-up messages
            </p>
            {followupMessages.map((message, index) => (
              <div
                key={`fu-${index}-${message.slice(0, 16)}`}
                className="rounded-[1.2rem] border border-fuchsia-400/12 bg-fuchsia-400/[0.04] p-4"
              >
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-fuchsia-300/30">
                  Follow-up {index + 1}
                </p>
                <p className="whitespace-pre-wrap text-sm leading-7 text-slate-200">
                  {message}
                </p>
                <button
                  type="button"
                  onClick={() => void handleCopyFollowup(message, index)}
                  className="mt-3 inline-flex items-center gap-2 rounded-full border border-fuchsia-400/15 bg-fuchsia-400/5 px-4 py-2 text-xs font-medium text-fuchsia-200/60 transition hover:border-fuchsia-400/30 hover:text-fuchsia-200"
                >
                  {copiedFollowupIndex === index ? "Copied ✓" : "Copy"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Lead tracker ── */}
      <div className={sectionClass}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-[#F8FAFC]/75">
            Lead Tracker
            {leads.length > 0 && (
              <span className="ml-2 text-xs font-normal text-white/30">
                {leads.length} {leads.length === 1 ? "lead" : "leads"}
              </span>
            )}
          </p>
        </div>

        {leads.length === 0 ? (
          <p className="text-sm text-slate-400">
            No leads yet. Fill in an artist above and click &quot;Add to lead tracker&quot;.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-white/8">
                  {["Artist", "Handle", "Genre", "Status", "Notes", ""].map((h) => (
                    <th
                      key={h}
                      className="pb-2 pr-4 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30 last:pr-0"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {leads.map((lead) => {
                  const statusMeta = STATUS_OPTIONS.find((s) => s.value === lead.status)!;
                  return (
                    <tr key={lead.id} className="group">
                      <td className="py-3 pr-4 font-medium text-white/90">
                        {lead.artistName}
                      </td>
                      <td className="py-3 pr-4">
                        <input
                          type="text"
                          value={lead.handle}
                          onChange={(e) => updateLeadHandle(lead.id, e.target.value)}
                          placeholder="@handle"
                          className="w-28 rounded-[0.6rem] border border-white/8 bg-[#111827] px-2 py-1 text-xs text-white/70 outline-none placeholder:text-white/20 focus:border-[#00E5FF]/25"
                        />
                      </td>
                      <td className="py-3 pr-4 text-white/50">{lead.genre || "—"}</td>
                      <td className="py-3 pr-4">
                        <select
                          value={lead.status}
                          onChange={(e) =>
                            updateLeadStatus(lead.id, e.target.value as LeadStatus)
                          }
                          className={`rounded-full border border-white/10 bg-[#111827] px-2 py-1 text-xs outline-none ${statusMeta.color}`}
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s.value} value={s.value}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 pr-4">
                        {editingNotes === lead.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              autoFocus
                              value={notesDraft}
                              onChange={(e) => setNotesDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") commitNotes(lead.id);
                                if (e.key === "Escape") setEditingNotes(null);
                              }}
                              onBlur={() => commitNotes(lead.id)}
                              className="w-40 rounded-[0.6rem] border border-[#00E5FF]/25 bg-[#111827] px-2 py-1 text-xs text-white/80 outline-none"
                            />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingNotes(lead.id);
                              setNotesDraft(lead.notes);
                            }}
                            className="max-w-[160px] truncate text-left text-xs text-white/40 hover:text-white/70"
                          >
                            {lead.notes || "Add note…"}
                          </button>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={() => removeLead(lead.id)}
                          className="text-[10px] text-white/20 opacity-0 transition hover:text-red-400 group-hover:opacity-100"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
