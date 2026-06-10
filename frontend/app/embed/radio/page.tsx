import type { Metadata } from "next";
import { EmbedRadioPlayer } from "@/components/EmbedRadioPlayer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "FlowSoundz Radio — Live",
  robots: { index: false },
};

export default function EmbedRadioPage() {
  return <EmbedRadioPlayer />;
}
