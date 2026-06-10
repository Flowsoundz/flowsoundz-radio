type PromoPackageCardProps = {
  name: string;
  description: string;
  price: string;
  ctaLabel: string;
  accent: string;
  note?: string;
  inclusions?: string[];
  badge?: string;
  isSelected?: boolean;
  onSelect?: () => void;
};

export function PromoPackageCard({
  name,
  description,
  price,
  ctaLabel,
  accent,
  note,
  inclusions,
  badge,
  isSelected = false,
  onSelect,
}: PromoPackageCardProps) {
  return (
    <article
      className={`glass-card flex flex-col rounded-[1.8rem] border bg-[#0B1020]/88 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.28)] ${
        isSelected ? "border-cyan-300/25" : "border-white/8"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] ${accent}`}>
          {badge ?? "Promo Package"}
        </div>
      </div>
      <h3 className="mt-4 text-2xl font-semibold text-[#F8FAFC]">{name}</h3>
      <p className="mt-3 text-sm leading-6 text-[#CBD5E1]">{description}</p>

      {inclusions && inclusions.length > 0 && (
        <ul className="mt-4 flex-1 space-y-2">
          {inclusions.map((item) => (
            <li key={item} className="flex items-start gap-2 text-xs text-slate-300">
              <span className="mt-[3px] shrink-0 text-[10px] text-emerald-400">✓</span>
              {item}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[#CBD5E1]/55">
            One-time
          </p>
          <p className="mt-1 text-2xl font-semibold text-[#F8FAFC]">{price}</p>
        </div>
        <button
          type="button"
          onClick={onSelect}
          className="min-h-11 w-full rounded-full border border-white/8 bg-white/6 px-4 py-2.5 text-sm font-semibold text-[#F8FAFC] transition hover:border-white/12 hover:bg-white/10 sm:w-auto"
        >
          {isSelected ? "Selected" : ctaLabel}
        </button>
      </div>
      {note ? (
        <p className="mt-3 text-xs leading-5 text-[#CBD5E1]/60">{note}</p>
      ) : null}
    </article>
  );
}
