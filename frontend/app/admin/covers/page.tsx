import { AppShell } from "@/components/AppShell";
import { AdminCoverUploader } from "@/components/AdminCoverUploader";
import { readAdminCatalogSongs } from "@/lib/adminCatalog";
import type { Song } from "@/lib/types";

export const dynamic = "force-dynamic";

type AdminSongOption = Pick<Song, "id" | "title" | "artist">;

async function loadCatalog(): Promise<AdminSongOption[]> {
  const songs = await readAdminCatalogSongs();
  return songs.map(({ id, title, artist }) => ({ id, title, artist }));
}

export default async function AdminCoversPage() {
  const isConfigured = Boolean(process.env.ADMIN_UPLOAD_PASSWORD);
  const songs = isConfigured ? await loadCatalog() : [];

  return (
    <AppShell
      eyebrow="Admin"
      title="Cover Uploads"
      subtitle="Upload a cover image, assign it to a song, and keep the public song and radio pages on the same shared mapping."
    >
      {isConfigured ? (
        <AdminCoverUploader songs={songs} />
      ) : (
        <div className="glass-card rounded-[1.8rem] p-6 text-sm leading-6 text-rose-100">
          Set `ADMIN_UPLOAD_PASSWORD` in `.env.local` to enable this admin
          tool.
        </div>
      )}
    </AppShell>
  );
}
