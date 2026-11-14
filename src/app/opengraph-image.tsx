import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Brand social preview image with the real logo. Everything is centered so the
// logo and the start of the headline survive WhatsApp's center-square crop
// (the middle 630x630). The logo is drawn at its native 281x230 so it isn't upscaled.
export const alt = "Avida Luna Wellness: nurse-led mobile IV hydration in Lakewood Ranch, FL";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Read once at module scope; the route has no params, so it is prerendered at build time.
const logoData = await readFile(join(process.cwd(), "public/brand/logo.png"), "base64");
const logoSrc = `data:image/png;base64,${logoData}`;

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#F7F3EE",
          padding: "0 60px",
          color: "#3E4436",
        }}
      >
        <img src={logoSrc} width={281} height={230} alt="" />
        <div
          style={{
            display: "flex",
            marginTop: 24,
            maxWidth: 600,
            fontSize: 58,
            fontWeight: 700,
            color: "#3E4436",
            lineHeight: 1.08,
            textAlign: "center",
          }}
        >
          Experienced nursing care, brought to you.
        </div>
        {/* Split onto two lines so the whole sub-line also fits the center square. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginTop: 18,
            fontSize: 26,
            lineHeight: 1.3,
            color: "#576D52",
          }}
        >
          <div style={{ display: "flex" }}>Mobile IV therapy with Shary Gonzalez, RN, BSN</div>
          <div style={{ display: "flex" }}>Lakewood Ranch, FL</div>
        </div>
        <div style={{ display: "flex", marginTop: 26, height: 8, width: 160, background: "#C08A67", borderRadius: 4 }} />
      </div>
    ),
    size,
  );
}
