"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Zap, Phone, Mail } from "lucide-react";
import { createBrowserConnector } from "@/lib/connectors/supabase-browser";

// ── Helpers ───────────────────────────────────────────────────────

// Normalise to E.164 for India: strip leading 0, add +91
function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  return `+${digits}`;
}

// ── Email / password form ─────────────────────────────────────────

function EmailForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const supabase = createBrowserConnector();

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }

    // Ask the server which page this user should land on (mechanic vs staff).
    // requireAuth() in the route handler infers role from Mechanic record.
    try {
      const res = await fetch("/api/me/redirect");
      if (res.ok) {
        const { redirect, role } = await res.json();
        if (role === "MECHANIC") {
          // Persist role in JWT metadata so the middleware proxy can redirect
          // on subsequent visits without a DB lookup.
          await supabase.auth.updateUser({ data: { role: "MECHANIC" } });
        }
        router.push(redirect);
        router.refresh();
        return;
      }
    } catch {
      // Fall through to default redirect on network error
    }

    router.push(redirectTo);
    router.refresh();
  }

  async function handleForgotPassword() {
    if (!email) { setError("Enter your email address first, then click Forgot password."); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setLoading(false);
    if (error) setError(error.message);
    else setResetSent(true);
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">{error}</div>
      )}
      {resetSent && (
        <div className="px-3 py-2.5 rounded-lg bg-green-50 border border-green-200 text-xs text-green-700">
          Password reset link sent — check your inbox.
        </div>
      )}

      <form onSubmit={handleSignIn} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Work email</label>
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@intriwa.in" required autoComplete="email"
            className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-navy-400 transition-colors"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-slate-600">Password</label>
            <button type="button" onClick={handleForgotPassword} disabled={loading}
              className="text-[11px] text-brand-navy-600 hover:underline disabled:opacity-50">
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"} value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password" required autoComplete="current-password"
              className="w-full h-10 px-3 pr-10 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-navy-400 transition-colors"
            />
            <button type="button" onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading}
          className="w-full h-10 flex items-center justify-center gap-2 bg-brand-navy-800 text-white text-sm font-semibold rounded-lg hover:bg-brand-navy-700 transition-colors disabled:opacity-60 mt-2">
          {loading ? (
            <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Signing in…</>
          ) : "Sign in"}
        </button>
      </form>
    </div>
  );
}

// ── Phone / OTP form ──────────────────────────────────────────────

