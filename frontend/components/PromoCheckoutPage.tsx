"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { BrandLogo } from "@/components/BrandLogo";
import { getCoverUrl, getSongs, submitPromoNetworkLead } from "@/lib/api";
import { isTrackFeatured } from "@/lib/access";
import { createPromoCheckoutSession, type PromoTier } from "@/lib/stripe";
import type { Song } from "@/lib/types";

const INITIAL_LEAD_FORM = {
  artist_name: "",
  track_link: "",
  budget_range: "",
  email: "",
  rights_confirmed: false,
};

export function PromoCheckoutPage() {
  const [featuredTracks, setFeaturedTracks] = useState<Song[]>([]);
  const [isLoadingTracks, setIsLoadingTracks] = useState(true);
  const [leadForm, setLeadForm] = useState(INITIAL_LEAD_FORM);
  const [leadErrorMessage, setLeadErrorMessage] = useState("");
  const [leadSuccessMessage, setLeadSuccessMessage] = useState("");
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<PromoTier | null>(null);
  const [checkoutError, setCheckoutError] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadFeaturedTracks() {
      try {
        const songs = await getSongs();
        if (!isActive) {
          return;
        }
        setFeaturedTracks(songs.filter((song) => isTrackFeatured(song)).slice(0, 6));
      } catch {
        if (!isActive) {
          return;
        }
        setFeaturedTracks([]);
      } finally {
        if (isActive) {
          setIsLoadingTracks(false);
        }
      }
    }

    void loadFeaturedTracks();

    return () => {
      isActive = false;
    };
  }, []);

  function updateLeadField(
    field: keyof typeof INITIAL_LEAD_FORM,
    value: string,
  ) {
    setLeadForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleLeadSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmittingLead(true);
    setLeadErrorMessage("");
    setLeadSuccessMessage("");

    try {
      const response = await submitPromoNetworkLead(leadForm);
      setLeadSuccessMessage(response.message);
      setLeadForm(INITIAL_LEAD_FORM);
    } catch (error) {
      setLeadErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to send your promo request right now.",
      );
    } finally {
      setIsSubmittingLead(false);
    }
  }

  async function handleCheckout(tier: PromoTier) {
    setCheckoutLoading(tier);
    setCheckoutError("");
    try {
      const url = await createPromoCheckoutSession(tier);
      window.location.href = url;
    } catch (err) {
      setCheckoutError(
        err instanceof Error ? err.message : "Unable to start checkout right now.",
      );
      setCheckoutLoading(null);
    }
  }

  return (
    <AppShell
      eyebrow="For Artists"
      title="Your Song Deserves More Than a Link."
      subtitle="SoundCloud hosts the underground. FlowSoundz introduces it. Every track is reviewed and hand-sequenced — getting on means getting heard by listeners who are actively looking for what's next."
    >
      <section className="relative isolate">
        <div className="pointer-events-none absolute -left-10 top-8 h-44 w-44 rounded-full bg-[#00E5FF]/10 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-28 h-48 w-48 rounded-full bg-[#8B5CF6]/12 blur-3xl" />
        <div className="pointer-events-none absolute bottom-20 left-1/3 h-40 w-40 rounded-full bg-[#FF2DA6]/10 blur-3xl" />

        <div className="space-y-6">

          {/* Value prop strip */}
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { accent: "#00e5ff", step: "01", title: "Free Submission", body: "Submit your track for review at /artist/submit — no payment required to apply. Every submission gets a manual listen." },
              { accent: "#7c4dff", step: "02", title: "Priority Review", body: "Paid lanes get reviewed first, with direct feedback within 48–72 hours. Approval is not automatic — quality standards still apply." },
              { accent: "#ff2da6", step: "03", title: "Featured Consideration", body: "Higher tiers open the door for boosted rotation and artist card placement. Featured placement is subject to final review." },
            ].map((item) => (
              <div key={item.step} className="glass-card rounded-[1.6rem] p-5">
                <span className="text-[2rem] font-bold leading-none" style={{ color: item.accent, opacity: 0.22 }}>{item.step}</span>
                <h3 className="mt-2 text-sm font-semibold text-white">{item.title}</h3>
                <p className="mt-1.5 text-xs leading-5 text-slate-400">{item.body}</p>
              </div>
            ))}
          </div>

          <section className="glass-card rounded-[2rem] border border-white/8 bg-[#0B1020]/86 p-6 md:p-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#CBD5E1]/60">
                  Featured now
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-[#F8FAFC] md:text-3xl">
                  Current FlowSoundz promoted tracks
                </h2>
              </div>
              <p className="max-w-xl text-sm leading-6 text-[#CBD5E1]">
                A live snapshot of records already riding the featured lane.
              </p>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {isLoadingTracks ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-4"
                  >
                    <div className="aspect-square animate-pulse rounded-[1.2rem] bg-white/8" />
                    <div className="mt-4 h-4 w-2/3 animate-pulse rounded-full bg-white/8" />
                    <div className="mt-2 h-3 w-1/2 animate-pulse rounded-full bg-white/8" />
                  </div>
                ))
              ) : featuredTracks.length > 0 ? (
                featuredTracks.map((song) => {
                  const coverSrc = getCoverUrl(song);
                  const primaryCoverSrc = Array.isArray(coverSrc)
                    ? coverSrc[0]
                    : coverSrc;

                  return (
                    <article
                      key={song.id}
                      className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-4"
                    >
                      <div className="relative aspect-square overflow-hidden rounded-[1.2rem] border border-white/8 bg-black/30">
                        {primaryCoverSrc ? (
                          <Image
                            src={primaryCoverSrc}
                            alt={`${song.title} cover art`}
                            fill
                            sizes="(max-width: 768px) 100vw, 33vw"
                            className="object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="mt-4 flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-semibold text-[#F8FAFC]">
                            {song.title}
                          </h3>
                          <p className="mt-1 text-sm text-[#CBD5E1]">
                            {song.artist}
                          </p>
                        </div>
                        <span className="rounded-full border border-cyan-300/18 bg-cyan-300/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200/85">
                          Featured
                        </span>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5 text-sm leading-6 text-[#CBD5E1] md:col-span-2 xl:col-span-3">
                  Featured tracks will appear here as soon as the current promo
                  rotation is updated.
                </div>
              )}
            </div>
          </section>

          {checkoutError && (
            <div className="rounded-[1.2rem] border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {checkoutError}
            </div>
          )}

          <section className="grid gap-4 xl:grid-cols-3">
            {(
              [
                {
                  tier: "basic" as PromoTier,
                  name: "Basic Submission",
                  description: "Your track into the review queue with artist details, vibe notes, and a manual listen from the FlowSoundz team.",
                  price: "$15",
                  accent: "border-[#00E5FF]/20 bg-[#00E5FF]/10",
                  labelColor: "text-cyan-300",
                  btnClass: "bg-cyan-400/15 text-cyan-200 hover:bg-cyan-400/25",
                },
                {
                  tier: "featured" as PromoTier,
                  name: "Featured Consideration",
                  description: "Priority review for standout records that may fit featured placement, homepage visibility, or curated station moments.",
                  price: "$45",
                  accent: "border-[#8B5CF6]/20 bg-[#8B5CF6]/12",
                  labelColor: "text-violet-300",
                  btnClass: "bg-violet-500/15 text-violet-200 hover:bg-violet-500/25",
                },
                {
                  tier: "sponsored" as PromoTier,
                  name: "Sponsored Rotation",
                  description: "High-visibility promo lane for premium station presence, sponsored support, and elevated release visibility.",
                  price: "$95",
                  accent: "border-[#FF2DA6]/20 bg-[#FF2DA6]/10",
                  labelColor: "text-fuchsia-300",
                  btnClass: "bg-fuchsia-500/15 text-fuchsia-200 hover:bg-fuchsia-500/25",
                },
              ] as const
            ).map((pkg) => (
              <div
                key={pkg.name}
                className={`glass-card flex flex-col rounded-[1.8rem] border p-6 ${pkg.accent}`}
              >
                <p className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${pkg.labelColor}`}>
                  {pkg.name}
                </p>
                <div className="mt-3 flex items-end gap-1">
                  <span className="font-headline text-4xl leading-none text-[#F8FAFC]">{pkg.price}</span>
                  <span className="mb-0.5 text-sm text-[#CBD5E1]/60">/submission</span>
                </div>
                <p className="mt-3 flex-1 text-sm leading-6 text-[#CBD5E1]">{pkg.description}</p>
                <button
                  type="button"
                  disabled={checkoutLoading !== null}
                  onClick={() => handleCheckout(pkg.tier)}
                  className={`mt-5 rounded-[1.1rem] px-4 py-3 text-center text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${pkg.btnClass}`}
                >
                  {checkoutLoading === pkg.tier ? "Redirecting…" : "Get started →"}
                </button>
              </div>
            ))}
          </section>

          <section className="glass-card rounded-[2rem] border border-white/8 bg-[#0B1020]/86 p-6 md:p-8">
            <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#CBD5E1]/60">
                  Get Featured
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-[#F8FAFC] md:text-3xl">
                  Send the track, the budget, and the rollout angle.
                </h2>
                <p className="mt-3 max-w-lg text-sm leading-7 text-[#CBD5E1]">
                  Use this quick intake if you want the FlowSoundz promo team to
                  review your release for featured support before stepping into a
                  full paid lane.
                </p>
              </div>

              <form className="grid gap-4" onSubmit={handleLeadSubmit}>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-[#F8FAFC]">
                      Artist name
                    </span>
                    <input
                      type="text"
                      value={leadForm.artist_name}
                      onChange={(event) =>
                        updateLeadField("artist_name", event.target.value)
                      }
                      className="min-h-12 rounded-[1rem] border border-white/8 bg-[#111827] px-4 text-sm text-[#F8FAFC] outline-none transition placeholder:text-[#CBD5E1]/45 focus:border-[#00E5FF]/35"
                      placeholder="Your artist or group name"
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-[#F8FAFC]">
                      Budget range
                    </span>
                    <input
                      type="text"
                      value={leadForm.budget_range}
                      onChange={(event) =>
                        updateLeadField("budget_range", event.target.value)
                      }
                      className="min-h-12 rounded-[1rem] border border-white/8 bg-[#111827] px-4 text-sm text-[#F8FAFC] outline-none transition placeholder:text-[#CBD5E1]/45 focus:border-[#00E5FF]/35"
                      placeholder="$100 - $300"
                    />
                  </label>
                </div>

                <label className="grid gap-2">
                  <span className="text-sm font-medium text-[#F8FAFC]">
                    Track link
                  </span>
                  <input
                    type="url"
                    value={leadForm.track_link}
                    onChange={(event) =>
                      updateLeadField("track_link", event.target.value)
                    }
                    className="min-h-12 rounded-[1rem] border border-white/8 bg-[#111827] px-4 text-sm text-[#F8FAFC] outline-none transition placeholder:text-[#CBD5E1]/45 focus:border-[#00E5FF]/35"
                    placeholder="Spotify, SoundCloud, YouTube, Dropbox..."
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium text-[#F8FAFC]">
                    Email
                  </span>
                  <input
                    type="email"
                    value={leadForm.email}
                    onChange={(event) =>
                      updateLeadField("email", event.target.value)
                    }
                    className="min-h-12 rounded-[1rem] border border-white/8 bg-[#111827] px-4 text-sm text-[#F8FAFC] outline-none transition placeholder:text-[#CBD5E1]/45 focus:border-[#00E5FF]/35"
                    placeholder="artist@email.com"
                  />
                </label>

                {/* Rights agreement */}
                <label className="flex cursor-pointer items-start gap-3 rounded-[1rem] border border-white/8 bg-white/[0.03] px-4 py-3 transition hover:border-white/12">
                  <input
                    type="checkbox"
                    required
                    checked={leadForm.rights_confirmed}
                    onChange={(e) => updateLeadField("rights_confirmed" as keyof typeof INITIAL_LEAD_FORM, e.target.checked as unknown as string)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[#00e5ff]"
                  />
                  <span className="text-xs leading-5 text-[#CBD5E1]/80">
                    I confirm I own or control the rights to this music and grant FlowSoundz Radio permission to stream and promote this track.
                  </span>
                </label>

                {leadSuccessMessage ? (
                  <div className="rounded-[1.2rem] border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-50">
                    {leadSuccessMessage}
                  </div>
                ) : null}

                {leadErrorMessage ? (
                  <div className="rounded-[1.2rem] border border-[#FF2DA6]/18 bg-[#FF2DA6]/10 px-4 py-3 text-sm text-[#F8FAFC]">
                    {leadErrorMessage}
                  </div>
                ) : null}

                <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-[#CBD5E1]">
                    Reviewed manually. We get back to every submission.
                  </p>
                  <button
                    type="submit"
                    disabled={isSubmittingLead || !leadForm.rights_confirmed}
                    className="inline-flex min-h-12 items-center justify-center rounded-full border border-cyan-100/70 bg-[linear-gradient(135deg,#67E8F9_0%,#22D3EE_45%,#06B6D4_100%)] px-6 text-sm font-bold text-slate-950 shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_12px_30px_rgba(34,211,238,0.35)] transition hover:-translate-y-0.5 disabled:border-white/8 disabled:bg-white/10 disabled:text-slate-400 disabled:shadow-none disabled:hover:translate-y-0"
                  >
                    {isSubmittingLead ? "Sending..." : "Send promo request"}
                  </button>
                </div>
              </form>
            </div>
          </section>
        </div>
      </section>
    </AppShell>
  );
}
