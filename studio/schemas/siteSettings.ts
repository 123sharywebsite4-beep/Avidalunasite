import { defineField, defineType } from "sanity";
import { complianceCheck } from "../lib/compliance";

const leadMagnetText = (name: string, title: string, description: string, rows?: number) =>
  defineField({
    name,
    title,
    type: rows ? "text" : "string",
    ...(rows ? { rows } : {}),
    description: `${description} Leave empty to use the default.`,
    validation: (rule) => [rule.max(rows ? 300 : 80), rule.custom(complianceCheck).warning()],
  });

export const siteSettings = defineType({
  name: "siteSettings",
  title: "Contact info",
  type: "document",
  fields: [
    defineField({
      name: "phone",
      title: "Phone",
      type: "string",
      description: "Shown in the footer and the call button, e.g. (941) 348-6972.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "email",
      title: "Email",
      type: "string",
      description: "Shown on the website. Change it here if you switch to a business address.",
      initialValue: "YourRNShary@gmail.com",
      validation: (rule) => rule.required().email(),
    }),
    defineField({
      name: "serviceArea",
      title: "Service area",
      type: "string",
      description: "e.g. “Lakewood Ranch, Sarasota and Bradenton, FL”.",
      validation: (rule) => rule.required(),
    }),
    defineField({ name: "instagram", title: "Instagram link", type: "url" }),
    defineField({ name: "facebook", title: "Facebook link", type: "url" }),
    defineField({
      name: "footerNote",
      title: "Footer note",
      type: "text",
      rows: 3,
      description: "The short note at the bottom of every page.",
    }),
    defineField({
      name: "travelFee",
      title: "Travel fee for restorative-only visits (US dollars)",
      type: "number",
      description: "Charged once per appointment when there's no IV or injection. IV appointments don't pay it.",
      initialValue: 8,
      validation: (rule) => rule.min(0).max(200).precision(2),
    }),
    defineField({
      name: "travelIncludedMinutes",
      title: "IV travel included (minutes of one-way drive)",
      type: "number",
      description: "For IV appointments, travel is included within this one-way drive from your service starting location.",
      initialValue: 35,
      validation: (rule) => rule.integer().min(0).max(240),
    }),
    defineField({
      name: "ivInfusionTime",
      title: "IV infusion time",
      type: "string",
      description: "How long the IV itself takes, e.g. “About 35–40 minutes”.",
      validation: (rule) => rule.max(60),
    }),
    defineField({
      name: "ivAppointmentTime",
      title: "Total IV appointment time",
      type: "text",
      rows: 2,
      description: "Shown separately from the infusion time. The full visit, including consultation, setup and any enhancements.",
      validation: (rule) => rule.max(200),
    }),
    defineField({
      name: "leadMagnet",
      title: "Free guide signup",
      type: "object",
      description:
        "The email signup block for your free guide, shown on the home page above the footer. Signups go to Mailchimp with SOURCE “lead-magnet”.",
      options: { collapsible: true, collapsed: false },
      fields: [
        defineField({
          name: "enabled",
          title: "Show on the website",
          type: "boolean",
          description: "Off until you turn it on. Turn off to hide the block without losing your text.",
          initialValue: false,
        }),
        leadMagnetText("heading", "Heading", "e.g. “Wellness Notes from a Nurse”."),
        leadMagnetText("description", "Description", "One or two sentences under the heading.", 3),
        leadMagnetText("buttonLabel", "Button text", "e.g. “Get your free copy”."),
        leadMagnetText("successMessage", "Thank-you message", "Shown after someone signs up.", 3),
      ],
    }),
  ],
  preview: { prepare: () => ({ title: "Contact info" }) },
});
