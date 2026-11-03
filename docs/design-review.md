# Avida Luna design rollout

The approved homepage direction is applied to the public website: cream, olive and sage, one locally hosted Manrope variable font, flat surfaces, fine dividers, square controls and responsive layouts. The original stacked logo remains in use. The existing horizontal mockup is a review option, pending Shary’s approval and a clean designer export.

## Development and verification

Use the existing checkout (no extra worktree is needed). With Node 24, run `npm ci` at the root, and `npm run dev` for development. The site supports fallback content without service credentials. The font is bundled at `public/fonts/manrope-latin-variable.woff2`, distributed under the adjacent SIL Open Font License from Fontsource’s Manrope package; no Google Fonts network access is needed.

Run `npm run typecheck`, `npm run lint`, and `PW_CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e`. The existing Playwright configuration builds the production app and runs local mocks of payment and email providers. These checks never exercise a real payment or deliver an email.

After the test suite has exited, run `node scripts/review-site.mjs` from the repository root to capture desktop/mobile screenshots and a self-contained HTML/PDF review under `/workspace/design-review/site`. The capture script starts and stops its own production server and service mocks on ports 3200 and 3299. Those ports must be free. It captures real form validation and local mock success states. The contact service-error example is explicitly simulated. It does not publish the site.

## Kept connected

- Sanity page text, services, FAQs, events, site settings and testimonials.
- Hydreight booking handoff, existing intake validation, marketing consent and session storage.
- Stripe server-side price checks, quantity limits, payment confirmation and cancellation recovery.
- Contact and group forms, validation, spam controls and their API routes.
- Canonicals, structured data, redirects, security headers, noindex payment pages and sitemap routes.

## Review before launch

- Confirm the supplied IV menu and starting prices. Prices are identified as provisional; Hydreight remains the source for final service selection and pricing.
- Confirm Shary’s credentials and copy, service coverage/travel fees, policies and any remaining service details.
- Replace the small existing portrait with the original or professional photographs. No substitute nurse photos or generated portraits are used.
- Review the general article overview. The complete original article and authoritative supporting sources are still needed. A draft article does not emit a publication date in structured data.
- Supply the exact mission wording, if it is to be shown. Empty testimonials stay hidden; only permissioned CMS testimonials render.
- Review the legal drafts. Their review notices remain visible.
- Configure the actual Sanity, Stripe, Mailchimp and Netlify Forms accounts securely before expecting live integrations. No credentials are embedded in the design.

Content TODOs remain recorded in source and CMS-facing guidance but are hidden from the visitor interface. The supplied “Recovery Ritual” add-on uses “Recovery add-on” as its public fallback name to respect the brief’s tone; its underlying ID and pricing behavior are unchanged.
