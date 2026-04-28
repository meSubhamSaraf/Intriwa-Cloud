import Link from "next/link";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; href: string };
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className = "" }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}>
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-slate-400" />
      </div>
      <p className="text-sm font-semibold text-slate-600 mb-1">{title}</p>
      {description && (
        <p className="text-[12px] text-slate-400 max-w-xs leading-relaxed">{description}</p>
      )}
      {action && (
        <Link
          href={action.href}
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-brand-navy-800 text-white text-sm font-medium rounded-md hover:bg-brand-navy-700 transition-colors"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
