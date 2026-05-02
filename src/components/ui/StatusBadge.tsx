import { cn } from "@/lib/utils";

type StatusConfig = {
  label: string;
  className: string;
};

const statusMap: Record<string, StatusConfig> = {
  // Service request statuses (DB enum — normalised to lowercase)
  open:               { label: "Open",              className: "text-blue-700 bg-blue-50 border-blue-200" },
  waiting_parts:      { label: "Waiting Parts",     className: "text-amber-700 bg-amber-50 border-amber-200" },
  ready:              { label: "Ready",             className: "text-green-700 bg-green-50 border-green-200" },
  closed:             { label: "Closed",            className: "text-slate-600 bg-slate-100 border-slate-200" },
  scheduled:          { label: "Scheduled",         className: "text-blue-700 bg-blue-50 border-blue-200" },
  confirmed:          { label: "Confirmed",          className: "text-blue-700 bg-blue-50 border-blue-200" },
  assigned:           { label: "Assigned",           className: "text-blue-700 bg-blue-50 border-blue-200" },
  on_the_way:         { label: "On the way",         className: "text-amber-700 bg-amber-50 border-amber-200" },
  in_progress:        { label: "In progress",        className: "text-amber-700 bg-amber-50 border-amber-200" },
  awaiting_approval:  { label: "Awaiting approval",  className: "text-orange-700 bg-orange-50 border-orange-200" },
  completed:          { label: "Completed",          className: "text-green-700 bg-green-50 border-green-200" },
  invoiced:           { label: "Invoiced",           className: "text-green-700 bg-green-50 border-green-200" },
  paid:               { label: "Paid",               className: "text-green-700 bg-green-50 border-green-200" },
  cancelled:          { label: "Cancelled",          className: "text-slate-600 bg-slate-100 border-slate-200" },
  // Lead statuses
  new:                { label: "New",                className: "text-blue-700 bg-blue-50 border-blue-200" },
  contacted:          { label: "Contacted",          className: "text-amber-700 bg-amber-50 border-amber-200" },
  qualified:          { label: "Qualified",          className: "text-violet-700 bg-violet-50 border-violet-200" },
  booked:             { label: "Booked",             className: "text-green-700 bg-green-50 border-green-200" },
  lost:               { label: "Lost",               className: "text-red-700 bg-red-50 border-red-200" },
  on_hold:            { label: "On hold",            className: "text-slate-600 bg-slate-100 border-slate-200" },
  // Follow-up types
  pending:            { label: "Pending",            className: "text-amber-700 bg-amber-50 border-amber-200" },
  done:               { label: "Done",               className: "text-green-700 bg-green-50 border-green-200" },
  skipped:            { label: "Skipped",            className: "text-slate-600 bg-slate-100 border-slate-200" },
  rescheduled:        { label: "Rescheduled",        className: "text-blue-700 bg-blue-50 border-blue-200" },
  // Mechanic statuses
  free:               { label: "Free",               className: "text-green-700 bg-green-50 border-green-200" },
  on_job:             { label: "On job",             className: "text-red-700 bg-red-50 border-red-200" },
  off_duty:           { label: "Off duty",           className: "text-slate-600 bg-slate-100 border-slate-200" },
  break:              { label: "On break",           className: "text-slate-600 bg-slate-100 border-slate-200" },
  // Add-on approval
  approved:           { label: "Approved",           className: "text-green-700 bg-green-50 border-green-200" },
  declined:           { label: "Declined",           className: "text-red-700 bg-red-50 border-red-200" },
  // Invoice statuses
  draft:              { label: "Draft",              className: "text-slate-600 bg-slate-100 border-slate-200" },
  sent:               { label: "Sent",               className: "text-blue-700 bg-blue-50 border-blue-200" },
  overdue:            { label: "Overdue",            className: "text-red-700 bg-red-50 border-red-200" },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
  size?: "sm" | "md";
}

export function StatusBadge({ status, className, size = "sm" }: StatusBadgeProps) {
  const config = statusMap[status] ?? { label: status, className: "text-slate-600 bg-slate-100 border-slate-200" };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border font-medium whitespace-nowrap",
        size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-1 text-xs",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
