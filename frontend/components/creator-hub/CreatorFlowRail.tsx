"use client";

import Link from "next/link";
import { CREATOR_FLOW_STEPS, getCreatorFlowStep, type CreatorFlowStepId } from "@/components/creator-hub/creatorFlow";

type CreatorFlowRailProps = {
  currentStep: CreatorFlowStepId;
};

export function CreatorFlowRail({ currentStep }: CreatorFlowRailProps) {
  const currentIndex = CREATOR_FLOW_STEPS.findIndex((step) => step.id === currentStep);
  const step = getCreatorFlowStep(currentStep);
  const previousStep = currentIndex > 0 ? CREATOR_FLOW_STEPS[currentIndex - 1] : null;
  const nextStep =
    currentIndex >= 0 && currentIndex < CREATOR_FLOW_STEPS.length - 1
      ? CREATOR_FLOW_STEPS[currentIndex + 1]
      : null;

  return (
    <section className="mb-8 overflow-hidden rounded-[1.7rem] border border-white/8 bg-[linear-gradient(135deg,rgba(9,17,34,0.95),rgba(21,10,38,0.92))]">
      <div className="border-b border-white/[0.06] px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200/75">
              Creator Flow
            </p>
            <h2 className="mt-2 text-lg font-semibold text-white">
              Step {currentIndex + 1} of {CREATOR_FLOW_STEPS.length}: {step.title}
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-300">{step.description}</p>
          </div>
          <div className="rounded-full border border-cyan-300/18 bg-cyan-300/[0.08] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
            {step.label}
          </div>
        </div>
      </div>

      <div className="px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          {CREATOR_FLOW_STEPS.map((flowStep, index) => {
            const active = flowStep.id === currentStep;
            const done = index < currentIndex;

            return (
              <Link
                key={flowStep.id}
                href={flowStep.href}
                className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                  active
                    ? "border-cyan-300/28 bg-cyan-300/[0.12] text-white"
                    : done
                      ? "border-white/10 bg-white/[0.04] text-cyan-200 hover:text-white"
                      : "border-white/8 bg-white/[0.02] text-slate-400 hover:text-slate-200"
                }`}
              >
                <span className={`${active ? "text-cyan-100" : done ? "text-cyan-300" : "text-white/30"}`}>
                  {done ? "✓" : index + 1}
                </span>
                {flowStep.label}
              </Link>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {previousStep ? (
            <Link
              href={previousStep.href}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/12 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.05]"
            >
              ← {previousStep.label}
            </Link>
          ) : null}
          {nextStep ? (
            <Link
              href={nextStep.href}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_22px_rgba(0,229,255,0.22)] transition hover:shadow-[0_0_34px_rgba(0,229,255,0.34)]"
            >
              Next: {nextStep.label} →
            </Link>
          ) : (
            <Link
              href="/artist/submissions"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_22px_rgba(0,229,255,0.22)] transition hover:shadow-[0_0_34px_rgba(0,229,255,0.34)]"
            >
              View submissions →
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

