export default function GlobalLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050816]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-[#00e5ff]" />
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-600">
          Loading
        </p>
      </div>
    </div>
  );
}
