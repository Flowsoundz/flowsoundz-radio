import { AppShell } from "@/components/AppShell";
import { AdminReleaseEditor } from "@/components/AdminReleaseEditor";
import { readAdminCatalogSongs } from "@/lib/adminCatalog";
import type { Song } from "@/lib/types";

export const dynamic = "force-dynamic";

type AdminReleaseSong = Pick<
  Song,
  | "id"
  | "title"
  | "artist"
  | "access_tier"
  | "member_release_at"
  | "public_release_at"
  | "is_featured"
  | "is_vault"
  | "behind_the_mix_text"
>;

async function loadCatalog(): Promise<AdminReleaseSong[]> {
  const songs = await readAdminCatalogSongs();
  return songs.map(
    ({
      id,
      title,
      artist,
      access_tier,
      member_release_at,
      public_release_at,
      is_featured,
      is_vault,
      behind_the_mix_text,
    }) => ({
      id,
      title,
      artist,
      access_tier,
      member_release_at,
      public_release_at,
      is_featured,
      is_vault,
      behind_the_mix_text,
    }),
  );
}

export default async function AdminReleasesPage() {
  const isConfigured = Boolean(process.env.ADMIN_UPLOAD_PASSWORD);
  const songs = isConfigured ? await loadCatalog() : [];

  return (
    <AppShell
      eyebrow="Admin"
      title="Release Settings"
      subtitle="Edit founder blueprint access windows, vault states, featured flags, and Behind the Mix notes without touching catalog JSON manually."
    >
      {isConfigured ? (
        <AdminReleaseEditor songs={songs} />
      ) : (
        <div className="glass-card rounded-[1.8rem] p-6 text-sm leading-6 text-rose-100">
          Set `ADMIN_UPLOAD_PASSWORD` in `.env.local` to enable this admin
          tool.
        </div>
      )}
    </AppShell>
  );
}
