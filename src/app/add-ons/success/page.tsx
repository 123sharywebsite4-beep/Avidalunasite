import type { Metadata } from "next";
import Link from "next/link";
import { CheckIcon } from "@/components/Icons";
import { ClearSelection } from "@/components/ClearSelection";
import { formatPrice } from "@/lib/format";
import { getPaidSummary } from "@/lib/payments";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMetadata({
  title: "You're all set",
  description: "Your wellness add-ons are paid.",
  path: "/add-ons/success",
  noindex: true,
});

export default async function SuccessPage({
  searchParams,
}: PageProps<"/add-ons/success">) {
  const { session_id } = await searchParams;
  const id =
    typeof session_id === "string" &&
    /^cs_[A-Za-z0-9_]{10,200}$/.test(session_id)
      ? session_id
      : null;
  const summary = id ? await getPaidSummary(id) : null;

  if (!summary || !summary.paid || summary.kind === "restorative") {
    return (
      <section className="container-page max-w-2xl py-14">
        <div className="state-card card p-6 md:p-8">
          <h1 className="text-3xl">We couldn&apos;t confirm this payment.</h1>
          <p className="mt-3">
            If you were charged, you&apos;ll get a receipt by email from Stripe
            and Shary will see it too. Questions?{" "}
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
      <ClearSelection />
      <div className="state-card card p-6 md:p-8">
        <span className="grid size-12 place-items-center rounded-full bg-sage text-ink">
          <CheckIcon className="size-6" />
        </span>
        <h1 className="mt-4 text-3xl md:text-4xl">You&apos;re all set.</h1>
        <p className="mt-2">
          Shary will bring your add-ons to your appointment.
        </p>
        <ul className="mt-5 space-y-1 border-t border-olive/15 pt-4">
          {summary.items.map((item, i) => (
            <li key={i} className="flex justify-between gap-3">
              <span>
                {item.name} × {item.quantity}
              </span>
              <span>{formatPrice(item.amountCents / 100)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 flex justify-between border-t border-olive/15 pt-3 font-semibold">
          <span>Total paid</span>
          <span>{formatPrice(summary.totalCents / 100)}</span>
        </p>
        <Link href="/" className="btn btn-primary mt-6">
          Back to home
        </Link>
      </div>
    </section>
  );
}
