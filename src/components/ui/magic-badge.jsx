import { cn } from "@/lib/utils";

export default function MagicBadge({ title, className, ...props }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/90 backdrop-blur-sm",
        "hover:border-white/20 hover:bg-white/10 transition-colors",
        className
      )}
      {...props}
    >
      {title}
    </span>
  );
}
