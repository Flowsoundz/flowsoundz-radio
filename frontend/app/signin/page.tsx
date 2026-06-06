"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";

function SignInForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/";
  const error = params.get("error");
  const errorMessage =
    error === "OAuthSignin"
      ? "Sign-in failed. Try again."
      : error === "Verification"
        ? "This magic link is invalid or already used. Request a fresh link, then open it in the same browser you use for FlowSoundz Radio."
        : error === "CallbackRouteError"
          ? "The sign-in callback failed. Request a new link and make sure it opens in the same browser session."
          : "";

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState(errorMessage);
  const [dbReady, setDbReady] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/providers")
      .then((r) => r.json())
      .then((data) => setDbReady(Boolean(data && typeof data === "object" && Object.keys(data).length > 0)))
      .catch(() => setDbReady(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setErr("");
    try {
      const res = await signIn("nodemailer", {
        email: email.trim(),
        redirect: false,
        callbackUrl: next,
      });
      if (res?.error) throw new Error(res.error);
      setSent(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-[2rem] border border-cyan-400/20 bg-[#0B1020]/90 p-8 text-center shadow-[0_0_60px_rgba(0,229,255,0.06)]">
        <div className="mb-4 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-cyan-400/10 ring-1 ring-cyan-400/25">
            <svg className="h-7 w-7 text-cyan-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
        </div>
        <h1 className="text-xl font-semibold text-white">Check your email</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          A sign-in link was sent to <span className="font-medium text-white">{email}</span>. Click the link to access your account.
        </p>
        <div className="mt-4 rounded-[1.1rem] border border-cyan-400/15 bg-cyan-400/[0.06] px-4 py-3 text-left text-xs leading-5 text-cyan-100">
          Open the magic link in the same browser you use for FlowSoundz Radio.
          If Gmail opens it inside the Gmail app or an in-app browser, use that app&apos;s
          <span className="font-semibold"> Open in browser</span> option first.
        </div>
        <p className="mt-4 text-xs text-slate-600">
          Didn&apos;t get it? Check spam or{" "}
          <button type="button" onClick={() => setSent(false)} className="text-cyan-400 hover:text-cyan-300">
            try again
          </button>.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[2rem] border border-white/8 bg-[#0B1020]/90 p-8 shadow-[0_0_60px_rgba(0,0,0,0.4)]">
      <h1 className="text-2xl font-semibold text-white">Sign in</h1>
      <p className="mt-2 text-sm text-slate-400">
        Get a magic link sent to your email — no password needed.
      </p>
      <p className="mt-2 text-xs leading-5 text-slate-500">
        Use the same browser for both requesting and opening the link. Opening it in Gmail&apos;s in-app browser can create a separate session that does not carry over to your main browser.
      </p>

      {dbReady === false && (
        <div className="mt-4 rounded-[1.1rem] border border-amber-400/20 bg-amber-400/[0.07] px-4 py-3 text-xs leading-5 text-amber-200">
          <span className="font-semibold">Database not connected.</span> Set{" "}
          <code className="rounded bg-white/5 px-1">DATABASE_URL</code> in your environment to enable sign-in.
        </div>
      )}

      {err && (
        <div className="mt-4 rounded-[1.1rem] border border-red-400/20 bg-red-400/[0.07] px-4 py-3 text-xs text-red-300">
          {err}
        </div>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 flex flex-col gap-3">
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={dbReady === false}
          className="w-full rounded-[1.1rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-white/20 disabled:opacity-40"
        />
        <button
          type="submit"
          disabled={loading || !email.trim() || dbReady === false}
          className="w-full rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] py-3 text-sm font-bold text-white shadow-[0_0_22px_rgba(0,229,255,0.28)] transition disabled:opacity-40 hover:shadow-[0_0_32px_rgba(0,229,255,0.45)]"
        >
          {loading ? "Sending…" : "Send magic link"}
        </button>
      </form>

      <p className="mt-5 text-center text-xs text-slate-600">
        By signing in you agree to our terms. We never share your email.
      </p>
    </div>
  );
}

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#050816] px-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/3 top-1/4 h-96 w-96 rounded-full bg-[#00e5ff]/5 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/3 h-96 w-96 rounded-full bg-[#7c4dff]/6 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <BrandLogo variant="full" />
        </div>

        <Suspense fallback={
          <div className="rounded-[2rem] border border-white/8 bg-[#0B1020]/90 p-8">
            <div className="h-8 w-32 animate-pulse rounded-full bg-white/5" />
          </div>
        }>
          <SignInForm />
        </Suspense>

        <p className="mt-6 text-center text-xs text-slate-700">
          <a href="/radio" className="text-slate-500 transition hover:text-slate-400">
            ← Back to radio
          </a>
        </p>
      </div>
    </div>
  );
}
