"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { type RestorativeDraft, readRestorativeDraft, RestorativeRequestForm } from "@/components/forms/RestorativeRequestForm";
import { safeSession, STORAGE } from "@/components/forms/submit";
import type { AddOn, WellnessPackage } from "@/lib/types";

type Props = {
  addOns: AddOn[];
  packages: WellnessPackage[];
  travelFee: number;
  paymentsEnabled: boolean;
};

/**
 * /book/restorative?package=<slug>: the form with that package already chosen. The query is read
 * in the browser so the page stays static; the server renders the same form with nothing chosen.
 */
export function RestorativeFromUrl(props: Props) {
  const slug = useSearchParams().get("package") ?? "";
  const initial = slug ? `package:${slug}` : undefined;
  return <RestorativeRequestForm key={initial ?? "none"} {...props} initial={initial} />;
}

/** /book/restorative/cancel: the form as it was before Stripe, from this tab's session storage. */
export function RestorativeCancelled(props: Props) {
  const [draft, setDraft] = useState<RestorativeDraft | null | undefined>(undefined);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage is only readable after mount
    setDraft(readRestorativeDraft());
  }, []);
  if (draft === undefined) {
    return <p className="card mx-auto max-w-2xl p-6 md:p-8">Loading your booking…</p>;
  }
  return <RestorativeRequestForm {...props} draft={draft} />;
}

/** After a confirmed payment, forget the saved booking. */
export function ClearRestorativeDraft() {
  useEffect(() => {
    safeSession()?.removeItem(STORAGE.restorativeDraft);
  }, []);
  return null;
}
