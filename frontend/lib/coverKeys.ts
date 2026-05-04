export function normalizeCoverKey(value?: string | null): string {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9.\s_-]+/g, " ")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function slugifyCoverTitle(title: string): string {
  return normalizeCoverKey(title).replace(/\s+/g, "-");
}

export function getAdminCoverSrc(title: string): string {
  const slug = slugifyCoverTitle(title);
  return slug ? `/covers/admin/${slug}.webp` : "";
}
