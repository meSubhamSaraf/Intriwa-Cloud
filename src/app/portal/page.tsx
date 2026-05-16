"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createBrowserConnector } from "@/lib/connectors/supabase-browser";
import { Zap, ArrowRight, ChevronRight } from "lucide-react";

// ── Helpers ────────────────────────────────────────────────────────────────

function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  return `+${digits}`;
}

// ── Phone OTP Login Form ──────────────────────────────────────────────────

function PortalLoginForm({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp" | "not-found">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [e164, setE164] = useState("");

  const supabase = createBrowserConnector();

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const formatted = toE164(phone);
    const { error } = await supabase.auth.signInWithOtp({ phone: formatted });
    setLoading(false);
    if (error) {
      if (
        error.message?.toLowerCase().includes("load failed") ||
        error.message?.toLowerCase().includes("phone_provider_disabled") ||
        error.message?.toLowerCase().includes("provider is disabled")
      ) {
        setError("Phone login is not configured yet. Contact Intriwa support.");
      } else if (error.message?.toLowerCase().includes("invalid")) {
        setError("Invalid number. Please enter a 10-digit Indian mobile number.");
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
    const { error } = await supabase.auth.verifyOtp({
      phone: e164,
      token: otp.trim(),
      type: "sms",
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Check if this phone belongs to a registered customer
    try {
      const res = await fetch("/api/portal/me");
      if (res.ok) {
        setLoading(false);
        router.push("/portal/dashboard");
        router.refresh();
        return;
      } else if (res.status === 404) {
        setLoading(false);
        setStep("not-found");
        return;
      }
    } catch {
      // Network error — still allow through
    }

    setLoading(false);
    router.push("/portal/dashboard");
    router.refresh();
  }

  const inputBase =
    "w-full h-12 px-4 text-sm border rounded-xl bg-white/95 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-coral-400 focus:border-transparent transition-all";

  if (step === "not-found") {
    return (
      <div className="text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
          <span className="text-2xl">🔍</span>
        </div>
        <p className="text-sm font-semibold text-slate-800">Number not found</p>
        <p className="text-xs text-slate-500 leading-relaxed">
          We don&apos;t have this number on record yet. Come in for a service
          first — we&apos;ll register you right there.
        </p>
        <button
          onClick={() => {
            setStep("phone");
            setPhone("");
            setOtp("");
            setError(null);
          }}
          className="text-xs text-brand-coral-500 font-semibold hover:underline"
        >
          Try a different number
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
          {error}
        </div>
      )}

      {step === "phone" ? (
        <form onSubmit={sendOtp} className="space-y-3">
          <div className="flex gap-2">
            <div
              className={`h-12 px-3 flex items-center border border-slate-200 rounded-xl bg-white/95 text-sm font-medium text-slate-600 shrink-0 ${compact ? "" : ""}`}
            >
              +91
            </div>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="98765 43210"
              required
              maxLength={10}
              autoComplete="tel"
              className={`${inputBase} flex-1`}
            />
          </div>
          <button
            type="submit"
            disabled={loading || phone.replace(/\D/g, "").length < 10}
            className="w-full h-12 flex items-center justify-center gap-2 bg-brand-coral-400 hover:bg-brand-coral-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-brand-coral-400/30 disabled:opacity-60 disabled:shadow-none"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Sending OTP…
              </>
            ) : (
              <>
                Track My Car
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyOtp} className="space-y-3">
          <div>
            <p className="text-xs text-slate-500 mb-2">
              OTP sent to <span className="font-semibold text-slate-700">{e164}</span>
            </p>
            <input
              type="text"
              inputMode="numeric"
              value={otp}
              onChange={(e) =>
                setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="Enter 6-digit OTP"
              required
              maxLength={6}
              autoFocus
              className="w-full h-14 px-4 text-2xl text-center tracking-[0.4em] font-bold border border-slate-200 rounded-xl bg-white/95 text-slate-800 placeholder:text-slate-300 placeholder:text-base placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-brand-coral-400 focus:border-transparent transition-all tabular-nums"
            />
          </div>
          <button
            type="submit"
            disabled={loading || otp.length < 6}
            className="w-full h-12 flex items-center justify-center gap-2 bg-brand-coral-400 hover:bg-brand-coral-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-brand-coral-400/30 disabled:opacity-60 disabled:shadow-none"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Verifying…
              </>
            ) : (
              "Verify & Open Portal"
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep("phone");
              setOtp("");
              setError(null);
            }}
            className="w-full text-[11px] text-slate-400 hover:text-slate-600 transition-colors pt-1"
          >
            Wrong number? Go back
          </button>
        </form>
      )}
    </div>
  );
}

// ── Main landing page ──────────────────────────────────────────────────────

export default function PortalLandingPage() {
  const router = useRouter();
  const loginRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createBrowserConnector();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.phone) {
        router.push("/portal/dashboard");
      }
    });
  }, [router]);

  function scrollToLogin() {
    loginRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    const input = loginRef.current?.querySelector("input[type='tel']");
    if (input) (input as HTMLInputElement).focus();
  }

  return (
    <div className="min-h-screen bg-white">
      {/* ── SECTION 1: HERO ─────────────────────────────────────────── */}
      <section className="relative min-h-screen bg-brand-navy-900 flex flex-col overflow-hidden">
        {/* Background grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Radial glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-brand-coral-500/10 rounded-full blur-[100px] pointer-events-none" />

        {/* Top nav */}
        <nav className="relative z-10 flex items-center justify-between px-5 pt-5 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-coral-400 flex items-center justify-center shadow-lg shadow-brand-coral-400/40">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">
              Intriwa
            </span>
          </div>
          <button
            onClick={scrollToLogin}
            className="text-xs font-semibold text-brand-coral-400 border border-brand-coral-400/40 px-4 py-2 rounded-full hover:bg-brand-coral-400/10 transition-colors"
          >
            Sign In
          </button>
        </nav>

        {/* Hero content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center px-5 pb-10 max-w-lg mx-auto w-full">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 mb-8 w-fit">
            <span className="text-sm">🔧</span>
            <span className="text-xs font-semibold text-brand-coral-300 tracking-wide uppercase">
              Real-time Garage Tracking
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl font-black text-white leading-[1.05] tracking-tight mb-5">
            Your car
            <br />
            deserves{" "}
            <span className="text-brand-coral-400">honesty.</span>
          </h1>

          {/* Subtext */}
          <p className="text-slate-300 text-base leading-relaxed mb-10 max-w-sm">
            Live updates. Transparent pricing. No more guessing games. The
            garage experience you always deserved —{" "}
            <span className="text-white font-medium">finally.</span>
          </p>

          {/* Login card */}
          <div
            ref={loginRef}
            className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 shadow-2xl"
          >
            <p className="text-xs text-slate-300 mb-4 text-center">
              Already have a job in progress? Enter your number to track it
              live.
            </p>
            <PortalLoginForm />
          </div>
        </div>

        {/* Scroll hint */}
        <div className="relative z-10 flex flex-col items-center pb-8 gap-1.5 animate-bounce">
          <span className="text-[10px] text-slate-500 tracking-widest uppercase">
            Scroll
          </span>
          <div className="w-0.5 h-6 bg-gradient-to-b from-slate-500 to-transparent" />
        </div>
      </section>

      {/* ── SECTION 2: PAIN POINTS ──────────────────────────────────── */}
      <section className="bg-white py-20 px-5">
        <div className="max-w-lg mx-auto">
          <div className="mb-12 text-center">
            <span className="text-xs font-bold tracking-widest text-brand-coral-500 uppercase">
              The old way
            </span>
            <h2 className="text-3xl font-black text-brand-navy-900 mt-2 leading-tight">
              Sound familiar?
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                emoji: "😤",
                title: "They ghost you after drop-off",
                body: "You hand over your car and disappear into a void. Hours pass. You have no idea if they even looked at it yet.",
              },
              {
                emoji: "💸",
                title: "Quotes that triple by pickup",
                body: "They said ₹1,500. You pay ₹5,200. No explanation, no approval. Just a bill and an expectation.",
              },
              {
                emoji: "⏰",
                title: "Ready by 5pm. Next day. Still waiting.",
                body: "They promise a time. They miss it. You rearrange your day. They apologise. It happens again.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex gap-4 border-l-4 border-l-brand-coral-400"
              >
                <span className="text-3xl shrink-0 mt-0.5">{item.emoji}</span>
                <div>
                  <h3 className="font-bold text-brand-navy-900 mb-1.5 text-sm leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    {item.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 3: THE INTRIWA DIFFERENCE ──────────────────────── */}
      <section className="bg-brand-navy-800 py-20 px-5">
        <div className="max-w-lg mx-auto">
          <div className="mb-12 text-center">
            <span className="text-xs font-bold tracking-widest text-brand-coral-400 uppercase">
              The Intriwa way
            </span>
            <h2 className="text-3xl font-black text-white mt-2 leading-tight">
              We built what mechanics
              <br />
              promised but never delivered.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                icon: "📍",
                title: "Live Job Tracking",
                body: "Know exactly where your service stands, minute by minute. No more calling to ask.",
              },
              {
                icon: "📸",
                title: "Photo Evidence at Every Step",
                body: "Your mechanic documents everything with photos. You see it before it's done.",
              },
              {
                icon: "✅",
                title: "You Approve Before We Proceed",
                body: "Discovered something extra? We send you details and wait for your go-ahead. No surprises.",
              },
              {
                icon: "💬",
                title: "WhatsApp Updates in Real Time",
                body: "Job started. Parts needed. Car ready. You get a message the moment anything changes.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-brand-navy-700/60 border border-white/10 rounded-2xl p-5 hover:bg-brand-navy-700/80 transition-colors"
              >
                <div className="w-11 h-11 rounded-xl bg-brand-coral-400/15 flex items-center justify-center mb-4">
                  <span className="text-xl">{item.icon}</span>
                </div>
                <h3 className="font-bold text-white mb-2 text-sm leading-snug">
                  {item.title}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 4: TRUST BAR ────────────────────────────────────── */}
      <section className="bg-white border-y border-slate-100 py-14 px-5">
        <div className="max-w-lg mx-auto">
          <div className="grid grid-cols-2 gap-y-8 gap-x-6 sm:grid-cols-4 sm:divide-x sm:divide-slate-100 sm:gap-0">
            {[
              { value: "1,200+", label: "Car owners trust us" },
              { value: "₹ 0", label: "Hidden charges, ever" },
              { value: "94%", label: "On-time completion" },
              { value: "100%", label: "Billing transparency" },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className={`text-center ${i > 0 ? "sm:pl-6" : ""}`}
              >
                <div className="text-3xl font-black text-brand-navy-900 mb-1">
                  {stat.value}
                </div>
                <div className="text-xs text-slate-500 leading-snug">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 5: FINAL CTA ────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-brand-coral-400 to-brand-coral-500 py-20 px-5">
        <div className="max-w-sm mx-auto text-center">
          <h2 className="text-3xl font-black text-white leading-tight mb-3">
            Ready for a garage that respects you?
          </h2>
          <p className="text-white/80 text-sm mb-8 leading-relaxed">
            Join hundreds of car owners who never wonder what&apos;s happening
            to their car anymore.
          </p>

          <div className="bg-white/15 backdrop-blur-sm border border-white/30 rounded-2xl p-5">
            <PortalLoginForm />
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────── */}
      <footer className="bg-brand-navy-950 py-10 px-5">
        <div className="max-w-lg mx-auto flex flex-col items-center gap-3 text-center">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-coral-400 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-base font-bold text-white tracking-tight">
              Intriwa
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Cloud Garage — Where your car comes first.
          </p>
          <p className="text-[10px] text-slate-600">
            &copy; 2026 Intriwa Cloud Garage. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
