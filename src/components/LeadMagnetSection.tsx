import { siteSettings as defaults } from "@content/fallback";
import type { LeadMagnetContent } from "@/lib/types";
import { LeadMagnetForm } from "./forms/LeadMagnetForm";

/**
 * The free-guide email signup block, always shown for now with the built-in
 * Wellness Notes copy (content/fallback.ts). Sanity's "Contact info → Free guide
 * signup" fields exist but aren't read yet.
 *
 * To let Sanity control it later, make this async and swap the line below for:
 *   const { leadMagnet } = await getSiteSettings();   // from "@/lib/content"
 *   return <LeadMagnetBlock content={leadMagnet} />;
 *
 * To show it on another page, render `<LeadMagnetSection />` there.
 */
export function LeadMagnetSection() {
  return <LeadMagnetBlock content={{ ...defaults.leadMagnet, enabled: true }} />;
}

/** The block itself, from props. Kept separate so it can be reused with other content. */
export function LeadMagnetBlock({ content }: { content: LeadMagnetContent }) {
  if (!content.enabled) return null;
  return (
    <section className="lead-magnet" aria-labelledby="lead-magnet-heading" data-testid="lead-magnet">
      <div className="container-page">
        <div className="lead-magnet-card">
          <div>
            <p className="lead-magnet-label">A complimentary guide from Shary</p>
            <h2 id="lead-magnet-heading">{content.heading}</h2>
          </div>
          <div>
            <p className="lead-magnet-description">{content.description}</p>
            <LeadMagnetForm buttonLabel={content.buttonLabel} successMessage={content.successMessage} />
          </div>
        </div>
      </div>
    </section>
  );
}
