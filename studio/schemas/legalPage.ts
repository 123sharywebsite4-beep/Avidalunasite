import { defineArrayMember, defineField, defineType } from "sanity";

/** Links can go to another site, an email, a phone number, or a page on this site (e.g. /privacy). */
const LINK_PATTERN = /^(https?:\/\/|mailto:|tel:|\/)/;

export const legalPage = defineType({
  name: "legalPage",
  title: "Legal page",
  type: "document",
  description: "The Terms of use or Privacy notice page.",
  fields: [
    defineField({ name: "page", title: "Page", type: "string", readOnly: true, hidden: true }),
    defineField({
      name: "title",
      title: "Page heading",
      type: "string",
      validation: (rule) => rule.required().error("Please add a heading.").max(80),
    }),
    defineField({
      name: "lastUpdated",
      title: "Last updated",
      type: "date",
      description: "Optional. Shown under the heading, e.g. after a lawyer reviews the page.",
    }),
    defineField({
      name: "showDraftNote",
      title: "Show the “Draft, needs review by a lawyer” note",
      type: "boolean",
      description: "Turn this off once a lawyer has reviewed the page.",
      initialValue: true,
    }),
    defineField({
      name: "body",
      title: "Page text",
      type: "array",
      description: "Use “Heading” for section titles. To link a word, select it and click the link button.",
      of: [
        defineArrayMember({
          type: "block",
          styles: [
            { title: "Paragraph", value: "normal" },
            { title: "Heading", value: "h2" },
            { title: "Small heading", value: "h3" },
          ],
          lists: [
            { title: "Bullet list", value: "bullet" },
            { title: "Numbered list", value: "number" },
          ],
          marks: {
            decorators: [{ title: "Bold", value: "strong" }],
            annotations: [
              {
                name: "link",
                type: "object",
                title: "Link",
                fields: [
                  defineField({
                    name: "href",
                    title: "Link to",
                    type: "string",
                    description: "A web address (https://…), an email (mailto:you@example.com) or a page on this site (/privacy).",
                    validation: (rule) =>
                      rule
                        .required()
                        .custom((value) =>
                          !value || LINK_PATTERN.test(value)
                            ? true
                            : "Start with https://, mailto:, tel: or / (for a page on this site).",
                        ),
                  }),
                ],
              },
            ],
          },
        }),
      ],
      validation: (rule) => rule.required().error("Please add the page text."),
    }),
  ],
  preview: { select: { title: "title", subtitle: "lastUpdated" } },
});
