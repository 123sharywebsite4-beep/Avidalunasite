# Avida Luna Wellness website: handoff

## What this is
The website for **Avida Luna LLC, doing business as Avida Luna Wellness** (avidaluna.com). It covers the brand, a plain overview of services, wellness add-ons, group events, education, the booking-intake step and add-on checkout.

**Medical booking, screening and payment happen on Hydreight**, not on this site. The site never asks for or stores health information.

### Pricing and booking rules (Shary, November 2026)
- One-time bookings only: no memberships, recurring billing or prepaid multi-visit series.
- **Medical** (IVs, IM injections, IV nutrient add-ons): booked, screened and paid on Hydreight.
- **Non-medical** (targeted red light, compression boots, aromatherapy, Vitamin Wellness Spray): a restorative-only visit is booked on `/book/restorative` and, once Stripe has keys, paid online when booked (without keys: paid at the visit). Enhancements added to an IV visit are paid at the visit (or online on `/add-ons`). Each item has a standalone price and a lower enhancement price (when added to an appointment or package).
- **Packages** (`package` documents): restorative (Luna Light / Reset / Signature Reset), IV wellness, and B12 wellness. For IV and B12 packages the site shows the split: the IV/injection's price is paid on Hydreight, the rest of the package price at the visit. It never asks which IV (Recovery Reset's Energy-or-Athlete choice is made on Hydreight). Every IV/injection package shows the "Required medical consultation included…" line; there's no consultation charge anywhere.
- **Travel** (Contact info in Sanity): restorative-only visits pay a travel fee ($8) once per appointment, shown with the total before booking (and its own line item at Stripe checkout). IV visits have travel included within a 35-minute one-way drive ("Additional travel charges may apply and will be confirmed before booking."). Injection-only travel isn't decided yet, so the B12 packages show "Booking opens soon" (Sanity: **Booking open** off) and IM injections have no booking button.
- **Timing**: IV infusion time and total appointment time are always shown separately. Aromatherapy runs alongside the service and adds no time.
- **Booking flows** on `/book` (static page; the flow is picked in the browser from the URL):
  - `/book` and `/book?package=<iv package>`: details → Hydreight → enhancements (only ones the package doesn't include) → "Pay at my visit" sends Netlify form `booking-extras`.
  - `/book?package=<luna package>` and `/book?restorative=1` redirect to **`/book/restorative`** (its own static page: heading "Book a restorative visit"). One main choice at its own price, extras at enhancement prices, plus the travel fee, and **one** preferred date and time, chosen from two dropdowns that only list bookable slots (Florida time, 10:00 AM to 5:00 PM starts every 30 minutes, 24 hours to 90 days ahead; Shary can change these in `BOOKING_HOURS` in `src/lib/restorative.ts`, checked again on the server). Every date the site shows is US format ("Thursday, November 26, 2026 at 2:00 PM (Florida time)"); no native date pickers, because browsers draw those in the device's locale. Netlify form `restorative-request`, Mailchimp `SOURCE=restorative`.
  - **Stripe on:** "Continue to payment" sends the Netlify form first (with a booking reference like `AL-7K3QPX` and "Paying online"), then opens Stripe Checkout tagged with the same reference. No payment can happen without Shary having the details. If the form fails, nothing is charged. If the person abandons Stripe, Shary has a form email with no matching payment: not booked. `/book/restorative/cancel` restores the form and offers "Send as a request and pay at my visit".
  - **Stripe off:** "Send my request", pay at the visit (as before), still with a reference.
  - The date is a request until Shary confirms by text or email. If she can't make it and no other time works, she refunds in full in Stripe (Payments → the payment → Refund). The full cancellation and refund policy is still a TODO from Shary.
- **Compliance exception**: "Detox/Hangover IV" and "Migraine IV" are Shary's own service names (her responsibility under our agreement). `ALLOWED_SERVICE_NAMES` in `studio/lib/compliance.ts` skips exactly those two names; the words are still flagged everywhere else.

| Part | Tool |
|---|---|
| Website | Next.js 16 (App Router, TypeScript) + Tailwind 4, hosted on Netlify |
| Content Shary edits | Sanity Studio at `avidaluna.sanity.studio` (code in `/studio`) |
| Online payments | Stripe Checkout (hosted page) for add-ons and restorative visits, behind `src/lib/payments` so another processor can replace it |
| Email list | Mailchimp, through Shary's **public signup form** (no API key), posted in the background from the site's own forms (`src/lib/mailchimp-signup.ts`) |
| Form emails | Netlify Forms: "contact", "group-request", "add-ons-at-visit", "booking-extras" and "restorative-request" are emailed to Shary (`public/__forms.html`) |
| Booking-link note | Shary's Mailchimp automation on `SOURCE = booking` (the site sends no email itself) |
| IV booking | Hydreight: https://booking.hydreight.com/widget-business/an92x |

## Accounts and owners

Every account must end up owned by Shary, with Abe as a collaborator until handoff is complete. Free plans only. Plan allowances change often: the numbers below were checked in October 2026 from third-party summaries (the official pages couldn't be loaded from the build environment), so **confirm them on each official page**.

| Service | Used for | Owner | Admin | Plan | Free allowances (verify) |
|---|---|---|---|---|---|
| GitHub | Code | Shary (transfer from `abrahamqdiaz-a11y`) | Abe | Free | Unlimited private repos. https://github.com/pricing |
| Netlify | Hosting, previews | Shary | Abe | Free | ~300 credits/month; a production deploy ≈ 15 credits, bandwidth ≈ 20 credits/GB; sites pause when credits run out. https://www.netlify.com/pricing/ |
| Sanity | Content editor | Shary | Abe | Free | ~1M CDN API requests/month, ~250k uncached API requests/month, 10k documents, 2 datasets, Studio hosting included; hard caps. https://www.sanity.io/pricing |
| Stripe | Add-on payments | Shary | Abe (test keys during build) | Standard (no monthly fee; per-transaction fees) | https://stripe.com/pricing |
| Mailchimp | Email list and automations | Shary (Abe has no access) | Shary | **Paid (e.g. Essentials)** for automations | The free plan reportedly has no automations and 250 contacts (2026). Everyone who asks for a booking link is added, so contacts grow faster than before. https://mailchimp.com/pricing/marketing/ |
| Domain registrar | avidaluna.com | Shary | | n/a | Transfer away from Squarespace |
| Hydreight | Medical booking | Shary | | Her existing account | n/a |

## How deploys work
- Every push to a branch with an open pull request builds a **deploy preview** on Netlify (uses credits).
- Merging to `main` builds **production**. Nothing goes live without a merge, and merges need Abe's approval.
- Build settings: `netlify.toml` (Node 24, `npm run build`, the official Next.js runtime).
- Environment variable changes need one redeploy (Netlify → Deploys → Trigger deploy).

## How content updates go live (no rebuild)
1. Shary publishes in Sanity.
2. Sanity's webhook calls `POST /api/revalidate` (signed with `SANITY_REVALIDATE_SECRET`).
3. The site refreshes only that content type's cache tag (`revalidateTag`). The next visitor sees the change, usually within a minute.
4. As a backstop, every page refreshes at most hourly, which is also how past events drop off.

Public pages read from Sanity's CDN (cheap on the free allowance). The only uncached read is in checkout, so prices are always live.

If Sanity isn't configured, the site renders from `/content/fallback.ts`, so builds never break.

## Payments: how the price stays honest
- Online payment is off in production until Stripe keys are added (`paymentsEnabled()` is false): add-ons and restorative visits are then paid at the visit, and every page says so. With keys, the same pages switch to "paid online" on the next deploy.
- The browser sends only `[{ id, quantity }]` to `/api/checkout`, never a price. Add-ons are charged at their enhancement price (they're for a booked appointment).
- The server reads those add-ons live from Sanity, rejects hidden or unknown items, caps quantity at 10, and builds Stripe line items from the server-side prices.
- Restorative visits: the browser sends only the choice id, enhancement ids, the date, the email for the receipt and the total it showed to `/api/restorative-checkout`. The server re-prices everything live from Sanity (package or standalone price, enhancement prices, travel fee), refuses anything hidden, closed, already included or with an open TODO (409), and returns 409 if the total differs from what the person saw. Stripe gets ids, the date and the reference in metadata, never a name, phone number or address.
- The webhook `/api/stripe/webhook` verifies Stripe's signature and logs only ids, the amount and, for restorative visits (`metadata.kind = "restorative"`), the booking reference.
- To switch processors (e.g. Square): implement `AddOnPaymentProvider` in `src/lib/payments/`, and change one line in `src/lib/payments/index.ts`.

## Forms and the email list
No email service and no Mailchimp API key: Shary keeps her inbox and her Mailchimp account to herself.

| Form | Where it goes | Mailchimp (`SOURCE`, `OPTIN`) |
|---|---|---|
| /book step 1 (first name, last name, email, opt-in box) | Nowhere else; the booking link shows at once | Always: `booking`, `yes`/`no` |
| /join (Wellness Notes from a Nurse) | Nowhere else | `join` or `join:<event-slug>`, `yes` (box required). Shows an error if Mailchimp fails |
| Contact form | Netlify form `contact` → emailed to Shary | Only if the box is ticked: `contact`, `yes` |
| Group-event request | Netlify form `group-request` → emailed to Shary | Only if the box is ticked: `group`, `yes` |
| "Pay at my visit" (/add-ons) | Netlify form `add-ons-at-visit` → emailed to Shary | Never |
| "Pay at my visit" (/book step 3: package items + enhancements) | Netlify form `booking-extras` (name, email, package, non-medical items, amount due at the visit) → emailed to Shary | Never |
| Restorative visit (/book/restorative, Luna packages) | Netlify form `restorative-request` (name, email, phone, city/ZIP, choice, enhancements, travel fee, total, preferred date and time, payment: online or at visit, booking reference) → emailed to Shary | Always: `restorative`, `yes`/`no` |

- Mailchimp gets only `EMAIL`, `FNAME`, `LNAME`, `SOURCE` and `OPTIN`, from the browser, via her signup form's JSONP endpoint (`subscribe/post-json`), with Mailchimp's honeypot field sent empty. "Already subscribed" counts as success; it gives up after 8 seconds. The form values and the two merge tag names can be overridden with the `NEXT_PUBLIC_MAILCHIMP_*` env vars (see `.env.example`).
- The CSP allows scripts from `https://avidaluna.us22.list-manage.com` for that JSONP reply. Nothing else was opened.
- Netlify forms are defined in `public/__forms.html` and submitted there with `fetch` (`application/x-www-form-urlencoded`, with `form-name`), the documented approach for Next.js on `@netlify/plugin-nextjs` v5. Each has a Netlify honeypot (`bot-field`), and Netlify filters spam with Akismet: check **Forms → Spam submissions** if a message seems missing.
- Mailchimp's public form doesn't update people already on the list, so a returning client doesn't trigger the booking automation again, and their `SOURCE`/`OPTIN` stay as they were.

### Setup (details and tests in `CHECKLIST.md` sections 2 and 4)
Netlify (Abe):
- Forms → enable form detection.
- Project configuration → Notifications → Form submission notifications → email "contact", "group-request", "add-ons-at-visit", "booking-extras" and "restorative-request" submissions to YourRNShary@gmail.com.

Mailchimp (Shary does this in her own account):
- Audience fields: add two text fields with the merge tags `SOURCE` and `OPTIN`.
- Turn off reCAPTCHA on her signup form, or background sign-ups will fail.
- Decide on double opt-in. If it's on, people must confirm by email before her automations reach them.
- Automations (need a paid plan such as Essentials):
  - When someone joins with `SOURCE` = `booking`, send one email with the booking link (https://booking.hydreight.com/widget-business/an92x) and the add-ons page (https://www.avidaluna.com/add-ons).
  - Send the complimentary "Wellness Notes" only to contacts whose `SOURCE` starts with `join`.
  - Send newsletters only to `OPTIN` = `yes`.
- Known limit: Mailchimp's public form doesn't update people already on the list, so a returning client won't trigger the booking automation again.

## Rotating keys
| Key | Where to rotate | Then |
|---|---|---|
| `SANITY_API_READ_TOKEN` | sanity.io/manage → API → Tokens (create new, delete old) | Update in Netlify, redeploy |
| `SANITY_REVALIDATE_SECRET` | Make a new random string | Update both the Sanity webhook and Netlify, redeploy |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys → Roll key | Update in Netlify, redeploy |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Webhooks → endpoint → Roll secret | Update in Netlify, redeploy |
| `HYDREIGHT_HOOK_SECRET` | Make a new random string | Update in Netlify and in the (future) Make.com scenario |

Generate a random secret: `openssl rand -hex 32`. Secrets live only in Netlify env vars, never in the repo.

## Future: Hydreight booking automation (stub only)
`POST /api/hooks/hydreight-booking` exists, requires header `x-hook-secret: $HYDREIGHT_HOOK_SECRET`, and returns `501 Not Implemented`.

Intended design (not in scope now): a Make.com scenario reads Hydreight's booking-confirmation email and posts

```json
{ "email": "client@example.com", "firstName": "Ana", "appointmentDate": "2026-11-20" }
```

It would mark the client as booked in Mailchimp, which triggers the add-on offer email. The site has no Mailchimp API key, so that step needs Shary to connect Mailchimp in Make.com herself. No health data is ever sent. First check that Hydreight's booking email includes the client's email.

## Code map
| Path | What |
|---|---|
| `src/app/` | Pages and API routes |
| `src/components/` | Header, footer, cards, forms, add-on picker |
| `src/lib/content.ts` | All content reads (Sanity with fallback) |
| `src/lib/packages.ts` | Package split, travel fee, enhancement prices and filtering (shared by pages, forms and llms.txt) |
| `studio/scripts/update-packages-pricing.ts` | One-off, dry-run-first Sanity update for the November 2026 pricing (see `CHECKLIST.md`) |
| `studio/scripts/update-restorative-copy.ts` | One-off, dry-run-first Sanity update of six FAQ/page texts for restorative booking (see `CHECKLIST.md`) |
| `src/lib/restorative.ts` | Restorative choices, pricing (`quoteRestorative`), date rules and booking reference, shared by the form and the checkout API |
| `src/lib/constants.ts` | `CONTACT_EMAIL`, `HYDREIGHT_BOOKING_URL`, phone, legal name, Mailchimp signup form values |
| `src/lib/validation.ts` | Form schemas (no health fields) |
| `src/lib/mailchimp-signup.ts` | Browser helper that adds someone to Shary's list (EMAIL, FNAME, LNAME, SOURCE, OPTIN only) |
| `public/__forms.html` | Netlify Forms definitions. Field names must match the React forms exactly |
| `src/lib/payments/` | Payment interface + Stripe |
| `content/fallback.ts` | Fallback content = the approved copy |
| `studio/` | Sanity Studio (schemas, desk menu, compliance warnings, seed) |
| `tests/` | Playwright tests, a local Stripe mock, and in-browser mocks of Mailchimp and Netlify Forms |
| `scripts/` | QR codes, seed builder, screenshots |

## Running checks
```bash
npm run typecheck && npm run lint && npm run build
npm run test:unit                                                # pricing and date rules (Node's test runner)
PW_CHROMIUM_PATH=<path to chromium, optional> npm run test:e2e   # builds twice (with and without mock Stripe keys); no real accounts needed
```
The tests cover booking (including Mailchimp failing or timing out), what is sent to Mailchimp and Netlify Forms, checkout price integrity, cancel/restore, redirects (301), banned health words on every page, a health-field audit of every form, axe accessibility, and keyboard-only booking.

## What needs a developer
- Layout, design or new page types (e.g. town pages for the Local Growth Package).
- Adding or renaming old-URL redirects (`next.config.ts`).
- Changing processors, Mailchimp fields or form fields (a Netlify form field must be changed in both the component and `public/__forms.html`).
- Building the Hydreight automation.
- Upgrading dependencies (versions are pinned on purpose).

Shary can do everything else in Sanity: see `/docs/how-to-edit.md`.
