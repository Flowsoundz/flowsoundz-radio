"use client";

import { useId } from "react";

type AudioUploaderProps = {
  file: File | null;
  onFileChange: (file: File | null) => void;
  onClear: () => void;
};

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(0)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function AudioUploader({
  file,
  onFileChange,
  onClear,
}: AudioUploaderProps) {
  const inputId = useId();

  return (
    <div className="glass-card rounded-[1.75rem] border border-white/10 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/70">
            Audio Upload
          </p>
          <h2 className="mt-2 text-lg font-semibold text-white">Load a local track</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-300">
            Use an MP3, WAV, or M4A file to drive the browser-only visualizer. Nothing leaves the device.
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            file
              ? "border border-emerald-400/25 bg-emerald-400/12 text-emerald-200"
              : "border border-white/10 bg-white/[0.03] text-slate-400"
          }`}
        >
          {file ? "Ready" : "Idle"}
        </span>
      </div>

      <label
        htmlFor={inputId}
        className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-[1.45rem] border border-dashed border-white/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] px-5 py-8 text-center transition hover:border-cyan-300/35 hover:bg-cyan-300/[0.05]"
      >
        <span className="rounded-full border border-cyan-300/18 bg-cyan-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100">
          Select audio
        </span>
        <p className="mt-4 text-sm font-medium text-white">
          {file ? file.name : "Choose an audio file"}
        </p>
        <p className="mt-2 text-xs leading-5 text-slate-400">
          Recommended: mastered stereo files for smoother frequency response.
        </p>
      </label>

      <input
        id={inputId}
        type="file"
        accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/mp4,audio/x-m4a,.mp3,.wav,.m4a"
        className="sr-only"
        onChange={(event) => {
          const nextFile = event.target.files?.[0] ?? null;
          onFileChange(nextFile);
        }}
      />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[1.25rem] border border-white/8 bg-white/[0.03] px-4 py-3">
        <div className="text-sm text-slate-300">
          {file ? (
            <>
              {file.type || "Audio file"} / {formatFileSize(file.size)}
            </>
          ) : (
            "No file selected yet."
          )}
        </div>
        <button
          type="button"
          onClick={onClear}
          disabled={!file}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition ${
            file
              ? "border border-white/12 bg-white/[0.05] text-white hover:border-white/20 hover:bg-white/[0.08]"
              : "cursor-not-allowed border border-white/8 bg-white/[0.02] text-slate-500"
          }`}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
