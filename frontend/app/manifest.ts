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
        src: "/brand/flowsoundz-fr-appicon-transparent.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/flowsoundz-fr-appicon-transparent.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/flowsoundz-fr-appicon-dark.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    screenshots: [
      {
        src: "/splash/splash-iphone-15-pro-max.png",
        sizes: "1290x2796",
        type: "image/png",

        form_factor: "narrow",
        label: "FlowSoundz Radio — now playing",
      },
      {
        src: "/splash/splash-iphone-14-pro.png",
        sizes: "1179x2556",
        type: "image/png",

        form_factor: "narrow",
        label: "FlowSoundz Radio — discover",
      },
      {
        src: "/splash/splash-ipad-pro-13.png",
        sizes: "2064x2752",
        type: "image/png",

        form_factor: "wide",
        label: "FlowSoundz Radio — tablet",
      },
    ],
  };
}
