"use client";

import { useEffect, useState } from "react";
import { CreatorHubShell } from "@/components/creator-hub/CreatorHubShell";

const SOCIAL_PLATFORMS = [
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/yourhandle" },
  { key: "tiktok",    label: "TikTok",    placeholder: "https://tiktok.com/@yourhandle" },
  { key: "spotify",   label: "Spotify",   placeholder: "https://open.spotify.com/artist/..." },
  { key: "youtube",   label: "YouTube",   placeholder: "https://youtube.com/@yourchannel" },
  { key: "x",         label: "X / Twitter", placeholder: "https://x.com/yourhandle" },
  { key: "bandcamp",  label: "Bandcamp",  placeholder: "https://yourname.bandcamp.com" },
  { key: "website",   label: "Website",   placeholder: "https://yourwebsite.com" },
] as const;

const SUPPORT_PLATFORMS = [
  { value: "PATREON",    label: "Patreon" },
  { value: "KOFI",       label: "Ko-fi" },
  { value: "PAYPAL",     label: "PayPal" },
  { value: "BANDCAMP",   label: "Bandcamp" },
  { value: "TIPJAR",     label: "Tip Jar" },
  { value: "CRYPTO",     label: "Crypto" },
  { value: "OTHER",      label: "Other" },
] as const;

type ArtistData = {
  name: string;
  bio: string | null;
  payoutEmail: string | null;
  profile: { statement: string | null; rootsLabel: string | null } | null;
  socialLinks: { platform: string; url: string }[];
  supportLinks: { platform: string; label: string | null; url: string; isPrimary: boolean }[];
};

