"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Zap } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("vikram@intriwa.in");
  const [password, setPassword] = useState("••••••••");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => router.push("/dashboard"), 800);
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo card */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-brand-navy-800 flex items-center justify-center">
              <Zap className="w-5 h-5 text-brand-coral-400" />
            </div>
            <span className="text-xl font-bold text-brand-navy-800 tracking-tight">Intriwa</span>
          </div>
          <p className="text-sm text-slate-500">Cloud Garage — Ops Cockpit</p>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <h1 className="text-base font-semibold text-slate-800 mb-1">Sign in to your account</h1>
          <p className="text-[12px] text-slate-400 mb-6">Bangalore operations team access only.</p>

          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Work email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@intriwa.in"
                required
                className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-navy-400 transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-600">Password</label>
                <button type="button" className="text-[11px] text-brand-navy-600 hover:underline">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  className="w-full h-10 px-3 pr-10 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-navy-400 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 flex items-center justify-center gap-2 bg-brand-navy-800 text-white text-sm font-semibold rounded-lg hover:bg-brand-navy-700 transition-colors disabled:opacity-60 mt-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400">
              Having trouble? Contact{" "}
              <span className="text-brand-navy-600">vikram@intriwa.in</span>
            </p>
          </div>
        </div>

        <p className="text-center text-[10px] text-slate-400 mt-6">
          © 2026 Intriwa Cloud Garage · Internal tool · v2.4.1
        </p>
      </div>
    </div>
  );
}
