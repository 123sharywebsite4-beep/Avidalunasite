import type { Metadata } from "next";
import { LegalPageView } from "@/components/LegalPageView";
import { getLegalPage } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = pageMetadata({
  title: "Terms of Use | Avida Luna Wellness",
  description:
    "Terms for using the Avida Luna Wellness website and buying wellness add-ons.",
  path: "/terms",
});

// The text is edited in Sanity under "Legal pages". Default text: content/legal.ts.
export default async function TermsPage() {
  return <LegalPageView page={await getLegalPage("terms")} />;
}
