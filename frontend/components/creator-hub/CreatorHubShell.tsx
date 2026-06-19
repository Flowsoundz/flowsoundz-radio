import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { CreatorFlowRail } from "@/components/creator-hub/CreatorFlowRail";
import { CreatorHubNav } from "@/components/creator-hub/CreatorHubNav";
import type { CreatorFlowStepId } from "@/components/creator-hub/creatorFlow";

type CreatorHubShellProps = {
  children: ReactNode;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  flowStep?: CreatorFlowStepId;
};

export function CreatorHubShell({
  children,
  eyebrow = "Creator Hub",
  title,
  subtitle,
  flowStep,
}: CreatorHubShellProps) {
  return (
    <AppShell
      eyebrow={eyebrow}
      title={title}
      subtitle={subtitle}
    >
      <CreatorHubNav />
      {flowStep ? <CreatorFlowRail currentStep={flowStep} /> : null}
      <div className="pb-32 md:pb-36">{children}</div>
    </AppShell>
  );
}
