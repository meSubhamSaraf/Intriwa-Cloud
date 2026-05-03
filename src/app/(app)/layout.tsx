"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { createBrowserConnector } from "@/lib/connectors/supabase-browser";
import { Zap, LogOut } from "lucide-react";

function MechanicHeader() {
  async function signOut() {
    const supabase = createBrowserConnector();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }
  return (
    <header className="h-12 bg-brand-navy-800 flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-brand-navy-600 flex items-center justify-center">
          <Zap className="w-3.5 h-3.5 text-brand-coral-400" />
        </div>
        <span className="text-sm font-semibold text-white tracking-tight">Intriwa</span>
        <span className="text-[11px] text-brand-navy-300 font-medium">Mechanic Portal</span>
      </div>
      <button onClick={signOut} className="flex items-center gap-1.5 text-[11px] text-brand-navy-300 hover:text-white transition-colors">
        <LogOut className="w-3.5 h-3.5" /> Sign out
      </button>
    </header>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [isMechanic, setIsMechanic] = useState(false);
  const [roleChecked, setRoleChecked] = useState(false);

  useEffect(() => {
    const supabase = createBrowserConnector();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsMechanic(user?.user_metadata?.role === "MECHANIC");
      setRoleChecked(true);
    });
  }, []);

  if (!roleChecked) {
    return (
      <div className="flex h-screen bg-slate-50 items-center justify-center">
        <div className="w-5 h-5 border-2 border-brand-navy-300 border-t-brand-navy-700 rounded-full animate-spin" />
      </div>
    );
  }

  if (isMechanic) {
    return (
      <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
        <MechanicHeader />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <div className="hidden md:flex h-full shrink-0">
        <Sidebar
          expanded={sidebarExpanded}
          onToggle={() => setSidebarExpanded((e) => !e)}
        />
      </div>
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-auto pb-16 md:pb-0">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
