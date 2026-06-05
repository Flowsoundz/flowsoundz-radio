import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    default: "Creator Hub — FlowSoundz Radio",
    template: "%s — FlowSoundz Creator Hub",
  },
  description:
    "FlowSoundz Creator Hub: create your music, clear your rights, build visuals, and submit your track for curated radio discovery.",
};

export default function ArtistLayout({ children }: { children: ReactNode }) {
  return children;
}
