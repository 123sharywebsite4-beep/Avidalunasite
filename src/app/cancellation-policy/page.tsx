import type { Metadata } from "next";
import { cancellationPolicy } from "@content/legal";
import { LegalPageView } from "@/components/LegalPageView";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Cancellation and Refund Policy | Avida Luna Wellness",
  description:
    "Cancellation fees and refunds for restorative visits, IV appointments and telehealth consultations with Avida Luna Wellness.",
  path: "/cancellation-policy",
});

// Linked from every booking form. The text lives in content/legal.ts (code only, not Sanity).
export default function CancellationPolicyPage() {
  return <LegalPageView page={{ ...cancellationPolicy(), lastUpdated: null, showDraftNote: false }} />;
}
