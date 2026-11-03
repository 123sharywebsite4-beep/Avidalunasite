import Link from "next/link";
import Image from "next/image";
import { formatDuration, formatPrice } from "@/lib/format";
import type { AddOn, Service } from "@/lib/types";
import { PhotoSlot } from "./Portrait";
import { ArrowRightIcon } from "./Icons";
import { Todo } from "./Todo";

export function ServiceCard({ service }: { service: Service }) {
  return (
    <article className="card flex flex-col p-5 md:p-6">
      <h3 className="text-xl">{service.name}</h3>
      <p className="mt-2 flex-1 text-muted">{service.description}</p>
      {service.showPrice && service.price ? (
        <p className="mt-3 font-semibold">{formatPrice(service.price)}</p>
      ) : null}
      {service.todo ? <Todo className="mt-3">{service.todo}</Todo> : null}
    </article>
  );
}

/** IV service card on /services: 4:3 photo, "good for" line, name, description, price (plus one upgrade), quiet link to booking. */
export function IvServiceCard({ service }: { service: Service }) {
  const headingId = `${service.id}-name`;
  return (
    <article className="iv-card" aria-labelledby={headingId}>
      <div className="iv-card-photo">
        {service.image ? (
          <Image
            src={service.image.src}
            alt={service.image.alt}
            fill
            sizes="(min-width: 1024px) 360px, (min-width: 640px) 45vw, 92vw"
            className="object-cover"
          />
        ) : (
          <div className="iv-card-photo-empty" aria-hidden>
            <svg viewBox="0 0 48 48" className="size-9">
              <circle cx="24" cy="24" r="12" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </div>
        )}
      </div>
      <div className="iv-card-body">
        {service.goodFor ? <p className="iv-card-goodfor">{service.goodFor}</p> : null}
        <h3 id={headingId}>{service.name}</h3>
        <p className="iv-card-text">{service.description}</p>
        <p className="iv-card-price">
          {service.showPrice && service.price !== null ? (
            formatPrice(service.price)
          ) : (
            <span>Pricing confirmed at booking</span>
          )}
        </p>
        {service.showPrice && service.optionName && service.optionPrice ? (
          <p className="iv-card-option">
            {service.optionName} · {formatPrice(service.optionPrice)}
          </p>
        ) : null}
        <Link href="/book" className="iv-card-link" aria-label={`Book this drip: ${service.name}`}>
          Book this drip <ArrowRightIcon className="size-4" />
        </Link>
      </div>
    </article>
  );
}

export function AddOnTeaserCard({ addOn }: { addOn: AddOn }) {
  const duration = formatDuration(addOn.durationMinutes);
  return (
    <article className="card flex flex-col overflow-hidden">
      <div className="p-3 pb-0">
        <PhotoSlot image={addOn.image} label={addOn.name} sizes="(min-width: 768px) 320px, 90vw" />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-xl">{addOn.name}</h3>
        <p className="mt-1 text-[0.9375rem] font-semibold">
          {[duration, formatPrice(addOn.price)].filter(Boolean).join(" · ")}
        </p>
        <p className="mt-2 flex-1">{addOn.description}</p>
        <Link href="/add-ons" className="btn btn-outline mt-4 self-start" aria-label={`Add ${addOn.name}`}>
          Add <ArrowRightIcon />
        </Link>
      </div>
    </article>
  );
}

/** Core service card. `primary` marks the lead service (mobile IV hydration) with a stronger treatment. */
export function OfferCard({
  title,
  text,
  href,
  linkLabel,
  eyebrow,
  primary = false,
}: {
  eyebrow?: string;
  title: string;
  text: string;
  href: string;
  linkLabel: string;
  primary?: boolean;
}) {
  return (
    <article
      className={`card flex flex-col p-6 md:p-8 ${primary ? "border-t-[3px] border-t-terracotta" : ""}`}
    >
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h3 className={`mt-2 ${primary ? "text-2xl md:text-[1.75rem]" : "text-xl md:text-2xl"}`}>{title}</h3>
      <p className="mt-3 flex-1 text-muted">{text}</p>
      <Link href={href} className="mt-5 inline-flex items-center gap-1.5 font-semibold text-olive">
        {linkLabel} <ArrowRightIcon />
      </Link>
    </article>
  );
}
