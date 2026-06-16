import { redirect } from "next/navigation";

// Retired 2026-06-16: /artist/releases duplicated /artist/drops (both scheduled
// memberReleaseAt/publicReleaseAt). Drops is the canonical scheduler. Redirect
// preserves any existing bookmarks/links.
export default function ReleasesPage() {
  redirect("/artist/drops");
}
