import { ImageResponse } from "next/og";
import { getStaticCatalog } from "@/lib/staticCatalog";

export const runtime = "edge";

const VIBE_COLORS: Record<string, string> = {
  hype: "#FF2DA6",
  chill: "#00E5FF",
  late_night: "#8B5CF6",
  emotional: "#f59e0b",
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const trackId = searchParams.get("id");

  const catalog = getStaticCatalog();
  const song = trackId ? catalog.find((s) => s.id === trackId) : null;

  const title = song?.title ?? "FlowSoundz Radio";
  const artist = song?.artist ?? "Live Now";
  const genre = song?.genre ?? "";
  const vibe = song?.vibe ?? "chill";
  const accentColor = VIBE_COLORS[vibe] ?? "#00E5FF";

  // Resolve a public absolute URL for the cover image
  const base = new URL(req.url).origin;
  let coverSrc = `${base}/brand/flowsoundz-fr-appicon-dark.png`;
  if (song?.cover_file) {
    const f = song.cover_file.replace(/\.(webp|png)$/, "");
    coverSrc = `${base}/covers/${f}.png`;
  }

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "1200px",
          height: "630px",
          background: "linear-gradient(135deg, #050816 0%, #0B1020 50%, #0d0a1e 100%)",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Glow blob */}
        <div
          style={{
            position: "absolute",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background: accentColor,
            opacity: 0.08,
            filter: "blur(120px)",
            top: "-100px",
            left: "-80px",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: "350px",
            height: "350px",
            borderRadius: "50%",
            background: "#8B5CF6",
            opacity: 0.06,
            filter: "blur(90px)",
            bottom: "-60px",
            right: "100px",
          }}
        />

        {/* Cover art */}
        <div
          style={{
            display: "flex",
            margin: "60px 0 60px 60px",
            width: "510px",
            height: "510px",
            borderRadius: "24px",
            overflow: "hidden",
            flexShrink: 0,
            boxShadow: `0 0 80px ${accentColor}40`,
            border: `1px solid ${accentColor}30`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverSrc}
            alt={title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>

        {/* Right text column */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "60px 60px 60px 48px",
            flex: 1,
            gap: "0px",
          }}
        >
          {/* Station badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "24px",
            }}
          >
            <div
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: "#FF2DA6",
              }}
            />
            <span
              style={{
                fontSize: "13px",
                fontWeight: 700,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "rgba(203,213,225,0.6)",
              }}
            >
              FlowSoundz Radio · Live
            </span>
          </div>

          {/* Track title */}
          <div
            style={{
              fontSize: title.length > 18 ? "48px" : "58px",
              fontWeight: 700,
              color: "#F8FAFC",
              lineHeight: 1.1,
              marginBottom: "16px",
              letterSpacing: "-0.02em",
            }}
          >
            {title}
          </div>

          {/* Artist */}
          <div
            style={{
              fontSize: "26px",
              fontWeight: 500,
              color: "rgba(203,213,225,0.7)",
              marginBottom: "32px",
            }}
          >
            {artist}
          </div>

          {/* Genre + vibe pills */}
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {genre ? (
              <div
                style={{
                  display: "flex",
                  padding: "8px 18px",
                  borderRadius: "100px",
                  border: `1px solid ${accentColor}40`,
                  background: `${accentColor}15`,
                  color: accentColor,
                  fontSize: "13px",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                {genre}
              </div>
            ) : null}
          </div>

          {/* CTA */}
          <div
            style={{
              marginTop: "auto",
              paddingTop: "40px",
              fontSize: "18px",
              fontWeight: 600,
              color: accentColor,
              letterSpacing: "0.04em",
            }}
          >
            flowsoundz.com/radio
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
