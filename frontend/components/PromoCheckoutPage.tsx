"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { BrandLogo } from "@/components/BrandLogo";
import { PromoPackageCard } from "@/components/PromoPackageCard";
import { getCoverUrl, getSongs, submitPromoNetworkLead } from "@/lib/api";
import { isTrackFeatured } from "@/lib/access";
import {
  createPromoCheckoutSession,
  type PromoTier,
} from "@/lib/stripe";
import type { Song } from "@/lib/types";

const INITIAL_LEAD_FORM = {
  artist_name: "",
  track_link: "",
  budget_range: "",
  email: "",
  rights_confirmed: false,
};

export function PromoCheckoutPage() {
  const searchParams = useSearchParams();
  const [selectedTier, setSelectedTier] = useState<PromoTier>("basic");
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [featuredTracks, setFeaturedTracks] = useState<Song[]>([]);
  const [isLoadingTracks, setIsLoadingTracks] = useState(true);
  const [leadForm, setLeadForm] = useState(INITIAL_LEAD_FORM);
  const [leadErrorMessage, setLeadErrorMessage] = useState("");
  const [leadSuccessMessage, setLeadSuccessMessage] = useState("");
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);
  const isCancelled = searchParams.get("cancelled") === "true";

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

  async function handleStartCheckout(packageTier: PromoTier) {
    setSelectedTier(packageTier);
    setIsStartingCheckout(true);
    setErrorMessage("");

    try {
      const checkoutUrl = await createPromoCheckoutSession(packageTier);
      window.location.href = checkoutUrl;
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to start checkout right now. Try again.",
      );
    } finally {
      setIsStartingCheckout(false);
    }
  }

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

  return (
    <AppShell
      eyebrow="For Artists"
      title="Get Heard Before The Algorithm"
      subtitle="FlowSoundz is a curated radio station — not open uploads. Every track is reviewed and sequenced by hand. Getting on means getting heard by listeners who are actively looking for what's next."
    >
      <section className="relative isolate">
        <div className="pointer-events-none absolute -left-10 top-8 h-44 w-44 rounded-full bg-[#00E5FF]/10 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-28 h-48 w-48 rounded-full bg-[#8B5CF6]/12 blur-3xl" />
        <div className="pointer-events-none absolute bottom-20 left-1/3 h-40 w-40 rounded-full bg-[#FF2DA6]/10 blur-3xl" />

        <div className="space-y-6">

          {/* Value prop strip */}
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { accent: "#00e5ff", step: "01", title: "Free Submission", body: "Submit your track for review. No payment required to apply — we review every request." },
              { accent: "#7c4dff", step: "02", title: "Priority Review", body: "Skip the queue. Priority submissions get reviewed within 48 hours and receive direct feedback." },
              { accent: "#ff2da6", step: "03", title: "Featured Placement", body: "Boosted rotation, artist card on the station, and early-window exposure to listeners and members." },
            ].map((item) => (
              <div key={item.step} className="glass-card rounded-[1.6rem] p-5">
                <span className="text-[2rem] font-bold leading-none" style={{ color: item.accent, opacity: 0.22 }}>{item.step}</span>
                <h3 className="mt-2 text-sm font-semibold text-white">{item.title}</h3>
                <p className="mt-1.5 text-xs leading-5 text-slate-400">{item.body}</p>
              </div>
            ))}
          </div>

          <section className="glass-card overflow-hidden rounded-[2rem] border border-white/8 bg-[#0B1020]/86 p-6 shadow-[0_22px_80px_rgba(0,0,0,0.34)] md:p-8">
            <div className="rounded-[1.7rem] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(0,229,255,0.14),transparent_34%),radial-gradient(circle_at_top_right,rgba(255,45,166,0.14),transparent_30%),linear-gradient(135deg,#111827_0%,#0B1020_62%,#050816_100%)] p-6">
              <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#FF2DA6]/20 bg-[#FF2DA6]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#F8FAFC]">
                    <BrandLogo variant="icon" className="h-3.5 w-3.5 opacity-80" />
                    <span>Payment Before Submission</span>
                  </div>
                  <h2 className="mt-4 font-display text-3xl font-semibold text-[#F8FAFC] md:text-4xl">
                    Reserve your FlowSoundz promo lane first.
                  </h2>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-[#CBD5E1] md:text-base">
                    Pick a package, complete secure checkout with Stripe, then
                    return with your submission form unlocked and your tier locked
                    in.
                  </p>
                </div>
                <div className="rounded-[1.4rem] border border-white/8 bg-white/5 px-5 py-4 text-sm text-[#CBD5E1]">
                  <div className="mb-3 flex items-center gap-2">
                    <BrandLogo variant="icon" className="h-4 w-4 opacity-60" />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#CBD5E1]/72">
                      FlowSoundz
                    </span>
                  </div>
                  <p>
                    Payments processed securely by Stripe. FlowSoundz never stores
                    card details.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {isCancelled ? (
            <div className="rounded-[1.3rem] border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
              Checkout was canceled. Choose a package whenever you’re ready.
            </div>
          ) : null}

          {errorMessage ? (
            <div className="rounded-[1.2rem] border border-[#FF2DA6]/18 bg-[#FF2DA6]/10 px-4 py-3 text-sm text-[#F8FAFC]">
              {errorMessage}
            </div>
          ) : null}

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

          <section className="grid gap-4 xl:grid-cols-3">
            <PromoPackageCard
              name="Basic Submission"
              description="Get your song into the review queue with artist details, vibe notes, and a manual listen from the FlowSoundz team."
              price="$15"
              ctaLabel={
                isStartingCheckout && selectedTier === "basic"
                  ? "Starting..."
                  : "Start Submission — $15"
              }
              accent="border-[#00E5FF]/20 bg-[#00E5FF]/10 text-[#F8FAFC]"
              note="Secure checkout via Stripe"
              isSelected={selectedTier === "basic"}
              onSelect={() => void handleStartCheckout("basic")}
            />
            <PromoPackageCard
              name="Featured Consideration"
              description="Priority review for standout records that may fit featured placement, homepage visibility, or curated station moments."
              price="$45"
              ctaLabel={
                isStartingCheckout && selectedTier === "featured"
                  ? "Starting..."
                  : "Start Submission — $45"
              }
              accent="border-[#8B5CF6]/20 bg-[#8B5CF6]/12 text-[#F8FAFC]"
              note="Secure checkout via Stripe"
              isSelected={selectedTier === "featured"}
              onSelect={() => void handleStartCheckout("featured")}
            />
            <PromoPackageCard
              name="Sponsored Rotation"
              description="High-visibility promo lane for premium station presence, sponsored support, and elevated release visibility."
              price="$95"
              ctaLabel={
                isStartingCheckout && selectedTier === "sponsored"
                  ? "Starting..."
                  : "Start Submission — $95"
              }
              accent="border-[#FF2DA6]/20 bg-[#FF2DA6]/10 text-[#F8FAFC]"
              note="Secure checkout via Stripe"
              isSelected={selectedTier === "sponsored"}
              onSelect={() => void handleStartCheckout("sponsored")}
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="glass-card rounded-[2rem] border border-white/8 bg-[#0B1020]/86 p-6 md:p-8">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#CBD5E1]/60">
                    Checkout-first flow
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold text-[#F8FAFC] md:text-3xl">
                    Pay first, then complete your submission.
                  </h2>
                </div>
                <span className="rounded-full border border-white/8 bg-white/5 px-3 py-1 text-xs font-medium text-[#CBD5E1]">
                  Secure by Stripe
                </span>
              </div>

              <div className="mt-6 space-y-3">
                {[
                  "Choose the promo lane that fits your release goals.",
                  "Complete secure checkout on Stripe.",
                  "Return with the submission form unlocked and your tier fixed.",
                ].map((item, index) => (
                  <div
                    key={item}
                    className="rounded-[1.3rem] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-[#CBD5E1]"
                  >
                    <span className="mr-3 inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/8 bg-white/6 text-xs font-semibold text-[#F8FAFC]">
                      {index + 1}
                    </span>
                    {item}
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-[1.5rem] border border-[#00E5FF]/16 bg-[#00E5FF]/10 p-4 text-sm leading-6 text-[#F8FAFC]">
                Your card is charged only once. Submissions are reviewed within 72 hours.
              </div>
            </div>

            <aside className="glass-card rounded-[2rem] border border-white/8 bg-[#0B1020]/86 p-6 md:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#CBD5E1]/60">
                Before you pay
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-[#F8FAFC]">
                Clean queue, no unpaid clutter
              </h2>
              <div className="mt-6 space-y-3 text-sm leading-6 text-[#CBD5E1]">
                <p>
                  No promo submission is written to the admin queue until payment
                  is confirmed and you finish the unlocked form.
                </p>
                <p>
                  Failed or canceled payments stay on Stripe’s checkout page and
                  never create admin noise.
                </p>
                <p>
                  After payment, your package tier is locked so the review lane is
                  clear from the start.
                </p>
              </div>
            </aside>
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
