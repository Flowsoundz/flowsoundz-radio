import { SiteShell } from "@/components/site-shell";

export default function AdminPage() {
  return (
    <SiteShell
      title="Admin"
      description="Placeholder route for admin workflows."
    >
      <div className="rounded-3xl border border-white/10 bg-panel/80 p-8">
        <h2 className="text-2xl font-semibold text-white">Admin console placeholder</h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
          This route is reserved for internal content, queue, and release management.
        </p>
      </div>
    </SiteShell>
  );
}
