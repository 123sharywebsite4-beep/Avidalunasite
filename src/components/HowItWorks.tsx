import Link from "next/link";
import { Todo } from "./Todo";

const steps = [
  {
    label: "Request",
    title: "Request an appointment",
    text: "Tap Book and leave your name and email. You get your booking link right away, then pick your services and a time on our secure, HIPAA-compliant booking page.",
  },
  {
    label: "Assessment",
    title: "Health screening and assessment",
    text: "You complete a confidential health screening and pay for your IV on our secure, HIPAA-compliant booking page when you book. Before your IV starts, Shary reviews it with you and checks that IV hydration is a good fit.",
  },
  {
    label: "Visit",
    title: "Your nurse comes to you",
    text: "Shary arrives at your home, office or event in the Lakewood Ranch area and stays with you for the whole visit. Pay for any add-ons at your visit or online.",
  },
];

export function HowItWorks({ compact = false }: { compact?: boolean }) {
  return (
    <div>
      <ol className={`grid gap-8 ${compact ? "md:grid-cols-3" : "md:grid-cols-3 md:gap-10"}`}>
        {steps.map((s, i) => (
          <li key={s.title} className="border-t-[3px] border-terracotta pt-5">
            <p aria-hidden className="eyebrow">
              {String(i + 1).padStart(2, "0")}
            </p>
            <h3 className="mt-1 text-xl">
              <span className="sr-only">Step {i + 1}: </span>
              {s.label}
            </h3>
            <p className="mt-2 text-muted">{s.text}</p>
          </li>
        ))}
      </ol>
      <Todo className="mt-5 max-w-2xl">
        Shary to confirm the assessment step wording: what the booking screening covers and what she checks in person before
        starting an IV.
      </Todo>
      {compact ? null : (
        <p className="mt-5 text-muted">
          Optional <Link href="/add-ons">restorative enhancements</Link>, like red light, compression boots or
          aromatherapy, can be added after you book. Pay for them at your visit.
        </p>
      )}
    </div>
  );
}
