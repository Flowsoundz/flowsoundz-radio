"use client";

import { useEffect, useRef, useState } from "react";

type AdminSongOption = {
  id: string;
  title: string;
  artist: string;
  vibe?: string;
  genre?: string;
  duration_sec?: number;
  audio_file: string;
  youtube_url?: string | null;
  artist_visual_file?: string | null;
  packaging_status?: "pending" | "processing" | "ready" | "failed";
};

type AdminMusicUploaderProps = {
  songs: AdminSongOption[];
};

const VIBE_OPTIONS = [
  { value: "hype", label: "Hype" },
  { value: "chill", label: "Chill" },
  { value: "late_night", label: "Late Night" },
  { value: "emotional", label: "Emotional" },
];

function formatDurationInput(value?: number): string {
  return value ? String(value) : "";
}

async function readAudioDuration(file: File): Promise<number | null> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const audio = document.createElement("audio");
    audio.preload = "metadata";

    const duration = await new Promise<number | null>((resolve) => {
      audio.onloadedmetadata = () => {
        resolve(
          Number.isFinite(audio.duration) ? Math.round(audio.duration) : null,
        );
      };
      audio.onerror = () => resolve(null);
      audio.src = objectUrl;
    });

    return duration;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function AdminMusicUploader({ songs }: AdminMusicUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [password, setPassword] = useState("");
  const [existingSongId, setExistingSongId] = useState("");
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [vibe, setVibe] = useState("hype");
  const [genre, setGenre] = useState("");
  const [durationSec, setDurationSec] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [selectedVisualFile, setSelectedVisualFile] = useState<File | null>(null);
  const [visualPreviewUrl, setVisualPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isVisualDragging, setIsVisualDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selectedSong = songs.find((entry) => entry.id === existingSongId) ?? null;
  const selectedSongPackagingStatus = selectedSong?.packaging_status;
  const isSelectedSongBusy =
    selectedSongPackagingStatus === "pending" ||
    selectedSongPackagingStatus === "processing";

  useEffect(() => {
    return () => {
      if (audioPreviewUrl) {
        URL.revokeObjectURL(audioPreviewUrl);
      }
      if (visualPreviewUrl) {
        URL.revokeObjectURL(visualPreviewUrl);
      }
    };
  }, [audioPreviewUrl, visualPreviewUrl]);

  function loadSong(songId: string) {
    setExistingSongId(songId);
    setStatus(null);
    setError(null);

    if (!songId) {
      setTitle("");
      setArtist("");
      setVibe("hype");
      setGenre("");
      setDurationSec("");
      setYoutubeUrl("");
      return;
    }

    const song = songs.find((entry) => entry.id === songId);
    if (!song) {
      return;
    }

    setTitle(song.title);
    setArtist(song.artist);
    setVibe(song.vibe || "hype");
    setGenre(song.genre || "");
    setDurationSec(formatDurationInput(song.duration_sec));
    setYoutubeUrl(song.youtube_url || "");
  }

  async function acceptFile(file: File | null) {
    if (!file) {
      return;
    }

    const lowerName = file.name.toLowerCase();
    const isSupported =
      lowerName.endsWith(".mp3") ||
      lowerName.endsWith(".wav") ||
      file.type === "audio/mpeg" ||
      file.type === "audio/mp3" ||
      file.type === "audio/wav" ||
      file.type === "audio/wave" ||
      file.type === "audio/x-wav";

    if (!isSupported) {
      setError("Please choose an MP3 or WAV file.");
      return;
    }

    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl);
    }

    setSelectedFile(file);
    setAudioPreviewUrl(URL.createObjectURL(file));
    setError(null);
    setStatus(null);

    const detectedDuration = await readAudioDuration(file);
    if (detectedDuration && !durationSec) {
      setDurationSec(String(detectedDuration));
    }
  }

  function acceptVisualFile(file: File | null) {
    if (!file) {
      return;
    }

    const lowerName = file.name.toLowerCase();
    const isSupported =
      lowerName.endsWith(".mp4") ||
      lowerName.endsWith(".webm") ||
      lowerName.endsWith(".mov") ||
      file.type === "video/mp4" ||
      file.type === "video/webm" ||
      file.type === "video/quicktime";

    if (!isSupported) {
      setError("Please choose an MP4, WEBM, or MOV visual.");
      return;
    }

    if (visualPreviewUrl) {
      URL.revokeObjectURL(visualPreviewUrl);
    }

    setSelectedVisualFile(file);
    setVisualPreviewUrl(URL.createObjectURL(file));
    setError(null);
    setStatus(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!password) {
      setError("Enter the admin password first.");
      return;
    }

    if (!title || !artist || !vibe) {
      setError("Title, artist, and vibe are required.");
      return;
    }

    if (isSelectedSongBusy && selectedFile) {
      setError("This track is already queued for packaging. Wait until it finishes.");
      return;
    }

    if (!existingSongId && !selectedFile) {
      setError("Upload an MP3 or WAV file for new songs.");
      return;
    }

    setIsSaving(true);
    setStatus(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("password", password);
      formData.append("existingSongId", existingSongId);
      formData.append("title", title);
      formData.append("artist", artist);
      formData.append("vibe", vibe);
      formData.append("genre", genre);
      formData.append("durationSec", durationSec);
      formData.append("youtubeUrl", youtubeUrl);

      if (selectedFile) {
        formData.append("file", selectedFile);
      }
      if (selectedVisualFile) {
        formData.append("visualFile", selectedVisualFile);
      }

      const response = await fetch("/api/admin/music", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json().catch(() => null)) as
        | { error?: string; audioFile?: string; packagingStatus?: string }
        | null;

      if (!response.ok) {
        throw new Error(data?.error || "Failed to save song.");
      }

      setStatus(
        data?.packagingStatus && data.packagingStatus !== "ready"
          ? `Saved song metadata and queued packaging for ${data.audioFile ?? "the upload"}.`
          : `Saved song metadata${data?.audioFile ? ` and audio file ${data.audioFile}` : ""}.`,
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to save song.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteSelectedSong() {
    if (!password) {
      setError("Enter the admin password first.");
      return;
    }

    if (!existingSongId) {
      setError("Choose an existing song to delete.");
      return;
    }

    setIsDeleting(true);
    setStatus(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/music", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password,
          songId: existingSongId,
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(data?.error || "Failed to delete song.");
      }

      setStatus("Deleted song from the local catalog.");
      setExistingSongId("");
      setTitle("");
      setArtist("");
      setVibe("hype");
      setGenre("");
      setDurationSec("");
      setYoutubeUrl("");
      setIsConfirmingDelete(false);
      setSelectedFile(null);
      setSelectedVisualFile(null);
      if (audioPreviewUrl) {
        URL.revokeObjectURL(audioPreviewUrl);
      }
      if (visualPreviewUrl) {
        URL.revokeObjectURL(visualPreviewUrl);
      }
      setAudioPreviewUrl(null);
      setVisualPreviewUrl(null);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete song.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="glass-card rounded-[1.8rem] p-5">
        <label className="block text-sm font-medium text-slate-200">
          Admin password
        </label>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-3 w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none"
          placeholder="Enter ADMIN_UPLOAD_PASSWORD"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <div className="glass-card rounded-[1.8rem] p-5">
            <label className="block text-sm font-medium text-slate-200">
              Audio file
            </label>
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);
                void acceptFile(event.dataTransfer.files[0] ?? null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              className={`mt-3 flex min-h-56 cursor-pointer items-center justify-center rounded-[1.6rem] border border-dashed px-5 py-6 text-center transition ${
                isDragging
                  ? "border-cyan-300/80 bg-cyan-300/10"
                  : "border-white/12 bg-white/4"
              }`}
            >
              {selectedFile ? (
                <div className="w-full space-y-4">
                  <div className="text-sm text-slate-200">
                    <p className="font-semibold text-white">{selectedFile.name}</p>
                    <p className="mt-1 text-slate-300">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                  {audioPreviewUrl ? (
                    <audio controls src={audioPreviewUrl} className="w-full" />
                  ) : null}
                </div>
              ) : (
                <div className="space-y-2 text-sm text-slate-300">
                  <p>Drag and drop an MP3 or WAV here</p>
                  <p>or click to choose a file</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp3,.wav,audio/mpeg,audio/wav,audio/x-wav"
              className="hidden"
              onChange={(event) => {
                void acceptFile(event.target.files?.[0] ?? null);
              }}
            />
          </div>

          <div className="glass-card rounded-[1.8rem] p-5">
            <label className="block text-sm font-medium text-slate-200">
              Artist visual file
            </label>
            <div
              role="button"
              tabIndex={0}
              onClick={() =>
                document.getElementById("artist-visual-input")?.click()
              }
              onDragOver={(event) => {
                event.preventDefault();
                setIsVisualDragging(true);
              }}
              onDragLeave={() => setIsVisualDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setIsVisualDragging(false);
                acceptVisualFile(event.dataTransfer.files[0] ?? null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  document.getElementById("artist-visual-input")?.click();
                }
              }}
              className={`mt-3 flex min-h-56 cursor-pointer items-center justify-center rounded-[1.6rem] border border-dashed px-5 py-6 text-center transition ${
                isVisualDragging
                  ? "border-fuchsia-300/80 bg-fuchsia-300/10"
                  : "border-white/12 bg-white/4"
              }`}
            >
              {selectedVisualFile ? (
                <div className="w-full space-y-4">
                  <div className="text-sm text-slate-200">
                    <p className="font-semibold text-white">{selectedVisualFile.name}</p>
                    <p className="mt-1 text-slate-300">
                      {(selectedVisualFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                  {visualPreviewUrl ? (
                    <video controls src={visualPreviewUrl} className="max-h-56 w-full rounded-2xl" />
                  ) : null}
                </div>
              ) : (
                <div className="space-y-2 text-sm text-slate-300">
                  <p>Drag and drop an MP4, WEBM, or MOV visual here</p>
                  <p>or click to choose a file</p>
                  {selectedSong?.artist_visual_file ? (
                    <p className="text-xs text-slate-400">
                      Current visual: {selectedSong.artist_visual_file}
                    </p>
                  ) : null}
                </div>
              )}
            </div>
            <input
              id="artist-visual-input"
              type="file"
              accept=".mp4,.webm,.mov,video/mp4,video/webm,video/quicktime"
              className="hidden"
              onChange={(event) => {
                acceptVisualFile(event.target.files?.[0] ?? null);
              }}
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card rounded-[1.8rem] p-5">
            <label className="block text-sm font-medium text-slate-200">
              Edit existing song
            </label>
            <select
              value={existingSongId}
              onChange={(event) => loadSong(event.target.value)}
              className="mt-3 w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none"
            >
              <option value="" className="bg-slate-950">
                New song upload
              </option>
              {songs.map((song) => (
                <option key={song.id} value={song.id} className="bg-slate-950">
                  {song.title} · {song.artist}
                </option>
              ))}
            </select>
            {selectedSongPackagingStatus ? (
              <p className="mt-3 text-xs text-slate-300">
                Current packaging status:{" "}
                <span className="font-semibold text-white">
                  {selectedSongPackagingStatus === "failed"
                    ? "Failed"
                    : selectedSongPackagingStatus === "processing"
                      ? "Processing"
                      : selectedSongPackagingStatus === "pending"
                        ? "Pending"
                        : "Ready"}
                </span>
              </p>
            ) : null}
          </div>

          <div className="glass-card rounded-[1.8rem] p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-200">
                Title
              </label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-200">
                Artist
              </label>
              <input
                value={artist}
                onChange={(event) => setArtist(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-200">
                Vibe
              </label>
              <select
                value={vibe}
                onChange={(event) => setVibe(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none"
              >
                {VIBE_OPTIONS.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                    className="bg-slate-950"
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-200">
                Genre
              </label>
              <input
                value={genre}
                onChange={(event) => setGenre(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-200">
                YouTube video URL
              </label>
              <input
                value={youtubeUrl}
                onChange={(event) => setYoutubeUrl(event.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-200">
                Duration (seconds)
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={durationSec}
                onChange={(event) => setDurationSec(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={
                isSaving ||
                !password ||
                !title ||
                !artist ||
                !vibe ||
                isSelectedSongBusy
              }
              className="mt-2 w-full rounded-2xl border border-cyan-100/70 bg-[linear-gradient(135deg,#67E8F9_0%,#22D3EE_45%,#06B6D4_100%)] px-4 py-3 text-sm font-bold text-slate-950 shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_12px_30px_rgba(34,211,238,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.18),0_16px_36px_rgba(34,211,238,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/90 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050816] disabled:border-white/8 disabled:bg-white/10 disabled:text-slate-400 disabled:shadow-none disabled:hover:translate-y-0"
            >
              {isSaving ? "Saving song..." : "Save song"}
            </button>

            {!isConfirmingDelete ? (
              <button
                type="button"
                onClick={() => {
                  setStatus(null);
                  setError(null);
                  setIsConfirmingDelete(true);
                }}
                disabled={isDeleting || !password || !existingSongId}
                className="mt-2 w-full rounded-2xl border border-rose-300/25 bg-rose-400/10 px-4 py-3 text-sm font-semibold text-rose-100 transition hover:bg-rose-400/16 disabled:border-white/8 disabled:bg-white/10 disabled:text-slate-400"
              >
                Delete selected song
              </button>
            ) : (
              <div className="mt-3 rounded-[1.4rem] border border-rose-300/20 bg-rose-400/10 p-4">
                <p className="text-sm text-rose-100">
                  Delete <span className="font-semibold">{title || "this song"}</span> from the local catalog?
                </p>
                <div className="mt-3 flex gap-3">
                  <button
                    type="button"
                    onClick={() => void handleDeleteSelectedSong()}
                    disabled={isDeleting}
                    className="flex-1 rounded-2xl border border-rose-300/25 bg-rose-400/20 px-4 py-3 text-sm font-semibold text-rose-50 transition hover:bg-rose-400/28 disabled:border-white/8 disabled:bg-white/10 disabled:text-slate-400"
                  >
                    {isDeleting ? "Deleting song..." : "Confirm delete"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(false)}
                    disabled={isDeleting}
                    className="flex-1 rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:border-white/8 disabled:bg-white/10 disabled:text-slate-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {status ? (
              <p className="text-sm text-emerald-300">{status}</p>
            ) : null}
            {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          </div>
        </div>
      </div>
    </form>
  );
}
