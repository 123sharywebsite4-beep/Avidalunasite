import { defineCliConfig } from "sanity/cli";

export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID || "p388w82e",
    dataset: process.env.SANITY_STUDIO_DATASET || "production",
  },
  // Hosting choice is decided at Checkpoint 1 (avidaluna.sanity.studio or /studio on the site).
  studioHost: "avidaluna",
  deployment: {
    // Deployed Studio at https://avidaluna.sanity.studio
    appId: "mmj55cnv4me6t1bb3z9pw0vp",
  },
});
