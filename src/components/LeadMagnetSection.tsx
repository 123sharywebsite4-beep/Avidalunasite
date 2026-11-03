import { getSiteSettings } from "@/lib/content";
import type { LeadMagnetContent } from "@/lib/types";
import { LeadMagnetForm } from "./forms/LeadMagnetForm";

/**
 * The free-guide email signup block. Its text and on/off switch live in Sanity
 * (Contact info → Free guide signup). Renders nothing until Shary turns it on.
 *
 * To show it on another page, render `<LeadMagnetSection />` there. It fetches its own
 * settings (the same cached, tagged siteSettings read as the footer), so the webhook
 * at /api/revalidate refreshes it with the rest of Contact info.
 */
export async function LeadMagnetSection() {
  const { leadMagnet } = await getSiteSettings();
  return <LeadMagnetBlock content={leadMagnet} />;
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
