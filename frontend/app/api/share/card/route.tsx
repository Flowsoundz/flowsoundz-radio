import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

const EQ_HEIGHTS = [30, 55, 80, 65, 90, 70, 45, 85, 60, 75, 50, 88, 62, 78, 42];

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const title = searchParams.get("title") ?? "Now Playing";
  const artist = searchParams.get("artist") ?? "FlowSoundz Radio";
  const vibe = searchParams.get("vibe") ?? "";
  const coverUrl = searchParams.get("cover") ?? "";

  let coverData: string | null = null;
  if (coverUrl) {
    try {
      const res = await fetch(coverUrl.startsWith("http") ? coverUrl : `${origin}${coverUrl}`);
      if (res.ok) {
        const buf = await res.arrayBuffer();
        const b64 = Buffer.from(buf).toString("base64");
        const mime = res.headers.get("content-type") ?? "image/jpeg";
        coverData = `data:${mime};base64,${b64}`;
      }
    } catch {
      // fall through to placeholder
    }
  }

  let logoData: string | null = null;
  try {
    const res = await fetch(`${origin}/brand/FSRLogo.png`);
    if (res.ok) {
      const buf = await res.arrayBuffer();
      logoData = `data:image/png;base64,${Buffer.from(buf).toString("base64")}`;
    }
  } catch {
    // no logo
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: 1080,
          height: 1080,
          background: "linear-gradient(160deg, #07111f 0%, #050816 55%, #0a0520 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Glow blobs */}
        <div style={{ position: "absolute", top: -120, left: -120, width: 500, height: 500, borderRadius: "50%", background: "rgba(0,229,255,0.07)", display: "flex" }} />
        <div style={{ position: "absolute", bottom: -100, right: -80, width: 400, height: 400, borderRadius: "50%", background: "rgba(255,45,166,0.06)", display: "flex" }} />

        {/* Top bar */}
        <div style={{ position: "absolute", top: 52, left: 60, right: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#FF2DA6", boxShadow: "0 0 12px #FF2DA6" }} />
            <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: "0.22em", color: "rgba(248,250,252,0.9)", textTransform: "uppercase" }}>Live Radio</span>
          </div>
          {logoData && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoData} alt="" width={140} height={38} style={{ objectFit: "contain", opacity: 0.85 }} />
          )}
        </div>

        {/* Album art */}
        <div style={{
          width: 380,
          height: 380,
          borderRadius: 28,
          overflow: "hidden",
          border: "2px solid rgba(0,229,255,0.18)",
          boxShadow: "0 0 60px rgba(0,229,255,0.12), 0 0 120px rgba(255,45,166,0.06)",
          background: "linear-gradient(135deg,#0B1020,#1a1035)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 40,
        }}>
          {coverData ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverData} alt="" width={380} height={380} style={{ objectFit: "cover" }} />
          ) : (
            <span style={{ fontSize: 120, color: "rgba(0,229,255,0.3)" }}>♪</span>
          )}
        </div>

        {/* EQ bars */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 7, height: 52, marginBottom: 28 }}>
          {EQ_HEIGHTS.map((h, i) => (
            <div
              key={i}
              style={{
                width: 8,
                height: h * 0.52,
                borderRadius: 4,
                background: i % 2 === 0
                  ? "linear-gradient(180deg,#00E5FF,#7C4DFF)"
                  : "linear-gradient(180deg,#FF2DA6,#7C4DFF)",
                opacity: 0.85,
              }}
            />
          ))}
        </div>

        {/* Song info */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, paddingLeft: 60, paddingRight: 60, textAlign: "center" }}>
          <span style={{ fontSize: 52, fontWeight: 800, color: "#F8FAFC", lineHeight: 1.1, letterSpacing: "-0.01em", maxWidth: 860 }}>
            {title.length > 40 ? `${title.slice(0, 38)}…` : title}
          </span>
          <span style={{ fontSize: 32, fontWeight: 500, color: "#00E5FF", letterSpacing: "0.03em" }}>
            {artist.length > 40 ? `${artist.slice(0, 38)}…` : artist}
          </span>
          {vibe && (
            <span style={{ fontSize: 18, fontWeight: 600, color: "rgba(139,92,246,0.9)", letterSpacing: "0.18em", textTransform: "uppercase", marginTop: 4 }}>
              {vibe}
            </span>
          )}
        </div>

        {/* Bottom bar */}
        <div style={{ position: "absolute", bottom: 52, left: 60, right: 60, display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
          <div style={{ height: 1, flex: 1, background: "linear-gradient(90deg,transparent,rgba(0,229,255,0.2))" }} />
          <span style={{ fontSize: 20, fontWeight: 600, color: "rgba(203,213,225,0.55)", letterSpacing: "0.06em" }}>flowsoundzradio.com</span>
          <div style={{ height: 1, flex: 1, background: "linear-gradient(90deg,rgba(0,229,255,0.2),transparent)" }} />
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1080,
    },
  );
}
