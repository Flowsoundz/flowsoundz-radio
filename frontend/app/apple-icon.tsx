import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at 24% 18%, rgba(0,229,255,0.8), transparent 20%), linear-gradient(135deg, #111827 0%, #0b1020 56%, #050816 100%)",
          color: "#f8fafc",
          borderRadius: "42px",
          fontSize: 68,
          fontWeight: 700,
          fontFamily: "sans-serif",
          letterSpacing: "-0.06em",
          boxShadow: "inset 0 0 30px rgba(139,92,246,0.18)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "78%",
            height: "78%",
            borderRadius: "30px",
            border: "1px solid rgba(248,250,252,0.12)",
            background: "rgba(5,8,22,0.18)",
          }}
        >
          FS
        </div>
      </div>
    ),
    size,
  );
}
