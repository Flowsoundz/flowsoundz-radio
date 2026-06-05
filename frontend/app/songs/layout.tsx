import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Station Catalog — FlowSoundz Radio",
  description:
    "Browse every track in the FlowSoundz Radio rotation. Filter by vibe — Chill, Hype, Late Night, Emotional — and discover independent music before the algorithm catches on.",
};

export default function SongsLayout({ children }: { children: ReactNode }) {
  return children;
}
