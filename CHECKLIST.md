# Launch checklist (Abe)

Things the code can't do for us, in roughly the order to do them. Every service stays on its **free plan**: no paid upgrades or add-ons.

## 0. Repo and content
- [ ] Commit her source files to `main`: `/docs/source-content.md`, `/docs/brand/logo.png`, `/docs/brand/current-site-header.png`, `/docs/mockups/*.png`. Then update the copy deck and fallback content from them.
- [ ] Set `main` as the default branch on GitHub (Settings → General → Default branch).
- [ ] The repo is under `abrahamqdiaz-a11y`. If Shary is meant to own it, transfer it to her GitHub account before handoff and keep Abe as a collaborator.
- [ ] Shary approves `/docs/copy-deck.md` in writing (all medical wording is her responsibility under our agreement), and the "Needs review" list goes to a qualified professional.

## 1. Sanity (her account, free plan)
- [x] Project created: **AvidaLunaWebsite**, project ID `p388w82e`, dataset `production` (already set in `studio/sanity.cli.ts` and `studio/sanity.config.ts`). Skip Sanity's "Set up Sanity" wizard: the Studio already exists in `/studio`.
- [ ] Make sure the project is in **Shary's** Sanity account, with Abe invited as Administrator.
- [ ] Create an API token (Viewer) → `SANITY_API_READ_TOKEN`.
- [ ] Deploy the Studio to `avidaluna.sanity.studio`:
      `cd studio && npm install && npx sanity login && npx sanity deploy`
- [ ] Import the starting content: `npm run seed:build` (from the repo root), then
      `cd studio && npm run seed` (`--replace` overwrites seeded documents with the same IDs).
      **Only for an empty dataset.** Once Shary has edited anything, never re-run it: use a one-off update script like the one below.

### November 2026 wellness education articles (one-off)
Adds the new article "Mobile IV Hydration for Busy Schedules" and, on "Understanding IV Therapy", sets the full title and adds the opening paragraph at the top. Nothing else Shary wrote is changed. Safe to run twice.
- [ ] Dry run (writes nothing): `cd studio && npx sanity exec scripts/add-wellness-articles.ts --with-user-token`
- [ ] Apply: `cd studio && npx sanity exec scripts/add-wellness-articles.ts --with-user-token -- --apply`
- [ ] Check https://www.avidaluna.com/wellness-education shows both articles.

### November 2026 pricing, packages and booking update (one-off)
Updates only the documents and fields in Shary's pricing spec (service names and prices, restorative prices and enhancement prices, compression boots and the Vitamin Wellness Spray, the eight packages, travel and IV timing in Contact info, the affected FAQ answers and page text). Everything else Shary edited is left alone. The "Recovery add-on" placeholder is hidden, not deleted. If a document has an unpublished draft, the draft gets the same fields.
- [ ] Deploy the Studio first, so the new **Packages** menu and fields exist: `cd studio && npx sanity deploy`
- [ ] Dry run (prints every change as `old -> new`, writes nothing):
      `cd studio && npx sanity exec scripts/update-packages-pricing.ts --with-user-token`
- [ ] Read the diff. Anything Shary reworded on purpose (an FAQ answer, a page heading) shows up here: if she'd rather keep hers, edit it back in the Studio after applying.
- [ ] Apply: `cd studio && npx sanity exec scripts/update-packages-pricing.ts --with-user-token -- --apply`
- [ ] Run the dry run again: it should say every document is already up to date.
- [ ] If it lists documents under "Check by hand" (aromatherapy with "45 minutes"), fix them in the Studio.
- [ ] Add `"package"` to the webhook filter (below) so package edits go live without a deploy.

