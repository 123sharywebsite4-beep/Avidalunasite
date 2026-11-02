import { defineField, defineType } from "sanity";
import { complianceCheck } from "../lib/compliance";
import { checkedText, orderField, photoField, visibleField } from "./fields";

export const addon = defineType({
  name: "addon",
  title: "Restorative service or product",
  type: "document",
  description:
    "Non-medical restorative services (red light, compression boots, aromatherapy) and take-home products (Vitamin Wellness Spray). Booked on their own or added to an appointment. Paid at the visit.",
  fields: [
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      validation: (rule) => [rule.required().error("Please add a name."), rule.max(60), rule.custom(complianceCheck).warning()],
    }),
    checkedText(
      "description",
      "Description",
      "One plain sentence about the experience, e.g. “A relaxing red light session while you rest.” No health promises.",
      2,
    ),
    defineField({
      name: "kind",
      title: "Kind",
      type: "string",
      options: {
        list: [
          { title: "Restorative service", value: "service" },
          { title: "Take-home product", value: "product" },
        ],
        layout: "radio",
      },
      initialValue: "service",
    }),
    defineField({
      name: "duration",
      title: "Duration (minutes)",
      type: "number",
      description:
        "Optional. Appointment time it adds, in minutes. Leave empty for aromatherapy (it runs alongside the service) and for products.",
      validation: (rule) => rule.integer().min(1).max(240),
    }),
    defineField({
      name: "price",
      title: "Standalone price (US dollars)",
      type: "number",
      description: "Booked on its own (or, for a product, bought on its own).",
      validation: (rule) => rule.required().error("Please add a price.").min(1).max(1000).precision(2),
    }),
    defineField({
      name: "enhancementPrice",
      title: "Enhancement price (US dollars)",
      type: "number",
      description:
        "The lower price when added to an existing appointment or package (for a product: with a service or package). Leave empty to use the standalone price.",
      validation: (rule) => rule.min(1).max(1000).precision(2),
    }),
    photoField,
    orderField,
    visibleField,
  ],
  orderings: [{ title: "Order", name: "order", by: [{ field: "order", direction: "asc" }] }],
  preview: {
    select: { title: "name", price: "price", enhancementPrice: "enhancementPrice", media: "image" },
    prepare: ({ title, price, enhancementPrice, media }) => ({
      title,
      subtitle: price ? `$${price}${enhancementPrice ? ` · enhancement $${enhancementPrice}` : ""}` : "No price",
      media,
    }),
  },
});
