import Link from "next/link";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-black px-4 text-center text-white">
      {/* Ambient glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/3 top-1/4 h-80 w-80 rounded-full bg-[#00e5ff]/6 blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/3 h-80 w-80 rounded-full bg-[#7c4dff]/8 blur-[100px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Big 404 */}
        <p className="bg-[linear-gradient(135deg,#00e5ff,#7c4dff)] bg-clip-text font-headline text-[clamp(80px,20vw,160px)] font-black leading-none tracking-tight text-transparent">
          404
        </p>

        <div className="max-w-sm">
          <h1 className="text-xl font-semibold text-white">
            This track doesn&apos;t exist.
          </h1>
          <p className="mt-2 text-sm leading-7 text-white/45">
            The page you&apos;re looking for isn&apos;t here — but the station is
            still live.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/radio"
            className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] px-7 py-3 text-sm font-bold text-white shadow-[0_0_20px_rgba(0,229,255,0.3)] transition hover:shadow-[0_0_32px_rgba(0,229,255,0.5)]"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5,3 19,12 5,21" />
            </svg>
            Back to radio
          </Link>
          <Link
            href="/"
            className="inline-flex items-center rounded-full border border-white/15 px-7 py-3 text-sm font-semibold text-white transition hover:border-white/25 hover:bg-white/5"
          >
            Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
