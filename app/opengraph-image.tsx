import { ImageResponse } from "next/og";

export const alt = "AE2V — Tous nos liens";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(<div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#f4f3ef", color: "#171717", fontFamily: "Arial", position: "relative" }}>
    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 42, background: "#d60106" }} />
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ fontSize: 104, fontWeight: 900, color: "#d60106", letterSpacing: -7 }}>AE2V</div>
      <div style={{ fontSize: 54, fontWeight: 800, marginTop: 24 }}>Tous nos liens</div>
      <div style={{ fontSize: 28, marginTop: 18, color: "#6f706b" }}>Toujours plus loin, ensemble.</div>
    </div>
  </div>, size);
}
