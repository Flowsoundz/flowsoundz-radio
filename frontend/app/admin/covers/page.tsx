import { AppShell } from "@/components/AppShell";
import { AdminCoverUploader } from "@/components/AdminCoverUploader";
import type { Song } from "@/lib/types";

export const dynamic = "force-dynamic";
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

type AdminSongOption = Pick<Song, "id" | "title" | "artist">;

async function loadCatalog(): Promise<AdminSongOption[]> {
  const response = await fetch(`${API_BASE}/admin/catalog`, {
    cache: "no-store",
  });
  if (!response.ok) {
    return [];
  }
  const data = (await response.json()) as { songs?: Song[] };
  const songs = data.songs ?? [];
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
