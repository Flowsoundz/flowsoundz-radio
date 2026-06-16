import { redirect } from "next/navigation";

// Retired 2026-06-16: /artist/release-submit was a legacy quick-intake form that
// bypassed the AI promo generation + curation review — the value that justifies
// the submission fee. /artist/submit is the single canonical flow. Redirect
// preserves any old links.
export default function ReleaseSubmitPage() {
  redirect("/artist/submit");
}
