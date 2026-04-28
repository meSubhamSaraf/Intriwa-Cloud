import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-md bg-slate-200", className)} />
  );
}

export function SkeletonRow({ cols = 5 }: { cols?: number }) {
  const widths = ["w-32", "w-24", "w-20", "w-28", "w-16", "w-20"];
  return (
    <tr className="border-b border-slate-100">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-3 py-3">
          <Skeleton className={`h-4 ${widths[i % widths.length]}`} />
          {i === 0 && <Skeleton className="h-3 w-20 mt-1.5" />}
        </td>
      ))}
    </tr>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-11 h-11 rounded-full" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-5 w-12 rounded-full" />
        <Skeleton className="h-5 w-10 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonPage() {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-8 w-28 rounded-md" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 w-64 rounded-md" />
        <Skeleton className="h-8 w-36 rounded-md" />
      </div>
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-3 py-2.5">
          <div className="flex gap-8">
            {[48, 32, 24, 32, 20, 28, 16].map((w, i) => (
              <Skeleton key={i} className={`h-3 w-${w}`} />
            ))}
          </div>
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonRow key={i} cols={7} />
        ))}
      </div>
    </div>
  );
}
