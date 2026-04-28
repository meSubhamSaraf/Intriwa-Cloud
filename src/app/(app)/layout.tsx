"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { BottomNav } from "@/components/layout/BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

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
