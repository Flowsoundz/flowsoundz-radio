"use client";

import { useEffect, useState } from "react";

// Persistent, profile-tied release checklist. Both groups live in one JSON blob
// on ArtistProfile.releaseChecklist; each toggle autosaves via the profile PATCH.
const GROUPS = {
  rights: {
    title: "Rights & clearances",
    blurb: "Confirm you actually control what you're submitting — this is what keeps the station (and you) safe.",
    items: [
      { id: "own_master", label: "I own or control the master recording" },
      { id: "samples_cleared", label: "All samples are cleared, or the track is sample-free" },
      { id: "splits_documented", label: "Producer / collaborator splits are written down" },
      { id: "no_exclusive", label: "Not exclusively licensed to another label or distributor" },
      { id: "pro_registered", label: "Registered with a PRO (ASCAP / BMI) — recommended" },
    ],
  },
  distribution: {
    title: "Distribution checklist",
    blurb: "Get the release live everywhere, not just on FlowSoundz — track the steps here.",
    items: [
      { id: "distributor_chosen", label: "Picked a distributor (DistroKid, TuneCore, CD Baby…)" },
      { id: "uploaded", label: "Uploaded the master + cover art to the distributor" },
      { id: "isrc", label: "Have an ISRC code for the track" },
      { id: "release_date", label: "Set a release date" },
      { id: "smart_link", label: "Set up a pre-save / smart link" },
      { id: "promo_ready", label: "Promo assets ready (visualizer clip, captions)" },
    ],
  },
} as const;

type GroupKey = keyof typeof GROUPS;

export function ReleaseChecklist({ group }: { group: GroupKey }) {
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [noArtist, setNoArtist] = useState(false);

  useEffect(() => {
    fetch("/api/artist/profile")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: { artist?: { profile?: { releaseChecklist?: unknown } } }) => {
        const cl = d?.artist?.profile?.releaseChecklist;
        if (cl && typeof cl === "object") setChecks(cl as Record<string, boolean>);
      })
      .catch((s) => {
        if (s === 404) setNoArtist(true);
      })
      .finally(() => setLoaded(true));
  }, []);

  async function toggle(id: string) {
    const next = { ...checks, [id]: !checks[id] };
    setChecks(next);
    setSaving(true);
    try {
      await fetch("/api/artist/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ releaseChecklist: next }),
      });
    } catch {
      /* keep optimistic state; next toggle retries the full object */
    } finally {
      setSaving(false);
    }
  }

  const g = GROUPS[group];
  const done = g.items.filter((i) => checks[i.id]).length;
  const pct = Math.round((done / g.items.length) * 100);

  return (
    <section className="rounded-[1.8rem] border border-white/8 bg-[#0B1020]/80 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200/80">{g.title}</h2>
        <span className="text-[11px] text-slate-400">
          {done}/{g.items.length} {saving ? "· saving…" : ""}
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-400">{g.blurb}</p>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#00e5ff,#7c4dff)] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      {noArtist ? (
        <p className="mt-4 text-sm text-slate-500">
          Submit your first track to start tracking this — the checklist saves to your artist profile.
        </p>
      ) : (
        <ul className="mt-4 space-y-1.5">
          {g.items.map((item) => {
            const on = !!checks[item.id];
            return (
              <li key={item.id}>
                <button
                  type="button"
                  disabled={!loaded}
                  onClick={() => void toggle(item.id)}
                  className="flex w-full items-start gap-3 rounded-[1rem] border border-white/8 bg-white/[0.02] px-4 py-3 text-left transition hover:border-white/15 disabled:opacity-50"
                >
                  <span
                    className={`mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-[0.4rem] border text-[10px] ${
                      on ? "border-[#00FF88]/50 bg-[#00FF88]/15 text-[#00FF88]" : "border-white/20 text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                  <span className={`text-sm leading-6 ${on ? "text-white" : "text-slate-300"}`}>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
