import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { LEGAL_PAGES, legalDefaults } from "../content/legal";
import { schemaTypes, SINGLETON_TYPES } from "./schemas";
import { structure } from "./structure";

// The first time Shary opens Terms or Privacy, it starts with the text the website shows today.
const legalText = legalDefaults("YourRNShary@gmail.com");
const legalTemplates = LEGAL_PAGES.map((p) => ({
  id: `legalPage-${p.id}`,
  title: p.title,
  schemaType: "legalPage",
  value: { page: p.id, showDraftNote: true, ...legalText[p.id] },
}));

export default defineConfig({
  name: "default",
  title: "Avida Luna",
  projectId: process.env.SANITY_STUDIO_PROJECT_ID || "p388w82e",
  dataset: process.env.SANITY_STUDIO_DATASET || "production",
  plugins: [structureTool({ structure })],
  schema: {
    types: schemaTypes,
    // Hide one-of-a-kind documents from the "Create new" menu. The legal-page templates
    // are only used by the "Legal pages" menu (see structure.ts).
    templates: (templates) => [
      ...templates.filter((t) => !SINGLETON_TYPES.has(t.schemaType)),
      ...legalTemplates,
    ],
  },
  document: {
    newDocumentOptions: (items) => items.filter((item) => !item.templateId.startsWith("legalPage-")),
    // Singletons can be edited and published, but not duplicated or deleted.
    actions: (actions, { schemaType }) =>
      SINGLETON_TYPES.has(schemaType)
        ? actions.filter((a) => a.action && ["publish", "discardChanges", "restore"].includes(a.action))
        : actions,
  },
});
