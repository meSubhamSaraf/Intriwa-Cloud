"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createBrowserConnector } from "@/lib/connectors/supabase-browser";
import {
  Zap, ArrowRight, Eye, EyeOff, Phone, Mail,
  ChevronDown, CheckCircle2, Clock, Camera, ShieldCheck, MessageSquare,
} from "lucide-react";

// ── Helpers ────────────────────────────────────────────────────────────────

function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  return `+${digits}`;
}

type PhoneStep = "phone" | "otp" | "register";
type LoginTab  = "phone" | "email";

// ── Phone / OTP / Register form ───────────────────────────────────────────

function PhoneLoginForm({ onFillPhone }: { onFillPhone?: string }) {
  const router  = useRouter();
  const [phone,    setPhone]    = useState(onFillPhone ?? "");
  const [otp,      setOtp]      = useState("");
  const [name,     setName]     = useState("");
  const [step,     setStep]     = useState<PhoneStep>("phone");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [e164,     setE164]     = useState("");
  const supabase = createBrowserConnector();

  useEffect(() => { if (onFillPhone) setPhone(onFillPhone); }, [onFillPhone]);

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    const formatted = toE164(phone);
    const { error } = await supabase.auth.signInWithOtp({ phone: formatted });
    setLoading(false);
    if (error) {
      if (error.message?.toLowerCase().includes("provider is disabled") ||
          error.message?.toLowerCase().includes("phone_provider_disabled"))
        setError("Phone OTP not configured. Enable Phone provider in Supabase → Auth → Providers.");
      else if (error.message?.toLowerCase().includes("invalid"))
        setError("Enter a valid 10-digit Indian mobile number.");
      else setError(error.message);
      return;
    }
    setE164(formatted); setStep("otp");
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ phone: e164, token: otp.trim(), type: "sms" });
    if (error) { setError(error.message); setLoading(false); return; }

    // Detect user type and route accordingly
    try {
      const customerRes = await fetch("/api/portal/me");
      if (customerRes.ok) {
        router.push("/portal/dashboard"); router.refresh(); return;
      }
      if (customerRes.status === 404) {
        // Not a customer — check if mechanic / staff
        const redirectRes = await fetch("/api/me/redirect");
        if (redirectRes.ok) {
          const { redirect, role } = await redirectRes.json();
          if (role === "MECHANIC") {
            await supabase.auth.updateUser({ data: { role: "MECHANIC" } });
          }
          router.push(redirect); router.refresh(); return;
        }
        // New user — offer registration
        setLoading(false); setStep("register"); return;
      }
    } catch { /* network — fall through */ }

    setLoading(false); router.push("/portal/dashboard"); router.refresh();
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    const res = await fetch("/api/portal/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Registration failed. Please try again.");
      setLoading(false); return;
    }
    router.push("/portal/dashboard"); router.refresh();
  }

  const inp = "w-full h-12 px-4 text-sm border border-slate-200 rounded-xl bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-coral-400 focus:border-transparent transition-all";
  const btn = "w-full h-12 flex items-center justify-center gap-2 bg-brand-coral-400 hover:bg-brand-coral-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-brand-coral-400/25 disabled:opacity-60 disabled:shadow-none";
  const spin = <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />;

  return (
    <div className="space-y-3">
      {error && <div className="px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">{error}</div>}

      {step === "phone" && (
        <form onSubmit={sendOtp} className="space-y-3">
          <div className="flex gap-2">
            <div className="h-12 px-3 flex items-center border border-slate-200 rounded-xl bg-slate-50 text-sm font-semibold text-slate-600 shrink-0">+91</div>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="98765 43210" required maxLength={10} autoComplete="tel"
              className={`${inp} flex-1`} />
          </div>
          <button type="submit" disabled={loading || phone.replace(/\D/g, "").length < 10} className={btn}>
            {loading ? <>{spin} Sending…</> : <>Continue <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>
      )}

      {step === "otp" && (
        <form onSubmit={verifyOtp} className="space-y-3">
          <p className="text-xs text-slate-500">OTP sent to <span className="font-semibold text-slate-700">{e164}</span></p>
          <input type="text" inputMode="numeric" value={otp}
            onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="· · · · · ·" required maxLength={6} autoFocus
            className="w-full h-14 px-4 text-3xl text-center tracking-[0.5em] font-bold border border-slate-200 rounded-xl bg-white text-slate-800 placeholder:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-coral-400 focus:border-transparent transition-all tabular-nums" />
          <button type="submit" disabled={loading || otp.length < 6} className={btn}>
            {loading ? <>{spin} Verifying…</> : "Verify & Continue"}
          </button>
          <button type="button" onClick={() => { setStep("phone"); setOtp(""); setError(null); }}
            className="w-full text-[11px] text-slate-400 hover:text-slate-600 transition-colors">
            Wrong number? Go back
          </button>
        </form>
      )}

      {step === "register" && (
        <form onSubmit={handleRegister} className="space-y-3">
          <div className="px-3 py-2.5 rounded-lg bg-green-50 border border-green-200 text-xs text-green-700">
            ✓ Phone verified. Let&apos;s set up your account.
          </div>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="Your full name" required autoFocus className={inp} />
          <button type="submit" disabled={loading || name.trim().length < 2} className={btn}>
            {loading ? <>{spin} Creating account…</> : "Create My Account"}
          </button>
        </form>
      )}
    </div>
  );
}

