import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter, Bebas_Neue } from "next/font/google";
import "./globals.css";
import { CookieBanner } from "@/components/CookieBanner";
import { DevLocalhostGuard } from "@/components/DevLocalhostGuard";
import { GlobalAudioProvider } from "@/components/GlobalAudioProvider";
import { MiniPlayer } from "@/components/MiniPlayer";
import { PwaRegistrar } from "@/components/PwaRegistrar";
import { InstallPrompt } from "@/components/InstallPrompt";
import RadioPlayer from "@/components/RadioPlayer";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/auth";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-bebas-neue",
  display: "swap",
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://127.0.0.1:3001");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "FlowSoundz Radio",
  description:
    "Dark neon after-hours radio with live vibe-based playback.",
  manifest: "/manifest.webmanifest",
  applicationName: "FlowSoundz Radio",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FlowSoundz Radio",
    startupImage: [
      { url: "/splash/splash-iphone-15-pro-max.png", media: "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)" },
      { url: "/splash/splash-iphone-14-pro.png",     media: "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)" },
      { url: "/splash/splash-iphone-se.png",         media: "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)" },
      { url: "/splash/splash-ipad-pro-13.png",       media: "(device-width: 1032px) and (device-height: 1376px) and (-webkit-device-pixel-ratio: 2)" },
      { url: "/splash/splash-ipad-pro-11.png",       media: "(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)" },
    ],
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [{ url: "/brand/flowsoundz-fr-appicon-dark.png", type: "image/png" }],
    shortcut: ["/brand/flowsoundz-fr-appicon-dark.png"],
    apple: [{ url: "/brand/flowsoundz-fr-appicon-dark.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "FlowSoundz Radio",
    description: "Dark neon after-hours radio with live vibe-based playback.",
    images: [{ url: "/covers/flowsoundz-artist.png", width: 1080, height: 1080 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FlowSoundz Radio",
    description: "Dark neon after-hours radio with live vibe-based playback.",
    images: ["/covers/flowsoundz-artist.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#07070f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  return (
    <html
      lang="en"
      className={`h-full ${spaceGrotesk.variable} ${inter.variable} ${bebasNeue.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-[var(--page-bg)] text-white antialiased">
        <SessionProvider session={session}>
          <GlobalAudioProvider>
            <DevLocalhostGuard />
            <PwaRegistrar />
            <RadioPlayer />
            {children}
            <MiniPlayer />
            <CookieBanner />
            <InstallPrompt />
          </GlobalAudioProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
