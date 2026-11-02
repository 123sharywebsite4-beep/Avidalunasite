import type { Metadata } from "next";
import { FinalCta } from "@/components/FinalCta";
import { PackageGroups } from "@/components/PackageGroups";
import { PageHero } from "@/components/PageHero";
import { getPackages, getPageText, getSiteSettings } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = pageMetadata({
  title: "IV & Restorative Wellness Packages | Avida Luna",
  description:
    "Restorative, IV and B12 wellness packages with red light, compression boots and aromatherapy, brought to you in Lakewood Ranch, Sarasota and Bradenton.",
  path: "/packages",
});

export default async function PackagesPage() {
  const [text, packages, settings] = await Promise.all([getPageText("packages"), getPackages(), getSiteSettings()]);
  return (
    <>
      <PageHero eyebrow="Packages" heading={text.heading} intro={text.intro} />
      <PackageGroups packages={packages} settings={settings} sections={text.sections} />
      <FinalCta />
    </>
  );
}
