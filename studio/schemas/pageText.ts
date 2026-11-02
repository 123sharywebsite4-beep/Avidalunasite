import { defineArrayMember, defineField, defineType } from "sanity";
import { complianceCheck } from "../lib/compliance";

export const PAGES = [
  { id: "home", title: "Home" },
  { id: "services", title: "Services" },
  { id: "packages", title: "Packages" },
  { id: "addons", title: "Add-ons" },
  { id: "events", title: "Group events" },
  { id: "education", title: "Wellness Education" },
  { id: "about", title: "About" },
  { id: "faq", title: "FAQ" },
  { id: "contact", title: "Contact" },
  { id: "book", title: "Book" },
  { id: "join", title: "Event sign-up" },
] as const;

export const pageText = defineType({
  name: "pageText",
  title: "Page text",
  type: "document",
  description: "Headings and short intros for one page. Leave a box empty to use the default text.",
  fields: [
    defineField({ name: "page", title: "Page", type: "string", readOnly: true }),
    defineField({
      name: "heading",
      title: "Main heading",
      type: "string",
      validation: (rule) => rule.custom(complianceCheck).warning(),
    }),
    defineField({
      name: "intro",
      title: "Intro",
      type: "text",
      rows: 3,
      validation: (rule) => rule.custom(complianceCheck).warning(),
    }),
    defineField({
      name: "sections",
      title: "Sections",
      type: "array",
      description: "Each section of the page. Edit the heading and text; please don't change the section name.",
      of: [
        defineArrayMember({
          type: "object",
          fields: [
            defineField({ name: "key", title: "Section name", type: "string", readOnly: true }),
            defineField({
              name: "heading",
              title: "Heading",
              type: "string",
              validation: (rule) => rule.custom(complianceCheck).warning(),
            }),
            defineField({
              name: "text",
              title: "Text",
              type: "text",
              rows: 4,
              validation: (rule) => rule.custom(complianceCheck).warning(),
            }),
          ],
          preview: { select: { title: "key", subtitle: "heading" } },
        }),
      ],
      options: { sortable: false },
    }),
  ],
  preview: { select: { title: "page" } },
});
