import type { Metadata } from "next";
import { LegalPageView } from "@/components/LegalPageView";
import { getLegalPage } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = pageMetadata({
  title: "Privacy Notice | Avida Luna Wellness",
  description:
    "What the Avida Luna Wellness website collects, why, and how to ask us to delete it.",
  path: "/privacy",
});

// The text is edited in Sanity under "Legal pages". Default text: content/legal.ts.
export default async function PrivacyPage() {
  return <LegalPageView page={await getLegalPage("privacy")} />;
}
