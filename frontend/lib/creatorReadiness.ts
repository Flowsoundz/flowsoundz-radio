import { prisma } from "@/lib/prisma";

// "Creator readiness" — a 0-100 score of how set-up an artist is. Each item is
// fixable in one click and maps to a real capability: a complete profile makes
// the shareable artist page convert, the payout email lets earnings actually
// pay out, and a live track is the core action. Drives profile completion
// (better pages → more discovery) and gently nudges the next submission.

export type ReadinessItem = {
  id: string;
  label: string;
  hint: string;
  done: boolean;
  points: number;
  href: string;
  cta: string;
};

export type CreatorReadiness = {
  score: number;
  complete: boolean;
  items: ReadinessItem[];
};

export async function getCreatorReadiness(email: string): Promise<CreatorReadiness | null> {
  const artist = await prisma.artist.findFirst({
    where: { email },
    select: {
      bio: true,
      payoutEmail: true,
      socialLink: true,
      _count: { select: { socialLinks: true, supportLinks: true, songs: true } },
    },
  });
  if (!artist) return null;

  const items: ReadinessItem[] = [
    {
      id: "bio",
      label: "Write your bio",
      hint: "1–2 sentences on your artist page",
      done: (artist.bio?.trim().length ?? 0) >= 40,
      points: 20,
      href: "/artist/profile",
      cta: "Add bio",
    },
    {
      id: "social",
      label: "Add a social link",
      hint: "So fans can follow you off-platform",
      done: artist._count.socialLinks > 0 || !!artist.socialLink?.trim(),
      points: 20,
      href: "/artist/profile",
      cta: "Add social",
    },
    {
      id: "support",
      label: "Add a tip / support link",
      hint: "Let listeners support you directly",
      done: artist._count.supportLinks > 0,
      points: 20,
      href: "/artist/profile",
      cta: "Add link",
    },
    {
      id: "payout",
      label: "Set your payout email",
      hint: "Required to receive earnings",
      done: !!artist.payoutEmail?.trim(),
      points: 20,
      href: "/artist/profile",
      cta: "Set payout",
    },
    {
      id: "track",
      label: "Get a track on air",
      hint: "Submit for curated rotation",
      done: artist._count.songs > 0,
      points: 20,
      href: "/artist/submit",
      cta: "Submit",
    },
  ];

  const score = items.reduce((s, it) => s + (it.done ? it.points : 0), 0);
  return { score, complete: score >= 100, items };
}