// ── Email / password form (staff only) ────────────────────────────────────

function EmailLoginForm({ prefill }: { prefill?: { email: string; password: string } }) {
  const router = useRouter();
  const [email,    setEmail]    = useState(prefill?.email ?? "");
  const [password, setPassword] = useState(prefill?.password ?? "");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const supabase = createBrowserConnector();

  useEffect(() => {
    if (prefill?.email)    setEmail(prefill.email);
    if (prefill?.password) setPassword(prefill.password);
  }, [prefill?.email, prefill?.password]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    try {
      const res = await fetch("/api/me/redirect");
      if (res.ok) { const { redirect } = await res.json(); router.push(redirect); router.refresh(); return; }
    } catch { /* fall through */ }
    router.push("/dashboard"); router.refresh();
  }

  return (
    <form onSubmit={handleSignIn} className="space-y-3">
      {error && <div className="px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">{error}</div>}
      <input type="email" value={email} onChange={e => setEmail(e.target.value)}
        placeholder="Email address" required autoComplete="email"
        className="w-full h-12 px-4 text-sm border border-slate-200 rounded-xl bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-navy-400 focus:border-transparent transition-all" />
      <div className="relative">
        <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
          placeholder="Password" required autoComplete="current-password"
          className="w-full h-12 px-4 pr-11 text-sm border border-slate-200 rounded-xl bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-navy-400 focus:border-transparent transition-all" />
        <button type="button" onClick={() => setShowPw(v => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
          {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      <button type="submit" disabled={loading}
        className="w-full h-12 flex items-center justify-center gap-2 bg-brand-navy-800 hover:bg-brand-navy-700 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-60">
        {loading ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Signing in…</> : "Sign In"}
      </button>
    </form>
  );
}

// ── Test credentials panel ────────────────────────────────────────────────

const DEMO_CREDS = [
  { role: "Customer", icon: "🚗", email: "customer.demo@intriwa.in", password: "Intriwa@2026" },
  { role: "Manager",  icon: "👤", email: "", password: "" },
  { role: "Mechanic", icon: "🔧", email: "", password: "" },
];

function TestCredentials({
  onFillEmail,
  setTab,
}: {
  onFillEmail: (e: string, p: string) => void;
  setTab: (t: LoginTab) => void;
}) {
  const [open, setOpen] = useState(false);
  const configured = DEMO_CREDS.filter(c => c.email);

  return (
    <div className="mt-4 border-t border-slate-100 pt-3">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between text-[11px] text-slate-400 hover:text-slate-600 transition-colors">
        <span className="flex items-center gap-1.5">
          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-semibold text-[10px] uppercase tracking-wide">Testing</span>
          Demo credentials
        </span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          {configured.length === 0 ? (
            <div className="px-3 py-3 rounded-lg bg-amber-50 border border-amber-100 text-[11px] text-amber-700 leading-relaxed">
              Add these to <span className="font-mono">.env.local</span> to enable demo login:<br />
              <span className="font-mono text-[10px] block mt-1 text-amber-600">
                NEXT_PUBLIC_DEMO_CUSTOMER_EMAIL<br />
                NEXT_PUBLIC_DEMO_CUSTOMER_PASS<br />
                NEXT_PUBLIC_DEMO_MANAGER_EMAIL<br />
                NEXT_PUBLIC_DEMO_MANAGER_PASS<br />
                NEXT_PUBLIC_DEMO_MECHANIC_EMAIL<br />
                NEXT_PUBLIC_DEMO_MECHANIC_PASS
              </span>
            </div>
          ) : (
            <>
              {configured.map(c => (
                <div key={c.role} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{c.icon}</span>
                    <div>
                      <p className="text-[11px] font-semibold text-slate-700">{c.role}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{c.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setTab("email"); onFillEmail(c.email, c.password); }}
                    className="text-[10px] font-semibold text-brand-coral-500 hover:underline shrink-0">
                    Fill →
                  </button>
                </div>
              ))}
              <p className="text-[10px] text-slate-400 text-center">Uses Login tab — no OTP needed</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Login card ─────────────────────────────────────────────────────────────

function LoginCard() {
  const [tab,        setTab]       = useState<LoginTab>("phone");
  const [fillPhone,  setFillPhone] = useState<string | undefined>();
  const [fillEmail,  setFillEmail] = useState<{ email: string; password: string } | undefined>();

  return (
    <div className="bg-white rounded-2xl shadow-2xl shadow-black/20 p-6 w-full">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-lg bg-brand-navy-900 flex items-center justify-center shrink-0">
          <Zap className="w-4 h-4 text-brand-coral-400" />
        </div>
        <div>
          <p className="text-sm font-bold text-brand-navy-900 leading-none">Intriwa</p>
          <p className="text-[11px] text-slate-400 leading-none mt-0.5">Cloud Garage</p>
        </div>
      </div>

      {/* Tab toggle */}
      <div className="flex rounded-xl border border-slate-200 overflow-hidden mb-5 text-xs font-semibold">
        <button onClick={() => setTab("phone")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 transition-colors ${tab === "phone" ? "bg-brand-navy-900 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}>
          <Phone className="w-3.5 h-3.5" /> Phone OTP
        </button>
        <button onClick={() => setTab("email")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 transition-colors ${tab === "email" ? "bg-brand-navy-900 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}>
          <Mail className="w-3.5 h-3.5" /> Login
        </button>
      </div>

      {tab === "phone" ? (
        <PhoneLoginForm onFillPhone={fillPhone} />
      ) : (
        <EmailLoginForm prefill={fillEmail} />
      )}

      <TestCredentials
        onFillEmail={(e, p) => setFillEmail({ email: e, password: p })}
        setTab={setTab}
      />
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function HomePage() {
  const router    = useRouter();
  const loginRef  = useRef<HTMLDivElement>(null);

  // Redirect already-authenticated users
  useEffect(() => {
    const supabase = createBrowserConnector();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const customerRes = await fetch("/api/portal/me");
      if (customerRes.ok) { router.push("/portal/dashboard"); return; }
      const redirectRes = await fetch("/api/me/redirect");
      if (redirectRes.ok) { const { redirect } = await redirectRes.json(); router.push(redirect); }
    });
  }, [router]);

  function scrollToLogin() {
    loginRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div className="min-h-screen bg-white">

      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-brand-navy-950/95 backdrop-blur border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-navy-800 flex items-center justify-center border border-white/10">
              <Zap className="w-3.5 h-3.5 text-brand-coral-400" />
            </div>
            <span className="text-base font-bold text-white tracking-tight">Intriwa</span>
          </div>
          <button onClick={scrollToLogin}
            className="h-8 px-4 rounded-full bg-brand-coral-400 hover:bg-brand-coral-500 text-white text-xs font-bold transition-all">
            Sign In →
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="min-h-screen bg-brand-navy-950 pt-14 flex items-center">
        <div className="max-w-6xl mx-auto px-4 py-16 grid lg:grid-cols-2 gap-12 items-center">

          {/* Left — copy */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-coral-400/15 border border-brand-coral-400/30 mb-6">
              <span className="w-2 h-2 rounded-full bg-brand-coral-400 animate-pulse" />
              <span className="text-xs font-semibold text-brand-coral-300 tracking-wide">Real-time Garage Tracking</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.05] mb-5">
              Your car<br />
              deserves<br />
              <span className="text-brand-coral-400">honesty.</span>
            </h1>

            <p className="text-lg text-brand-navy-300 leading-relaxed mb-8 max-w-md">
              Live job updates. Photo proof at every step. Transparent pricing.
              The garage experience you always deserved — finally here.
            </p>

            <div className="flex flex-wrap gap-4 mb-10">
              {["Live job tracking", "Photo evidence", "Zero surprise bills", "WhatsApp updates"].map(f => (
                <div key={f} className="flex items-center gap-1.5 text-sm text-brand-navy-300">
                  <CheckCircle2 className="w-4 h-4 text-brand-coral-400 shrink-0" />
                  {f}
                </div>
              ))}
            </div>

            <button onClick={scrollToLogin}
              className="inline-flex items-center gap-2 h-13 px-8 bg-brand-coral-400 hover:bg-brand-coral-500 text-white font-bold rounded-2xl text-base transition-all shadow-2xl shadow-brand-coral-400/40 hover:shadow-brand-coral-400/60 hover:-translate-y-0.5">
              Track My Car
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          {/* Right — login card */}
          <div ref={loginRef} className="w-full max-w-sm mx-auto lg:mx-0 lg:ml-auto">
            <LoginCard />
            <p className="text-center text-[11px] text-brand-navy-600 mt-4">
              New to Intriwa? Use your phone number — we&apos;ll create your account automatically.
            </p>
          </div>
        </div>
      </section>

      {/* ── PAIN POINTS ── */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-brand-coral-500 uppercase tracking-widest mb-3">Sound familiar?</p>
            <h2 className="text-3xl sm:text-4xl font-black text-brand-navy-900">
              The old way of getting<br />your car serviced is broken.
            </h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { emoji: "😤", title: "They ghost you after drop-off", body: "You hand over your keys and disappear into a void. Hours pass. You have no idea if anyone's even looked at your car yet." },
              { emoji: "💸", title: "Quotes that triple by pickup", body: "They said ₹1,500. You pay ₹5,200. No approval, no explanation. Just a bill shoved in your face and an expectation to pay." },
              { emoji: "⏰", title: "Ready by 5pm. Next day. Still waiting.", body: "They promise a time. They miss it. You rearrange meetings. Cancel plans. They apologise. And it happens again next time." },
            ].map(p => (
              <div key={p.title} className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-brand-coral-300">
                <div className="text-3xl mb-4">{p.emoji}</div>
                <h3 className="font-bold text-brand-navy-900 mb-2 text-lg">{p.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INTRIWA DIFFERENCE ── */}
      <section className="py-20 bg-brand-navy-900">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-brand-coral-400 uppercase tracking-widest mb-3">The Intriwa Promise</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              We built what mechanics<br />promised but never delivered.
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: <Clock className="w-5 h-5" />, title: "Live Job Tracking", body: "Know exactly where your service stands, minute by minute. No more calling to ask." },
              { icon: <Camera className="w-5 h-5" />, title: "Photo Evidence", body: "Your mechanic documents every step with photos. You see it before it&apos;s done." },
              { icon: <CheckCircle2 className="w-5 h-5" />, title: "You Approve First", body: "Found something extra? We tell you, show you, and wait for your go-ahead." },
              { icon: <MessageSquare className="w-5 h-5" />, title: "WhatsApp Updates", body: "Job started. Parts ordered. Car ready. Every update hits your WhatsApp in real time." },
            ].map(f => (
              <div key={f.title} className="bg-brand-navy-800 rounded-2xl p-6 border border-white/5">
                <div className="w-10 h-10 rounded-xl bg-brand-coral-400/15 border border-brand-coral-400/20 flex items-center justify-center text-brand-coral-400 mb-4">
                  {f.icon}
                </div>
                <h3 className="font-bold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-brand-navy-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: f.body }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-brand-coral-500 uppercase tracking-widest mb-3">Simple as 1-2-3</p>
            <h2 className="text-3xl sm:text-4xl font-black text-brand-navy-900">How it works</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Drop your car", body: "Bring your vehicle in. We register you instantly — no paperwork, no forms." },
              { step: "02", title: "Track in real time", body: "Watch your service progress live on your phone. Get WhatsApp updates automatically." },
              { step: "03", title: "Pick up with confidence", body: "See exactly what was done, what was charged, and why. Every rupee documented." },
            ].map(s => (
              <div key={s.step} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-brand-coral-400 text-white font-black text-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand-coral-400/30">
                  {s.step}
                </div>
                <h3 className="font-bold text-brand-navy-900 text-lg mb-2">{s.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST BAR ── */}
      <section className="py-12 bg-white border-y border-slate-100">
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { stat: "100%", label: "Transparent pricing" },
              { stat: "0", label: "Surprise bills" },
              { stat: "Live", label: "Job tracking" },
              { stat: "24/7", label: "WhatsApp updates" },
            ].map((t, i) => (
              <div key={t.label} className={`${i < 3 ? "sm:border-r border-slate-100" : ""}`}>
                <p className="text-2xl sm:text-3xl font-black text-brand-coral-400 mb-1">{t.stat}</p>
                <p className="text-xs text-slate-500 font-medium">{t.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-20 bg-gradient-to-br from-brand-coral-500 to-brand-coral-600">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <ShieldCheck className="w-12 h-12 text-white/80 mx-auto mb-4" />
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
            Ready to experience a garage<br />that actually respects you?
          </h2>
          <p className="text-white/80 mb-8">Enter your number. We&apos;ll have you set up in 30 seconds.</p>
          <button onClick={scrollToLogin}
            className="inline-flex items-center gap-2 h-13 px-8 bg-white text-brand-coral-500 font-bold rounded-2xl text-base transition-all hover:bg-white/90 shadow-2xl">
            Get Started Now
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-brand-navy-950 py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-brand-navy-800 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-brand-coral-400" />
            </div>
            <span className="text-sm font-bold text-white">Intriwa</span>
            <span className="text-xs text-brand-navy-500">Cloud Garage</span>
          </div>
          <p className="text-[11px] text-brand-navy-600">© 2026 Intriwa. Built for garages that give a damn.</p>
        </div>
      </footer>

    </div>
  );
}
