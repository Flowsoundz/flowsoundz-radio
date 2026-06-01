import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { CreatorHubNav } from "@/components/creator-hub/CreatorHubNav";

type CreatorHubShellProps = {
  children: ReactNode;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
};

export function CreatorHubShell({
  children,
  eyebrow = "Creator Hub",
  title,
  subtitle,
}: CreatorHubShellProps) {
  return (
    <AppShell
      eyebrow={eyebrow}
      title={title}
      subtitle={subtitle}
    >
      <CreatorHubNav />
      <div className="pb-32 md:pb-36">{children}</div>
    </AppShell>
  );
}
