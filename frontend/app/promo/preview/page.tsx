import { redirect } from "next/navigation";

// This page was tied to the Stripe checkout flow (now disabled).
// Redirect to the free submission path.
export default function PromoPreviewPage() {
  redirect("/artist/submit");
}
