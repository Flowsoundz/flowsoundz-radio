import { AppShell } from "@/components/AppShell";
import { AdminMusicUploader } from "@/components/AdminMusicUploader";
import { readAdminCatalogSongs } from "@/lib/adminCatalog";
import type { Song } from "@/lib/types";

export const dynamic = "force-dynamic";

type AdminSongOption = Pick<
  Song,
  | "id"
  | "title"
  | "artist"
  | "vibe"
  | "genre"
  | "duration_sec"
  | "audio_file"
  | "packaging_status"
  | "packaging_error"
  | "is_playable"
  | "youtube_url"
  | "artist_visual_file"
>;

async function loadCatalog(): Promise<AdminSongOption[]> {
  const songs = await readAdminCatalogSongs();
  return songs.map(
    ({
      id,
      title,
      artist,
      vibe,
      genre,
      duration_sec,
      audio_file,
      packaging_status,
      packaging_error,
      is_playable,
      youtube_url,
      artist_visual_file,
    }) => ({
      id,
      title,
      artist,
      vibe,
      genre,
      duration_sec,
      audio_file,
      packaging_status,
      packaging_error,
      is_playable,
      youtube_url,
      artist_visual_file,
    }),
  );
}

export default async function AdminMusicPage() {
  const isConfigured = Boolean(process.env.ADMIN_UPLOAD_PASSWORD);
  const songs = isConfigured ? await loadCatalog() : [];

  return (
    <AppShell
      eyebrow="Admin"
      title="Music Uploads"
      subtitle="Upload MP3 or WAV files, edit metadata, and write directly to the backend catalog used by the radio player."
    >
      {isConfigured ? (
        <AdminMusicUploader songs={songs} />
      ) : (
        <div className="glass-card rounded-[1.8rem] p-6 text-sm leading-6 text-rose-100">
          Set `ADMIN_UPLOAD_PASSWORD` in `.env.local` to enable this admin
          tool.
        </div>
      )}
    </AppShell>
  );
}
