import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default function Icon() {
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
            "radial-gradient(circle at 22% 20%, rgba(0,229,255,0.9), transparent 20%), radial-gradient(circle at 78% 82%, rgba(255,45,166,0.45), transparent 24%), linear-gradient(135deg, #111827 0%, #0b1020 54%, #050816 100%)",
          color: "#f8fafc",
          borderRadius: "120px",
          fontSize: 170,
          fontWeight: 700,
          fontFamily: "sans-serif",
          letterSpacing: "-0.06em",
          boxShadow: "inset 0 0 80px rgba(139,92,246,0.22)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "78%",
            height: "78%",
            borderRadius: "96px",
            border: "2px solid rgba(248,250,252,0.12)",
            background: "rgba(5,8,22,0.22)",
            boxShadow: "0 0 28px rgba(0,229,255,0.12)",
          }}
        >
          FS
        </div>
      </div>
    ),
    size,
  );
}
