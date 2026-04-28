"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  UserPlus,
  Users,
  Wrench,
  UserCog,
  Building2,
  Settings,
  LogOut,
  ChevronRight,
  Car,
  Route,
  Clock,
  Receipt,
  BarChart3,
  Smartphone,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: UserPlus },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/vehicles", label: "Vehicles", icon: Car },
  { href: "/services", label: "Services", icon: Wrench },
  { href: "/mechanics", label: "Mechanics", icon: UserCog },
  { href: "/societies", label: "Societies", icon: Building2 },
  { href: "/followups", label: "Follow-ups", icon: Clock },
  { href: "/invoices", label: "Invoices", icon: Receipt },
  { href: "/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/dispatch", label: "Dispatch", icon: Route },
  { href: "/field", label: "Field View", icon: Smartphone },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

interface SidebarProps {
  expanded: boolean;
  onToggle: () => void;
}

export function Sidebar({ expanded, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) =>
    pathname === href || (pathname.startsWith(href + "/") && href !== "/");

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-brand-navy-800 text-brand-navy-100 transition-all duration-200 ease-in-out shrink-0",
        expanded ? "w-56" : "w-14"
      )}
    >
      {/* Logo + toggle */}
      <div className="flex items-center h-14 px-3 border-b border-brand-navy-700 shrink-0">
        <button
          onClick={onToggle}
          className="flex items-center gap-2.5 w-full min-w-0 hover:text-white transition-colors"
          aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          <div className="shrink-0 w-8 h-8 bg-brand-coral-400 rounded flex items-center justify-center">
            <Car className="w-4 h-4 text-white" />
          </div>
          {expanded && (
            <span className="font-semibold text-white text-sm truncate leading-tight">
              Intriwa CRM
            </span>
          )}
          <ChevronRight
            className={cn(
              "w-3.5 h-3.5 text-brand-navy-400 ml-auto shrink-0 transition-transform duration-200",
              expanded && "rotate-180"
            )}
          />
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-2">
        <ul className="space-y-0.5 px-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <li key={href}>
                {expanded ? (
                  <Link
                    href={href}
                    className={cn(
                      "flex items-center gap-2.5 px-2 py-2 rounded text-sm font-medium transition-colors",
                      active
                        ? "bg-brand-navy-700 text-white"
                        : "text-brand-navy-300 hover:bg-brand-navy-700 hover:text-white"
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{label}</span>
                  </Link>
                ) : (
                  <Tooltip>
                    <TooltipTrigger
                      onClick={() => router.push(href)}
                      className={cn(
                        "flex items-center justify-center w-10 h-10 rounded transition-colors",
                        active
                          ? "bg-brand-navy-700 text-white"
                          : "text-brand-navy-300 hover:bg-brand-navy-700 hover:text-white"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8}>
                      {label}
                    </TooltipContent>
                  </Tooltip>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom: settings + user */}
      <div className="border-t border-brand-navy-700 py-2 px-2 space-y-0.5 shrink-0">
        {expanded ? (
          <>
            <Link
              href="/settings"
              className={cn(
                "flex items-center gap-2.5 px-2 py-2 rounded text-sm font-medium transition-colors",
                isActive("/settings")
                  ? "bg-brand-navy-700 text-white"
                  : "text-brand-navy-300 hover:bg-brand-navy-700 hover:text-white"
              )}
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span>Settings</span>
            </Link>
            <button
              onClick={() => router.push("/login")}
              className="flex items-center gap-2.5 px-2 py-2 rounded text-brand-navy-300 hover:bg-brand-navy-700 hover:text-white cursor-pointer transition-colors w-full text-left"
            >
              <div className="w-6 h-6 rounded-full bg-brand-coral-400 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-semibold text-white">RM</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">
                  Rohan M.
                </p>
                <p className="text-[10px] text-brand-navy-400 truncate">
                  Ops Manager
                </p>
              </div>
              <LogOut className="w-3.5 h-3.5 shrink-0" />
            </button>
          </>
        ) : (
          <>
            <Tooltip>
              <TooltipTrigger
                onClick={() => router.push("/settings")}
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded transition-colors",
                  isActive("/settings")
                    ? "bg-brand-navy-700 text-white"
                    : "text-brand-navy-300 hover:bg-brand-navy-700 hover:text-white"
                )}
              >
                <Settings className="w-4 h-4" />
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                Settings
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                onClick={() => router.push("/login")}
                className="flex items-center justify-center w-10 h-10 rounded text-brand-navy-300 hover:bg-brand-navy-700 hover:text-white transition-colors cursor-pointer"
              >
                <div className="w-6 h-6 rounded-full bg-brand-coral-400 flex items-center justify-center">
                  <span className="text-[10px] font-semibold text-white">
                    RM
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                Rohan M. · Sign out
              </TooltipContent>
            </Tooltip>
          </>
        )}
      </div>
    </aside>
  );
}
