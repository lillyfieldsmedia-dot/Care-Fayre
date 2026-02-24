import { cn } from "@/lib/utils";

const ratingConfig: Record<string, { className: string; label: string }> = {
  Outstanding: { className: "bg-cqc-outstanding text-accent-foreground", label: "Outstanding" },
  Good: { className: "bg-cqc-good text-primary-foreground", label: "Good" },
  "Requires Improvement": { className: "bg-cqc-improvement text-primary-foreground", label: "Requires Improvement" },
  Inadequate: { className: "bg-cqc-inadequate text-destructive-foreground", label: "Inadequate" },
};

interface CQCRatingBadgeProps {
  rating: string | null;
  className?: string;
}

export function CQCRatingBadge({ rating, className }: CQCRatingBadgeProps) {
  if (!rating) return <span className="text-xs text-muted-foreground italic">Not rated</span>;
  const config = ratingConfig[rating];
  if (!config) return <span className="text-xs text-muted-foreground">{rating}</span>;

  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", config.className, className)}>
      {config.label}
    </span>
  );
}
