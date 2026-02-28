import { cn } from "@/lib/utils";

const sizeMap = {
  sm: "h-8 w-8",
  md: "h-12 w-12",
  lg: "h-20 w-20",
};

interface AgencyLogoProps {
  logoUrl: string | null | undefined;
  agencyName: string;
  size: "sm" | "md" | "lg";
  className?: string;
}

export function AgencyLogo({ logoUrl, agencyName, size, className }: AgencyLogoProps) {
  if (!logoUrl) return null;

  return (
    <img
      src={logoUrl}
      alt={`${agencyName} logo`}
      className={cn(sizeMap[size], "rounded-lg object-cover shrink-0", className)}
    />
  );
}
