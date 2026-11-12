// Booking-flow copy for /book/restorative. Kept in code on purpose (not in Sanity): it changes with
// whether online payment is on, and it has to match what the form actually does.

export const RESTORATIVE_HEADING = "Book a restorative visit";

export function restorativeIntro(paymentsOn: boolean): string {
  return `Red light, compression boots and aromatherapy at your home or office. No IV and no health screening. Choose your package or service, pick a date and time, and ${
    paymentsOn ? "pay securely online" : "pay at your visit"
  }. Shary confirms your time by text or email.`;
}
