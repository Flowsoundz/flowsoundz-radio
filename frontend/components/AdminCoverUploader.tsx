"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type AdminSongOption = {
  id: string;
  title: string;
  artist: string;
};

type AdminCoverUploaderProps = {
  songs: AdminSongOption[];
};

export function AdminCoverUploader({ songs }: AdminCoverUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [password, setPassword] = useState("");
  const [selectedSongTitle, setSelectedSongTitle] = useState(
    songs[0]?.title ?? "",
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewDimensions, setPreviewDimensions] = useState({
    width: 1200,
    height: 1200,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  async function acceptFile(file: File | null) {
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }

    const bitmap = await createImageBitmap(file);

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewDimensions({
      width: bitmap.width,
      height: bitmap.height,
    });
    bitmap.close();
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError(null);
    setStatus(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!password) {
      setError("Enter the admin password first.");
      return;
    }

    if (!selectedSongTitle) {
      setError("Choose a song first.");
      return;
    }

    if (!selectedFile) {
      setError("Choose an image first.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setStatus(null);

    try {
      const formData = new FormData();
      formData.append("password", password);
      formData.append("songTitle", selectedSongTitle);
      formData.append("file", selectedFile);

      const response = await fetch("/api/admin/covers", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json().catch(() => null)) as
        | { error?: string; coverUrl?: string }
        | null;

      if (!response.ok) {
        throw new Error(data?.error || "Failed to save cover.");
      }

      setStatus(
        `Saved cover for ${selectedSongTitle} to ${data?.coverUrl ?? "/covers/admin/"}.`,
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to save cover.",
      );
    } finally {
      setIsSaving(false);
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

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="glass-card rounded-[1.8rem] p-5">
          <label className="block text-sm font-medium text-slate-200">
            Cover image
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
              acceptFile(event.dataTransfer.files[0] ?? null);
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
            {previewUrl ? (
              <Image
                src={previewUrl}
                alt="Selected cover preview"
                width={previewDimensions.width}
                height={previewDimensions.height}
                unoptimized
                className="max-h-72 h-auto w-auto rounded-[1.2rem] object-contain"
              />
            ) : (
              <div className="space-y-2 text-sm text-slate-300">
                <p>Drag and drop a cover image here</p>
                <p>or click to choose a file</p>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => acceptFile(event.target.files?.[0] ?? null)}
          />
        </div>

        <div className="glass-card rounded-[1.8rem] p-5">
          <label className="block text-sm font-medium text-slate-200">
            Assign to song
          </label>
          <select
            value={selectedSongTitle}
            onChange={(event) => setSelectedSongTitle(event.target.value)}
            className="mt-3 w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none"
          >
            {songs.map((song) => (
              <option
                key={song.id}
                value={song.title}
                className="bg-slate-950"
              >
                {song.title} · {song.artist}
              </option>
            ))}
          </select>

          <button
            type="submit"
            disabled={
              isSaving || !selectedFile || !selectedSongTitle || !password
            }
            className="mt-5 w-full rounded-2xl border border-cyan-100/70 bg-[linear-gradient(135deg,#67E8F9_0%,#22D3EE_45%,#06B6D4_100%)] px-4 py-3 text-sm font-bold text-slate-950 shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_12px_30px_rgba(34,211,238,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.18),0_16px_36px_rgba(34,211,238,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/90 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050816] disabled:border-white/8 disabled:bg-white/10 disabled:text-slate-400 disabled:shadow-none disabled:hover:translate-y-0"
          >
            {isSaving ? "Saving cover..." : "Save cover"}
          </button>

          {status ? (
            <p className="mt-4 text-sm text-emerald-300">{status}</p>
          ) : null}
          {error ? (
            <p className="mt-4 text-sm text-rose-300">{error}</p>
          ) : null}
        </div>
      </div>
    </form>
  );
}
