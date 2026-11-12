import type { Metadata } from "next";
import Link from "next/link";
import { CheckIcon } from "@/components/Icons";
import { ClearRestorativeDraft } from "@/components/RestorativeBooking";
import { formatPrice } from "@/lib/format";
import { getPaidSummary } from "@/lib/payments";
import { formatPreferredTime } from "@/lib/restorative";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMetadata({
  title: "Payment received",
  description: "Your restorative visit is paid.",
  path: "/book/restorative/success",
  noindex: true,
});

export default async function RestorativeSuccessPage({ searchParams }: PageProps<"/book/restorative/success">) {
  const { session_id } = await searchParams;
  const id = typeof session_id === "string" && /^cs_[A-Za-z0-9_]{10,200}$/.test(session_id) ? session_id : null;
  const summary = id ? await getPaidSummary(id) : null;

  if (!summary || !summary.paid || summary.kind !== "restorative") {
    return (
      <section className="container-page max-w-2xl py-14">
        <div className="state-card card p-6 md:p-8" data-testid="restorative-unconfirmed">
          <h1 className="text-3xl">We couldn&apos;t confirm this payment.</h1>
          <p className="mt-3">
            If you were charged, you&apos;ll get a receipt by email from Stripe and Shary will see it too. Questions?{" "}
            <Link href="/contact">Get in touch</Link>.
          </p>
          <Link href="/" className="btn btn-outline mt-6">
            Back to home
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="container-page max-w-2xl py-14">
      <ClearRestorativeDraft />
      <div className="state-card card p-6 md:p-8" data-testid="restorative-paid">
        <span className="grid size-12 place-items-center rounded-full bg-sage text-ink">
          <CheckIcon className="size-6" />
        </span>
        <h1 className="mt-4 text-3xl md:text-4xl">Payment received. Thank you!</h1>
        <p className="mt-2">
          Shary will confirm your time by text or email.
          {summary.preferredTime ? <> You asked for {formatPreferredTime(summary.preferredTime)}.</> : null}
        </p>
        {summary.reference ? (
          <p className="mt-2">
            Your booking reference is <strong data-testid="restorative-reference">{summary.reference}</strong>.
          </p>
        ) : null}
        <ul className="mt-5 space-y-1 border-t border-olive/15 pt-4">
          {summary.items.map((item, i) => (
            <li key={i} className="flex justify-between gap-3">
              <span>{item.name}</span>
              <span>{formatPrice(item.amountCents / 100)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 flex justify-between border-t border-olive/15 pt-3 font-semibold">
          <span>Total paid</span>
          <span>{formatPrice(summary.totalCents / 100)}</span>
        </p>
        {/* TODO (Shary): link the full cancellation and refund policy here once it's written. */}
        <p className="mt-4 text-[0.9375rem]">
          Your date and time are a request until Shary confirms. If she can&apos;t make it and no other time works for
          you, you&apos;ll get a full refund.
        </p>
        <Link href="/" className="btn btn-primary mt-6">
          Back to home
        </Link>
      </div>
    </section>
  );
}
