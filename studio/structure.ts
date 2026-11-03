import type { StructureResolver } from "sanity/structure";
import { LEGAL_PAGES } from "../content/legal";
import { PAGES } from "./schemas/pageText";

// Short, plain menu for Shary:
// Services · Packages · Restorative & add-ons · Events · Wellness articles · FAQ · Page text · Legal pages · Contact info · Testimonials
export const structure: StructureResolver = (S) =>
  S.list()
    .title("Avida Luna")
    .items([
      S.documentTypeListItem("service").title("Services"),
      S.documentTypeListItem("package").title("Packages"),
      S.documentTypeListItem("addon").title("Restorative & add-ons"),
      S.documentTypeListItem("event").title("Events"),
      S.documentTypeListItem("article").title("Wellness articles"),
      S.documentTypeListItem("faq").title("FAQ"),
      S.listItem()
        .title("Page text")
        .child(
          S.list()
            .title("Page text")
            .items(
              PAGES.map((p) =>
                S.listItem()
                  .title(p.title)
                  .id(`pageText-${p.id}`)
                  .child(S.document().schemaType("pageText").documentId(`pageText-${p.id}`).title(p.title)),
              ),
            ),
        ),
      S.listItem()
        .title("Legal pages")
        .child(
          S.list()
            .title("Legal pages")
            .items(
              LEGAL_PAGES.map((p) =>
                S.listItem()
                  .title(p.title)
                  .id(`legalPage-${p.id}`)
                  .child(
                    S.document()
                      .schemaType("legalPage")
                      .documentId(`legalPage-${p.id}`)
                      .initialValueTemplate(`legalPage-${p.id}`)
                      .title(p.title),
                  ),
              ),
            ),
        ),
      S.listItem()
        .title("Contact info")
        .id("siteSettings")
        .child(S.document().schemaType("siteSettings").documentId("siteSettings").title("Contact info")),
      S.documentTypeListItem("testimonial").title("Testimonials"),
    ]);
