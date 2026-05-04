import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/radio",
    name: "FlowSoundz Radio",
    short_name: "FlowSoundz",
    description: "Dark neon after-hours radio with live vibe-based playback.",
    start_url: "/radio",
    scope: "/",
    display: "standalone",
    background_color: "#07070f",
    theme_color: "#07070f",
    orientation: "portrait",
    categories: ["music", "entertainment"],
    icons: [
      {
        src: "/brand/flowsoundz-fr-appicon-dark.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/brand/flowsoundz-fr-appicon-dark.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/brand/flowsoundz-fr-appicon-dark.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
