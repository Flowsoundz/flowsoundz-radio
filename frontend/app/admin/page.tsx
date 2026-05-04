import Link from "next/link";
import { AppShell } from "@/components/AppShell";

const ADMIN_TOOLS = [
  {
    href: "/admin/waitlist",
    title: "Waitlist",
    description:
      "View, copy, and export email signups collected from the homepage waitlist form.",
  },
  {
    href: "/admin/contact",
    title: "Contact Inbox",
    description:
      "Read incoming messages from the contact form, reply by email, and mark threads as read.",
  },
  {
    href: "/admin/music",
    title: "Music Uploads",
    description:
      "Upload MP3 or WAV files and write songs directly into the local catalog.",
  },
  {
    href: "/admin/covers",
    title: "Cover Uploads",
    description:
      "Upload cover art and assign it to songs without editing mapping code manually.",
  },
  {
    href: "/admin/releases",
    title: "Release Settings",
    description:
      "Edit access tiers, release windows, featured flags, vault state, and Behind the Mix notes.",
  },
  {
    href: "/admin/promo",
    title: "Promo Review",
    description:
      "Review artist submissions, update status to approved, featured, sponsored, or rejected, and add internal notes.",
  },
  {
    href: "/admin/release-submissions",
    title: "Release Inbox",
    description:
      "Review homepage release submissions, inspect uploaded assets, and mark each artist intake as reviewed, approved, or rejected.",
  },
  {
    href: "/admin/outreach",
    title: "Artist Outreach",
    description:
      "Generate short, brand-safe DM invitations for artists using the secured server-side AI route.",
  },
  {
    href: "/admin/content",
    title: "Homepage Content",
    description:
      "Edit homepage copy, CTA buttons, value cards, logo path, and brand text without touching page code.",
  },
];

export default function AdminPage() {
  return (
    <AppShell
      eyebrow="Admin"
      title="FlowSoundz Admin"
      subtitle="Local-first tools for managing music, covers, and founder blueprint release settings."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {ADMIN_TOOLS.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="glass-card block rounded-[1.8rem] border border-white/10 p-5 transition hover:-translate-y-1 hover:border-white/16"
          >
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-cyan-200/75">
              Admin Tool
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-white">
              {tool.title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              {tool.description}
            </p>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
