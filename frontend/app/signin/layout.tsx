import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In — FlowSoundz Radio",
  description: "Sign in to FlowSoundz Radio with your email or Google account.",
  robots: { index: false, follow: false },
};

export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
