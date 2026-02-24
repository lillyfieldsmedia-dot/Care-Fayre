import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FileText, ExternalLink, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const ratingColors: Record<string, string> = {
  Outstanding: "bg-purple-600 text-white",
  Good: "bg-green-600 text-white",
  "Requires improvement": "bg-orange-500 text-white",
  Inadequate: "bg-red-600 text-white",
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB");
}

interface CQCLiveInfoProps {
  locationId: string | null;
  providerId: string | null;
}

type CQCData = {
  overallRating: string | null;
  reportDate: string | null;
  reportUri: string | null;
};

export function CQCLiveInfo({ locationId, providerId }: CQCLiveInfoProps) {
  const [data, setData] = useState<CQCData | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!locationId && !providerId) {
      setLoading(false);
      return;
    }

    supabase.functions
      .invoke("cqc-lookup", {
        body: { locationId: locationId || undefined, providerId: !locationId ? providerId : undefined },
      })
      .then(({ data: res, error: err }) => {
        if (err || !res || res.error) {
          setError(true);
        } else {
          setData(res as CQCData);
        }
        setLoading(false);
      });
  }, [locationId, providerId]);

  if (loading) {
    return <div className="mt-4 text-sm text-muted-foreground">Loading CQC data…</div>;
  }

  if (!locationId && !providerId) return null;

  if (error || !data) {
    return (
      <div className="mt-6 rounded-lg border border-border bg-muted/50 p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">CQC status unavailable</span>
        </div>
      </div>
    );
  }

  const ratingLabel = data.overallRating ?? "Not Rated";
  const badgeClass = ratingColors[ratingLabel] ?? "bg-muted text-muted-foreground";

  return (
    <div className="mt-6 rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-foreground">CQC Rating:</span>
        <span className={cn("inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold", badgeClass)}>
          {ratingLabel}
        </span>
      </div>

      {data.reportDate && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="h-4 w-4" />
          <span>Last inspected: {formatDate(data.reportDate)}</span>
        </div>
      )}

      {data.reportUri && (
        <a
          href={data.reportUri}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          View full CQC inspection report
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}

      <p className="text-xs text-muted-foreground/70">Source: Care Quality Commission</p>
    </div>
  );
}