### Restorative booking copy update (one-off)
Changes six texts that still say restorative visits are paid at the visit, need "a few preferred times", or are booked "directly with Shary": FAQ answers `faq-book`, `faq-pay`, `faq-addons`, `faq-cancel`, and the page sections `pageText-packages` → restorative and `pageText-services` → addons. A field is only changed if it still holds the old default text; anything Shary rewrote is listed under "Check by hand" with the suggested text.
- [ ] Dry run: `cd studio && npx sanity exec scripts/update-restorative-copy.ts --with-user-token`
- [ ] Apply: `cd studio && npx sanity exec scripts/update-restorative-copy.ts --with-user-token -- --apply`
- [ ] Run the dry run again: every field should say "already up to date".
- [ ] If Terms or Privacy were published in Sanity, the dry run says so: update them in the Studio to match `content/legal.ts` (one preferred date, online payment, the full-refund sentence).
- [ ] CORS origins (sanity.io/manage → API → CORS): `http://localhost:3000`, the Netlify preview URL, `https://www.avidaluna.com`. No credentials needed for the site; the Studio host is added automatically.
- [ ] Webhook (sanity.io/manage → API → Webhooks):
  - URL `https://www.avidaluna.com/api/revalidate` (add a second one for the preview URL while testing)
  - Dataset `production`, trigger on create, update, delete
  - Filter: `_type in ["service","addon","package","event","article","faq","pageText","legalPage","siteSettings","testimonial"]`
  - Projection: `{_type}`
  - Secret: the same long random string as `SANITY_REVALIDATE_SECRET`
  - HTTP method POST, API version `v2025-02-19` or newer
- [ ] Check edits appear on the site in about a minute without a deploy.

## 2. Netlify (her account, free plan)
- [ ] Create the site in **Shary's** Netlify account from her GitHub repo. Build settings come from `netlify.toml`.
- [ ] Add every environment variable from the table below.
- [ ] Free plan: reportedly **300 credits/month; each production deploy costs about 15 credits, bandwidth about 20 credits/GB**, and sites pause if credits run out. Check the current numbers at netlify.com/pricing. Keep deploys rare: content changes go through Sanity, not deploys.
- [ ] Consider turning off automatic deploy previews for every push once review is done (Site configuration → Build & deploy), to save credits.