export default function ArtistProfilePage() {
  const [data, setData] = useState<ArtistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // form state
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [statement, setStatement] = useState("");
  const [rootsLabel, setRootsLabel] = useState("");
  const [payoutEmail, setPayoutEmail] = useState("");
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});
  const [supportLinks, setSupportLinks] = useState<Array<{ platform: string; label: string; url: string }>>([]);

  useEffect(() => {
    fetch("/api/artist/profile")
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then((d: { artist: ArtistData }) => {
        const a = d.artist;
        setData(a);
        setName(a.name ?? "");
        setBio(a.bio ?? "");
        setStatement(a.profile?.statement ?? "");
        setRootsLabel(a.profile?.rootsLabel ?? "");
        setPayoutEmail(a.payoutEmail ?? "");
        const sl: Record<string, string> = {};
        for (const link of a.socialLinks) sl[link.platform.toLowerCase()] = link.url;
        setSocialLinks(sl);
        setSupportLinks(
          a.supportLinks.map((l) => ({ platform: l.platform, label: l.label ?? "", url: l.url }))
        );
        setLoading(false);
      })
      .catch((e) => {
        setError(e === 404 ? "No artist profile linked to your account." : "Could not load profile.");
        setLoading(false);
      });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/artist/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, bio, statement, rootsLabel, payoutEmail, socialLinks, supportLinks }),
      });
      if (!res.ok) throw new Error("save_failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Save failed. Try again.");
    } finally {
      setSaving(false);
    }
  }

  function addSupportLink() {
    setSupportLinks((prev) => [...prev, { platform: "OTHER", label: "", url: "" }]);
  }

  function removeSupportLink(i: number) {
    setSupportLinks((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateSupportLink(i: number, field: "platform" | "label" | "url", val: string) {
    setSupportLinks((prev) => prev.map((l, idx) => idx === i ? { ...l, [field]: val } : l));
  }

  if (loading) {
    return (
      <CreatorHubShell eyebrow="Creator Hub" title="Your Profile">
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#8B5CF6] border-t-transparent" />
        </div>
      </CreatorHubShell>
    );
  }

  if (!data && error) {
    return (
      <CreatorHubShell eyebrow="Creator Hub" title="Your Profile">
        <p className="text-sm text-red-400">{error}</p>
      </CreatorHubShell>
    );
  }

  return (
    <CreatorHubShell eyebrow="Creator Hub" title="Your Profile">
      <form onSubmit={(e) => { void handleSave(e); }} className="space-y-8 max-w-2xl">

        {/* Identity */}
        <section className="rounded-[1.8rem] border border-white/8 bg-[#0B1020]/80 p-6 space-y-5">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Identity</h2>
          <Field label="Artist Name">
            <input value={name} onChange={(e) => setName(e.target.value)} className={INPUT} />
          </Field>
          <Field label="Short Bio" hint="1-2 sentences shown on your artist page">
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className={INPUT} />
          </Field>
          <Field label="Artist Statement" hint="Longer origin story shown in the Hub">
            <textarea value={statement} onChange={(e) => setStatement(e.target.value)} rows={4} className={INPUT} />
          </Field>
          <Field label="Location / Roots" hint="e.g. Orlando, FL // Santo Domingo, DR">
            <input value={rootsLabel} onChange={(e) => setRootsLabel(e.target.value)} className={INPUT} />
          </Field>
        </section>

        {/* Social links */}
        <section className="rounded-[1.8rem] border border-white/8 bg-[#0B1020]/80 p-6 space-y-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Social Links</h2>
          {SOCIAL_PLATFORMS.map(({ key, label, placeholder }) => (
            <Field key={key} label={label}>
              <input
                value={socialLinks[key] ?? ""}
                onChange={(e) => setSocialLinks((prev) => ({ ...prev, [key]: e.target.value }))}
                placeholder={placeholder}
                className={INPUT}
              />
            </Field>
          ))}
        </section>

        {/* Support / tip links */}
        <section className="rounded-[1.8rem] border border-white/8 bg-[#0B1020]/80 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Tip / Support Links</h2>
            <button type="button" onClick={addSupportLink} className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300 hover:border-white/20 hover:text-white transition">
              + Add link
            </button>
          </div>
          {supportLinks.length === 0 && (
            <p className="text-sm text-slate-500">No tip links yet. These show up when listeners tap &quot;Tip&quot; on your songs.</p>
          )}
          {supportLinks.map((link, i) => (
            <div key={i} className="flex gap-3 items-start">
              <div className="flex-1 space-y-2">
                <div className="flex gap-2">
                  <select
                    value={link.platform}
                    onChange={(e) => updateSupportLink(i, "platform", e.target.value)}
                    className={`${INPUT} flex-1`}
                  >
                    {SUPPORT_PLATFORMS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                  <input
                    value={link.label}
                    onChange={(e) => updateSupportLink(i, "label", e.target.value)}
                    placeholder="Label (optional)"
                    className={`${INPUT} flex-1`}
                  />
                </div>
                <input
                  value={link.url}
                  onChange={(e) => updateSupportLink(i, "url", e.target.value)}
                  placeholder="https://..."
                  className={INPUT}
                />
              </div>
              <button type="button" onClick={() => removeSupportLink(i)} className="mt-2 text-slate-500 hover:text-red-400 transition text-lg leading-none">×</button>
            </div>
          ))}
        </section>

        {/* Payout */}
        <section className="rounded-[1.8rem] border border-white/8 bg-[#0B1020]/80 p-6 space-y-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Earnings & Payout</h2>
          <p className="text-xs text-slate-500">Where should we send your revenue share? We use PayPal for payouts.</p>
          <Field label="PayPal Email">
            <input
              type="email"
              value={payoutEmail}
              onChange={(e) => setPayoutEmail(e.target.value)}
              placeholder="your@paypal.com"
              className={INPUT}
            />
          </Field>
          <p className="text-[11px] text-slate-600">View your accumulated earnings on the <a href="/artist/earnings" className="text-[#00e5ff] hover:underline">Earnings page</a>.</p>
        </section>

        {/* Save */}
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] px-8 py-2.5 text-sm font-bold text-white shadow-[0_0_18px_rgba(0,229,255,0.28)] transition hover:shadow-[0_0_28px_rgba(0,229,255,0.45)] disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Profile"}
          </button>
          {saved && <span className="text-sm text-emerald-400">Saved ✓</span>}
        </div>
      </form>
    </CreatorHubShell>
  );
}

const INPUT = "w-full rounded-[1rem] border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-[#7c4dff]/40 focus:outline-none transition";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-slate-300">{label}</label>
      {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
      {children}
    </div>
  );
}
