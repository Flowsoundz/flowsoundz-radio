"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";

type AuthProviderMap = Record<string, { id: string; name: string; type: string }>;

function SignInForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/";
  const error = params.get("error");
  const errorMessage =
    error === "OAuthSignin"
      ? "Sign-in failed. Try again."
      : error === "Verification"
        ? "This magic link is invalid or already used. Request a fresh link, then open it in the same browser you use for FlowSoundz Radio."
        : error === "OAuthAccountNotLinked"
          ? "That email already exists with another sign-in method. Use the same provider you used before, or sign in by email first."
        : error === "CallbackRouteError"
          ? "The sign-in callback failed. Request a new link and make sure it opens in the same browser session."
          : "";

  const [email, setEmail] = useState("");
  const [providers, setProviders] = useState<AuthProviderMap>({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState(errorMessage);
  const [providersReady, setProvidersReady] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/providers")
      .then((r) => r.json())
      .then((data) => {
        if (!data || typeof data !== "object") {
          setProvidersReady(false);
          return;
        }

        setProviders(data as AuthProviderMap);
        setProvidersReady(Object.keys(data).length > 0);
      })
      .catch(() => setProvidersReady(false));
  }, []);

  const googleEnabled = Boolean(providers.google);
  const emailEnabled = Boolean(providers.nodemailer);

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

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setErr("");
    try {
      await signIn("google", { callbackUrl: next });
      // On success, the browser redirects — component unmounts before this runs.
      // setGoogleLoading(false) is intentionally omitted to avoid a flash.
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Google sign-in failed.");
      setGoogleLoading(false);
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
        Continue with Google for the fastest sign-in, or use an email magic link as backup.
      </p>
      <p className="mt-2 text-xs leading-5 text-slate-500">
        Use the same browser for both requesting and opening the link. Opening it in Gmail&apos;s in-app browser can create a separate session that does not carry over to your main browser.
      </p>

      {providersReady === false && (
        <div className="mt-4 rounded-[1.1rem] border border-amber-400/20 bg-amber-400/[0.07] px-4 py-3 text-xs leading-5 text-amber-200">
          <span className="font-semibold">Auth providers unavailable.</span> Check your auth environment variables and database connection.
        </div>
      )}

      {err && (
        <div className="mt-4 rounded-[1.1rem] border border-red-400/20 bg-red-400/[0.07] px-4 py-3 text-xs text-red-300">
          {err}
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3">
        <button
          type="button"
          onClick={() => void handleGoogleSignIn()}
          disabled={!googleEnabled || googleLoading || providersReady === false}
          className="flex min-h-12 w-full items-center justify-center gap-3 rounded-full border border-white/12 bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 4 1.5l2.7-2.6C17 3.3 14.7 2.4 12 2.4 6.8 2.4 2.6 6.6 2.6 11.8S6.8 21.2 12 21.2c6.9 0 9.2-4.8 9.2-7.3 0-.5 0-.8-.1-1.1H12Z" />
            <path fill="#34A853" d="M2.6 11.8c0 1.7.4 3.3 1.3 4.7l3.2-2.5c-.2-.6-.3-1.4-.3-2.2s.1-1.5.3-2.2L3.9 7.1c-.9 1.4-1.3 3-1.3 4.7Z" />
            <path fill="#FBBC05" d="M12 21.2c2.7 0 5-.9 6.7-2.5l-3.3-2.6c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1L3.1 15.5c1.8 3.5 5.1 5.7 8.9 5.7Z" />
            <path fill="#4285F4" d="M18.7 18.7c1.9-1.8 2.5-4.4 2.5-6.9 0-.5 0-.8-.1-1.1H12v3.9h5.5c-.2 1-.8 2.5-2.1 3.5l3.3 2.6Z" />
          </svg>
          {googleLoading ? "Redirecting to Google…" : googleEnabled ? "Continue with Google" : "Google sign-in coming soon"}
        </button>

        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/8" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-[#0B1020] px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
              Or use email
            </span>
          </div>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3">
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={providersReady === false || !emailEnabled}
          className="w-full rounded-[1.1rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-white/20 disabled:opacity-40"
        />
        <button
          type="submit"
          disabled={loading || !email.trim() || providersReady === false || !emailEnabled}
          className="w-full rounded-full bg-[linear-gradient(135deg,#00e5ff_0%,#7c4dff_100%)] py-3 text-sm font-bold text-white shadow-[0_0_22px_rgba(0,229,255,0.28)] transition disabled:opacity-40 hover:shadow-[0_0_32px_rgba(0,229,255,0.45)]"
        >
          {loading ? "Sending…" : "Send magic link"}
        </button>
        </form>
      </div>

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
