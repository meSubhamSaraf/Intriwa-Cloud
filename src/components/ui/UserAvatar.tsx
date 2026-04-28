import { cn } from "@/lib/utils";

// Deterministic color from name hash
function nameToColor(name: string): string {
  const colors = [
    "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500",
    "bg-teal-500", "bg-rose-500", "bg-indigo-500", "bg-amber-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

interface UserAvatarProps {
  name: string;
  size?: "xs" | "sm" | "md";
  className?: string;
}

export function UserAvatar({ name, size = "sm", className }: UserAvatarProps) {
  const sizeClass = {
    xs: "w-5 h-5 text-[10px]",
    sm: "w-7 h-7 text-xs",
    md: "w-9 h-9 text-sm",
  }[size];

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center text-white font-semibold shrink-0",
        nameToColor(name),
        sizeClass,
        className
      )}
      title={name}
    >
      {initials(name)}
    </div>
  );
}