### Netlify Forms (Abe)
The contact form, the group-event request, "Pay at my visit", the package/enhancement confirmation and the restorative-visit request are Netlify forms (`contact`, `group-request`, `add-ons-at-visit`, `booking-extras`, `restorative-request`, defined in `public/__forms.html`).
- [ ] **Forms → Enable form detection.** Then redeploy once so Netlify registers the five forms (they should appear under Forms).
- [ ] **Project configuration → Notifications → Form submission notifications** (Netlify's docs also call it Forms → Submission notifications → Add notification): add an **Email notification** to `YourRNShary@gmail.com` for each of `contact`, `group-request`, `add-ons-at-visit`, `booking-extras` and `restorative-request` (or one for "Any form"). `booking-extras` tells Shary which package items and enhancements to bring and what's due at the visit; `restorative-request` is a restorative-only visit to confirm with the client by text or email.
- [ ] Test each form on the deploy preview with a real-looking email and full sentences (Netlify's spam filter flags `test@test.com`). Missing submission? Look under **Spam submissions** first.
- [ ] Check the free-plan form submission allowance at netlify.com/pricing.

## 3. Stripe (her account)
- [ ] Shary creates her own Stripe account. Abe adds the **test** keys (`STRIPE_SECRET_KEY`).
- [ ] Webhook endpoint: `https://www.avidaluna.com/api/stripe/webhook`, event `checkout.session.completed` → `STRIPE_WEBHOOK_SECRET`.
- [ ] Test with card `4242 4242 4242 4242` and the Stripe CLI:
      `stripe listen --forward-to localhost:3000/api/stripe/webhook` (put the `whsec_...` it prints in `.env.local` as `STRIPE_WEBHOOK_SECRET`; the Dashboard secret won't work locally) then `stripe trigger checkout.session.completed`.
- [ ] Restorative visit, end to end (test mode): book Luna Light on `/book/restorative`, pay with `4242 4242 4242 4242`. Check: the Netlify "restorative-request" email has the reference and "Paying online"; the Stripe payment shows the same reference; the success page shows it; the function log shows `[stripe] restorative visit paid`. Then refund it in Stripe (Payments → the payment → Refund).
- [ ] Cancel at Stripe once: `/book/restorative/cancel` restores the form; "Send as a request and pay at my visit" sends a second email with the same reference.
- [ ] **Before live:** Shary's cancellation and refund policy goes in the FAQ (`faq-cancel`) and Terms. The booking page already promises a full refund if she can't make the time.
- [ ] Turn on Stripe payment email notifications for Shary (Settings → Notifications).
- [ ] After approval, swap in the live keys and the live webhook secret, then redeploy once.
- [ ] **If Stripe doesn't approve her account, we switch to another processor (for example Square), whose fees may differ.** The code is ready for that: implement `PaymentProvider` in `src/lib/payments/` (add-ons and restorative visits both use it).
- [ ] Help her set up in-person card payments (in our agreement).

## 4. Mailchimp (Shary does this in her own account)
The site adds people through her public signup form (no API key, no access to her account). It sends only `EMAIL`, `FNAME`, `LNAME`, `SOURCE` and `OPTIN`:

| Where | `SOURCE` | `OPTIN` |
|---|---|---|
| /book step 1 (everyone who asks for a booking link) | `booking` | `yes` if they ticked the box, else `no` |
| /join | `join`, or `join:<event-slug>` if they picked an event | `yes` (required) |
| Contact form, box ticked | `contact` | `yes` |
| Group-event request, box ticked | `group` | `yes` |
| Restorative-visit request (everyone who sends one) | `restorative` | `yes` if they ticked the box, else `no` |

- [ ] **Audience fields:** add two **Text** fields with the merge tags **`SOURCE`** and **`OPTIN`** (Audience → Settings → Audience fields and \*|MERGE|\* tags). They can be hidden on her signup form. `EMAIL`, `FNAME`, `LNAME` and `PHONE` already exist (the site no longer sends `PHONE`).
- [ ] **Turn off reCAPTCHA** on her signup form, or the site's background sign-ups will fail.
- [ ] **Decide on double opt-in.** If it's on, people must confirm by email before her automations reach them (including the booking-link email).
- [ ] **Automations** (need a paid plan such as Essentials; the free plan reportedly has none):
  - When someone joins with `SOURCE` = `booking`, send one email with the booking link (https://booking.hydreight.com/widget-business/an92x) and the add-ons page (https://www.avidaluna.com/add-ons). The site says "We'll email your booking link and visit details", so this one has to be live before launch.
  - Send the complimentary "Wellness Notes" only to contacts whose `SOURCE` starts with `join`.
  - Send newsletters only to `OPTIN` = `yes`. Everyone who books is on the list, so every campaign must use this segment.
- [ ] **Known limit:** Mailchimp's public form doesn't update people already on the list, so a returning client won't trigger the booking automation again.
- [ ] Contacts: everyone who asks for a booking link is now added, so check her plan's contact limit.
- [ ] Test on the deploy preview: request a booking link, join on /join, and tick the box on the contact form, each with your own email; check `SOURCE` and `OPTIN` on each contact.

## 5. Contact address
- [ ] `CONTACT_EMAIL` = `YourRNShary@gmail.com` (also the code default). It's shown on the site and in the forms' "Please email … instead" messages.
- [ ] Later (optional): swap it for a business address once the domain moves (env var + Sanity Contact info).
- [ ] **Sanity Studio → Page text → Join:** update the heading to "Wellness Notes from a Nurse" and the intro to "Thoughtful, nurse-led notes and practical reminders to support your long-term health, one intentional choice at a time. #LiveWellLonger". Don't re-run the seed; it would overwrite Shary's edits.

## 6. Hydreight
- [ ] Check that the booking link works: https://booking.hydreight.com/widget-business/an92x
- [ ] Ask Hydreight whether their booking email includes the client's email (needed for the future automation in `HANDOFF.md`).
- [ ] Ask how group-event guests each book and get screened.

## 7. QR codes and short link
- [ ] Her printed QR codes and `bit.ly/Avida-Luna` skip the intake form. Decide: repoint the bit.ly link to `/book`, and/or reprint QR codes. Files: `public/qr/join.png|svg` and `public/qr/book.png|svg` (regenerate with `npm run qr`).

## 8. Domain and launch
- [ ] Transfer the domain from Squarespace to a registrar in **Shary's** name.
- [ ] Point DNS to Netlify; set `www.avidaluna.com` as the primary domain.
- [ ] Set `NEXT_PUBLIC_HIDE_TODOS=1` only after every TODO is resolved.
- [ ] After launch, check every redirect (`/about-me`, `/cart`, `/wellnesseducation`, `/faq-1`) returns 301, and add any other old URLs (blog posts) to `next.config.ts`.
- [ ] Submit `https://www.avidaluna.com/sitemap.xml` in Google Search Console (her Google account).

## 9. Handoff (in our agreement)
- [ ] Confirm Shary is owner and admin on every account (GitHub, Netlify, Sanity, Stripe, Mailchimp, domain).
- [ ] Send `HANDOFF.md` and `/docs/how-to-edit.md`.
- [ ] Hold the walkthrough call.
- [ ] Final payment is due after she approves the site and receives the handoff.

## 10. Collect from Shary
- [ ] Her current site text (`source-content.md`), including her About story and mission quote, word for word
- [ ] Photos (starting with `SharyPic.jpg`), and photos for each add-on
- [ ] Higher-res or vector logo (SVG)
- [x] Instagram and Facebook links
- [ ] Confirmed drip names and prices (do they match Hydreight?), and whether glutathione / B-complex stay listed
- [ ] Recovery Ritual contents and duration
- [ ] Service area. Travel pricing for injection-only appointments and the B12 packages (booking for them shows "Booking opens soon" until this is decided; then turn on **Booking open** on each B12 package in the Studio)
- [ ] Typical total IV appointment length (Contact info → "Total IV appointment time")
- [ ] Cancellation and refund policy
- [ ] Photos for compression boots and the Vitamin Wellness Spray
- [ ] The PubMed link for her article
- [ ] Whether anyone else attends appointments ("our caring team" on the current site)
- [ ] Her written approval of `/docs/copy-deck.md`

## Environment variables (Netlify → Site configuration → Environment variables)

| Key | Value / notes |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://www.avidaluna.com` |
| `HYDREIGHT_BOOKING_URL` | `https://booking.hydreight.com/widget-business/an92x` (also the code default) |
| `CONTACT_EMAIL` | `YourRNShary@gmail.com` (also the code default) |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | `p388w82e` |
| `NEXT_PUBLIC_SANITY_DATASET` | `production` |
| `SANITY_API_READ_TOKEN` | Viewer token (used only by checkout for live prices) |
| `SANITY_REVALIDATE_SECRET` | Long random string; same value in the Sanity webhook |
| `STRIPE_SECRET_KEY` | Test key first, live after approval |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Not needed (hosted Checkout). Leave empty. |
| `STRIPE_WEBHOOK_SECRET` | From the Stripe webhook endpoint |
| `NEXT_PUBLIC_MAILCHIMP_DC`, `_U`, `_ID`, `_F_ID` | Optional. Her public signup form (`us22`, `7887c318e6740cc303be74a3f`, `485dcfa742`, `00a1c2e1f0` are the code defaults). Set only if her form changes. |
| `NEXT_PUBLIC_MAILCHIMP_SOURCE_TAG`, `NEXT_PUBLIC_MAILCHIMP_OPTIN_TAG` | Optional. Merge tags of her two text fields (defaults `SOURCE`, `OPTIN`). |
| `HYDREIGHT_HOOK_SECRET` | Long random string, for the future automation stub |
| `NEXT_PUBLIC_HIDE_TODOS` | Optional. `1` hides TODO boxes (launch only) |

Env var changes need one redeploy to take effect (Deploys → Trigger deploy).
