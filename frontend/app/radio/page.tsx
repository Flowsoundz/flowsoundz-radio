import type { Metadata } from "next";
import BottomNav from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "Live Radio — FlowSoundz Radio",
  description:
    "Tune in to FlowSoundz Radio — curated underground music streaming 24/7. Hip-hop, R&B, soul, Afrobeats, and more. Discover artists before they blow.",
  openGraph: {
    title: "FlowSoundz Radio — Live Stream",
    description: "Curated underground music, streaming now.",
  },
};

export default function RadioPage() {
  return <BottomNav />;
}
