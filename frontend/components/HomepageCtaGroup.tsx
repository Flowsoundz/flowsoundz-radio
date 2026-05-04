"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import type { CtaButton, CtaVariant } from "@/lib/brand-content";
import { track } from "@/lib/analytics";

const ReleaseSubmissionModal = dynamic(
  () =>
    import("@/components/ReleaseSubmissionModal").then((module) => ({
      default: module.ReleaseSubmissionModal,
    })),
  {
    ssr: false,
  },
);

const ctaClass: Record<CtaVariant, string> = {
  cyan: "bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] text-white font-bold shadow-[0_0_24px_rgba(0,230,255,0.6)] hover:shadow-[0_0_36px_rgba(0,230,255,0.75)] px-8 py-[14px]",
  ghost:
    "border border-white/30 text-white hover:border-white/50 hover:bg-white/[0.06] px-5 py-2.5",
  fuchsia:
    "border border-fuchsia-400/35 text-fuchsia-200 hover:border-fuchsia-300/55 hover:bg-fuchsia-400/[0.08] px-5 py-2.5",
};

type HomepageCtaGroupProps = {
  ctaButtons: CtaButton[];
};

export function HomepageCtaGroup({ ctaButtons }: HomepageCtaGroupProps) {
  const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);
  const [modalInstance, setModalInstance] = useState(0);

  return (
    <>
      <div className="mt-8 flex flex-wrap gap-3">
        {ctaButtons.map((btn) =>
          btn.href === "/promo" ? (
            <button
              key={btn.href}
              type="button"
              onClick={() => {
                setModalInstance((current) => current + 1);
                setIsReleaseModalOpen(true);
                track("submission_click", { source: "homepage_cta" });
              }}
              className={`inline-flex min-h-11 w-full items-center justify-center rounded-full text-sm font-semibold transition sm:w-auto ${ctaClass[btn.variant]}`}
            >
              {btn.label}
            </button>
          ) : (
            <Link
              key={btn.href}
              href={btn.href}
              onClick={() => track("start_listening_click", { source: "homepage_cta", label: btn.label })}
              className={`inline-flex min-h-11 w-full items-center justify-center rounded-full text-sm font-semibold transition sm:w-auto ${ctaClass[btn.variant]}`}
            >
              {btn.label}
            </Link>
          ),
        )}
      </div>

      <ReleaseSubmissionModal
        key={modalInstance}
        open={isReleaseModalOpen}
        onClose={() => setIsReleaseModalOpen(false)}
      />
    </>
  );
}
