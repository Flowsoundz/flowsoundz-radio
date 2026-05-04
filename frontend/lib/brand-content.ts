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
    "Discover new music through a premium radio experience, unlock exclusives through membership, and give your release a real shot at FlowSoundz visibility.",

  ctaButtons: [
    { label: "Start listening", href: "/radio", variant: "cyan" },
    { label: "Explore membership", href: "/membership", variant: "ghost" },
    { label: "Submit your release", href: "/promo", variant: "fuchsia" },
  ],

  valueCards: [
    {
      title: "Discover the next wave",
      text: "FlowSoundz Radio is built for listeners who want fresh records, curated energy, and artist discovery before the algorithm catches up.",
    },
    {
      title: "Unlock member-only drops",
      text: "Membership opens the door to early access, exclusive releases, Behind the Mix notes, and premium-first late-night moments.",
    },
    {
      title: "Get your music reviewed",
      text: "Artists can submit releases for promo consideration, featured placement, and future sponsored visibility across the station.",
    },
  ],

  trustStripText:
    "FlowSoundz complements your existing music stack. Discover here, then keep supporting artists across the platforms you already use.",
  trustPlatforms: ["Spotify", "Apple Music", "YouTube"],

  footerTagline:
    "Discovery-led radio, member exclusives, and artist visibility in one premium lane.",
};
