import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { JsonLd } from "@/components/JsonLd";
import { StickyBookBar } from "@/components/StickyBookBar";
import { BRAND_NAME, SITE_URL } from "@/lib/constants";
import { getSiteSettings } from "@/lib/content";
import { allowIndexing } from "@/lib/env";
import { localBusinessSchema } from "@/lib/schema";
import "./globals.css";
import "./site.css";

// Bundled variable font: no external font requests at build time or in the browser.
const manrope = localFont({
  src: "../../public/fonts/manrope-latin-variable.woff2",
  variable: "--font-manrope",
  weight: "200 800",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Mobile IV Therapy in Lakewood Ranch & Sarasota | Avida Luna",
    template: `%s | ${BRAND_NAME}`,
  },
  description:
    "Nurse-led mobile IV therapy at your home, office or event in Lakewood Ranch, Sarasota and Bradenton. IV drips from $99 with Shary Gonzalez, RN, BSN.",
  applicationName: BRAND_NAME,
  robots: allowIndexing ? undefined : { index: false, follow: false },
  formatDetection: { telephone: false },
  verification: {
    google: "vwtIJq8N2vjqKJF7b7GItLi6DWeKJQJU1j1DrXnGsNA",
  },
};

export const viewport: Viewport = {
  themeColor: "#F7F3EE",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const settings = await getSiteSettings();
  return (
    <html lang="en" className={`${manrope.variable} antialiased`}>
      <body className="flex min-h-dvh flex-col">
        <Header
          phoneTel={settings.phoneTel}
          phoneDisplay={settings.phoneDisplay}
        />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer settings={settings} />
        <StickyBookBar />
        <JsonLd data={localBusinessSchema(settings)} />
      </body>
    </html>
  );
}
