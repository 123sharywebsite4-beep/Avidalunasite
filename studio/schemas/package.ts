import { defineArrayMember, defineField, defineType } from "sanity";
import { complianceCheck } from "../lib/compliance";
import { orderField, visibleField } from "./fields";

// Wellness packages. One-time bookings only: no memberships, recurring billing or prepaid series.
// The website works out the split itself: the included IV / IM injection's price is paid on the
// secure booking page, and the rest of the package price is paid at the visit.
export const wellnessPackage = defineType({
  name: "package",
  title: "Package",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      validation: (rule) => [rule.required().error("Please add a name."), rule.max(60), rule.custom(complianceCheck).warning()],
    }),
    defineField({
      name: "slug",
      title: "Short name for the web address",
      type: "slug",
      description: "Click Generate. Used in the booking link, e.g. /book?package=luna-light. Avoid changing it once shared.",
      options: { source: "name", maxLength: 96 },
      validation: (rule) => rule.required().error("Please click Generate."),
    }),
    defineField({
      name: "type",
      title: "Type",
      type: "string",
      options: {
        list: [
          { title: "Restorative (no IV or injection; travel fee applies)", value: "restorative" },
          { title: "IV wellness", value: "iv" },
          { title: "Injection (B12) wellness", value: "injection" },
        ],
        layout: "radio",
      },
      validation: (rule) => rule.required().error("Please choose a type."),
    }),
    defineField({
      name: "includes",
      title: "Includes",
      type: "array",
      description:
        "The services and restorative items in this package. For IV packages, include the IV here, unless the client chooses between IVs (then use “IV choices” below).",
      of: [defineArrayMember({ type: "reference", to: [{ type: "service" }, { type: "addon" }] })],
      validation: (rule) => rule.required().min(1).unique(),
    }),
    defineField({
      name: "ivChoices",
      title: "IV choices (optional)",
      type: "array",
      description:
        "Only if the client picks one IV from a list, e.g. Energy IV or Athlete Recovery IV. They choose on the secure booking page, subject to medical approval; the website never asks.",
      hidden: ({ document }) => document?.type !== "iv",
      of: [
        defineArrayMember({
          type: "reference",
          to: [{ type: "service" }],
          options: { filter: 'category == "iv"' },
        }),
      ],
      validation: (rule) => rule.unique(),
    }),
    defineField({
      name: "price",
      title: "Package price (US dollars)",
      type: "number",
      description: "The full package price. For restorative packages, the travel fee is added on top.",
      validation: (rule) => rule.required().error("Please add a price.").min(1).max(2000).precision(2),
    }),
    defineField({
      name: "bookingOpen",
      title: "Booking open",
      type: "boolean",
      description: "Turn off to show “Booking opens soon” instead of the booking button.",
      initialValue: true,
    }),
    orderField,
    visibleField,
  ],
  orderings: [{ title: "Order", name: "order", by: [{ field: "order", direction: "asc" }] }],
  preview: {
    select: { title: "name", type: "type", price: "price", bookingOpen: "bookingOpen" },
    prepare: ({ title, type, price, bookingOpen }) => ({
      title,
      subtitle: [type, price ? `$${price}` : "No price", bookingOpen === false ? "booking closed" : null]
        .filter(Boolean)
        .join(" · "),
    }),
  },
});
