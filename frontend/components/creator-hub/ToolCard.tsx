type ToolCardProps = {
  name: string;
  bestFor: string;
  href: string;
  tag?: string;
  tagColor?: string;
  notes?: string;
};

export function ToolCard({
  name,
  bestFor,
  href,
  tag,
  tagColor = "#00e5ff",
  notes,
}: ToolCardProps) {
  return (
    <div className="glass-card flex flex-col gap-3 rounded-[1.6rem] p-5">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-white">{name}</h3>
        {tag ? (
          <span
            className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em]"
            style={{
              color: tagColor,
              borderColor: `${tagColor}40`,
              background: `${tagColor}12`,
            }}
          >
            {tag}
          </span>
        ) : null}
      </div>
      <div className="flex-1">
        <p className="text-xs text-slate-400">
          <span className="font-medium text-slate-300">Best for:</span>{" "}
          {bestFor}
        </p>
        {notes ? (
          <p className="mt-1.5 text-xs leading-5 text-slate-500">{notes}</p>
        ) : null}
      </div>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-9 items-center justify-center rounded-full border border-white/12 bg-white/[0.05] px-4 py-2 text-xs font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
      >
        Open Tool ↗
      </a>
    </div>
  );
}
