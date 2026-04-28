"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, UserPlus, Users, Wrench, MoreHorizontal, Car, Route, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const PRIMARY_NAV = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: UserPlus },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/services", label: "Services", icon: Wrench },
];

const MORE_NAV = [
  { href: "/vehicles", label: "Vehicles", icon: Car },
  { href: "/followups", label: "Follow-ups", icon: Clock },
  { href: "/dispatch", label: "Dispatch", icon: Route },
];

export function BottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (href: string) => pathname === href || (pathname.startsWith(href + "/") && href !== "/");
  const moreActive = MORE_NAV.some((n) => isActive(n.href));

  return (
    <>
      {moreOpen && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {moreOpen && (
        <div className="fixed bottom-16 right-2 z-40 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          {MORE_NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMoreOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 text-sm transition-colors",
                isActive(href)
                  ? "bg-brand-navy-50 text-brand-navy-700 font-medium"
                  : "text-slate-700 hover:bg-slate-50"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 flex md:hidden">
        {PRIMARY_NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium transition-colors",
                active ? "text-brand-navy-700" : "text-slate-400"
              )}
            >
              <Icon className={cn("w-5 h-5", active && "stroke-[2.5px]")} />
              {label}
            </Link>
          );
        })}
        <button
          onClick={() => setMoreOpen((o) => !o)}
          className={cn(
            "flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium transition-colors",
            moreActive || moreOpen ? "text-brand-navy-700" : "text-slate-400"
          )}
        >
          <MoreHorizontal className={cn("w-5 h-5", (moreActive || moreOpen) && "stroke-[2.5px]")} />
          More
        </button>
      </nav>
    </>
  );
}