function PhoneForm() {
  const router = useRouter();
  const [phone, setPhone]     = useState("");
  const [otp, setOtp]         = useState("");
  const [step, setStep]       = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [e164, setE164]       = useState("");

  const supabase = createBrowserConnector();

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const formatted = toE164(phone);
    const { error } = await supabase.auth.signInWithOtp({ phone: formatted });
    setLoading(false);
    if (error) {
      console.error("[OTP send error]", error);
      // Surface actionable messages for common Supabase config issues
      if (error.message?.toLowerCase().includes("load failed") ||
          error.message?.toLowerCase().includes("phone_provider_disabled") ||
          error.message?.toLowerCase().includes("provider is disabled")) {
        setError("Phone login is not enabled yet. Ask the admin to enable the Phone provider in Supabase → Authentication → Providers → Phone.");
      } else if (error.message?.toLowerCase().includes("invalid")) {
        setError("Invalid phone number format. Enter a 10-digit Indian mobile number.");
      } else {
        setError(error.message);
      }
      return;
    }
    setE164(formatted);
    setStep("otp");
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { data, error } = await supabase.auth.verifyOtp({
      phone: e164,
      token: otp.trim(),
      type: "sms",
    });
    if (error) { setError(error.message); setLoading(false); return; }

    // Tag this user as MECHANIC in their metadata so the proxy can redirect
    // them correctly on subsequent visits — no Supabase dashboard needed.
    if (data.user) {
      await supabase.auth.updateUser({ data: { role: "MECHANIC" } });
    }

    setLoading(false);
    router.push("/mechanic-portal");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">{error}</div>
      )}

      {step === "phone" ? (
        <form onSubmit={sendOtp} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Mobile number</label>
            <div className="flex gap-2">
              <div className="h-10 px-3 flex items-center border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-500 shrink-0">
                +91
              </div>
              <input
                type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="98765 43210" required maxLength={10}
                autoComplete="tel"
                className="flex-1 h-10 px-3 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-navy-400 transition-colors tabular-nums"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">We&apos;ll send a 6-digit OTP to this number.</p>
          </div>
          <button type="submit" disabled={loading || phone.replace(/\D/g, "").length < 10}
            className="w-full h-10 flex items-center justify-center gap-2 bg-brand-navy-800 text-white text-sm font-semibold rounded-lg hover:bg-brand-navy-700 transition-colors disabled:opacity-60">
            {loading ? (
              <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Sending…</>
            ) : "Send OTP"}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyOtp} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Enter OTP sent to {e164}
            </label>
            <input
              type="text" inputMode="numeric" value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456" required maxLength={6}
              autoFocus
              className="w-full h-12 px-4 text-xl text-center tracking-widest font-bold border border-slate-200 rounded-lg bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-navy-400 transition-colors tabular-nums"
            />
          </div>
          <button type="submit" disabled={loading || otp.length < 6}
            className="w-full h-10 flex items-center justify-center gap-2 bg-brand-navy-800 text-white text-sm font-semibold rounded-lg hover:bg-brand-navy-700 transition-colors disabled:opacity-60">
            {loading ? (
              <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Verifying…</>
            ) : "Verify & Sign in"}
          </button>
          <button type="button" onClick={() => { setStep("phone"); setOtp(""); setError(null); }}
            className="w-full text-[11px] text-slate-400 hover:text-slate-600 transition-colors">
            Wrong number? Go back
          </button>
        </form>
      )}
    </div>
  );
}

// ── Login page ────────────────────────────────────────────────────

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/dashboard";
  const [tab, setTab] = useState<"email" | "phone">("email");

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
      <h1 className="text-base font-semibold text-slate-800 mb-1">Sign in</h1>
      <p className="text-[12px] text-slate-400 mb-5">Intriwa Cloud Garage operations.</p>

      {/* Tab toggle */}
      <div className="flex rounded-lg border border-slate-200 overflow-hidden mb-6 text-xs font-medium">
        <button
          onClick={() => setTab("email")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 transition-colors ${tab === "email" ? "bg-brand-navy-800 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
        >
          <Mail className="w-3.5 h-3.5" /> Email
        </button>
        <button
          onClick={() => setTab("phone")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 transition-colors ${tab === "phone" ? "bg-brand-navy-800 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
        >
          <Phone className="w-3.5 h-3.5" /> Phone (OTP)
        </button>
      </div>

      {tab === "email" ? (
        <EmailForm redirectTo={redirectTo} />
      ) : (
        <PhoneForm />
      )}

      <div className="mt-6 pt-5 border-t border-slate-100 text-center">
        <p className="text-[11px] text-slate-400">
          {tab === "phone"
            ? "Requires an SMS provider (Twilio / MSG91) — contact admin to configure."
            : "Having trouble? Contact your administrator."}
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-brand-navy-800 flex items-center justify-center">
              <Zap className="w-5 h-5 text-brand-coral-400" />
            </div>
            <span className="text-xl font-bold text-brand-navy-800 tracking-tight">Intriwa</span>
          </div>
          <p className="text-sm text-slate-500">Cloud Garage — Ops Cockpit</p>
        </div>

        <Suspense fallback={
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center text-sm text-slate-400">Loading…</div>
        }>
          <LoginForm />
        </Suspense>

        <p className="text-center text-[10px] text-slate-400 mt-6">
          © 2026 Intriwa Cloud Garage · Internal tool
        </p>
      </div>
    </div>
  );
}
