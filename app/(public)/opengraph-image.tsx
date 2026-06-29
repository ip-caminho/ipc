import { ImageResponse } from "next/og";

// OG image compartilhada da área pública (WhatsApp é o canal principal da igreja).
export const alt = "Igreja Presbiteriana do Caminho — São Paulo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#0A0A0A",
          color: "#E8E4D8",
          padding: "72px 80px",
        }}
      >
        <div
          style={{
            fontSize: 22,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: "#8A8A8A",
          }}
        >
          Igreja Presbiteriana do Caminho · São Paulo
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontFamily: "Georgia, serif",
            fontSize: 64,
            lineHeight: 1.15,
            maxWidth: 920,
          }}
        >
          <span>Uma comunidade bíblica de discipulado,</span>
          <span>participando da missão de Deus neste mundo.</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 24 }}>
          <div
            style={{
              border: "2px solid #E8E4D8",
              padding: "6px 16px",
              fontFamily: "Georgia, serif",
              letterSpacing: 1,
            }}
          >
            ipc
          </div>
          <span style={{ color: "#8A8A8A" }}>Presbiteriana reformada · Westminster, 1647</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
