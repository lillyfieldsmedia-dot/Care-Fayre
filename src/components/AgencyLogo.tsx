import { cn } from "@/lib/utils";

const sizeMap = {
  sm: "h-8 w-24",
  md: "h-10 w-32",
  lg: "h-14 w-44",
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
      className={cn(sizeMap[size], "rounded object-contain shrink-0", className)}
    />
  );
}
