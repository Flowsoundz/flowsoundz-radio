export type CtaVariant = "cyan" | "ghost" | "fuchsia";

export type CtaButton = {
  label: string;
  href: string;
  variant: CtaVariant;
};

export type ValueCard = {
  title: string;
  text: string;
};

export type SiteContent = {
  siteName: string;
  siteTagline: string;
  heroLogoSrc: string;
  heroLogoAlt: string;
  heroTitle: string;
  heroSubtitle: string;
  ctaButtons: CtaButton[];
  valueCards: ValueCard[];
  trustStripText: string;
  trustPlatforms: string[];
  footerTagline: string;
};

export const siteContent: SiteContent = {
  siteName: "FlowSoundz Radio",
  siteTagline: "Discovery-first radio",

  heroLogoSrc: "/brand/flowsoundz-radio-full-dark.svg",
  heroLogoAlt: "FlowSoundz Radio logo",

  heroTitle: "FlowSoundz Radio",
  heroSubtitle:
    "Late-night R&B and urbano — in English and Spanish — programmed by humans, not an algorithm. One station, one moment, everyone tuned in together.",

  ctaButtons: [
    { label: "Listen Live", href: "/radio", variant: "cyan" },
    { label: "Submit Your Music", href: "/for-artists", variant: "fuchsia" },
  ],

  valueCards: [
    {
      title: "Bilingual by nature",
      text: "English and Spanish in the same rotation — R&B, reggaeton, urbano, Afrobeats. The way you actually listen, not split across two apps.",
    },
    {
      title: "A real station, not a playlist",
      text: "Everyone hears the same track at the same moment. Human-programmed, synchronized, communal — discovery before the algorithm catches on.",
    },
    {
      title: "Why artists submit",
      text: "Artists submit to be reviewed, introduced professionally, and considered for real station placement without fake playlist promises.",
    },
  ],

  trustStripText:
    "No fake streams. No empty playlist promises. Transparent curation.",
  trustPlatforms: ["Spotify", "Apple Music", "YouTube"],

  footerTagline:
    "Underground discovery, programmed like radio.",
};
