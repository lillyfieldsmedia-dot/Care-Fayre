import { Badge } from "@/components/ui/badge";
import { Clock, MessageSquare, AlertTriangle } from "lucide-react";

export type TimesheetWithQuery = {
  id: string;
  week_starting: string;
  hours_worked: number;
  notes: string | null;
  status: string;
  approved_at: string | null;
  created_at: string;
  queried_at: string | null;
  query_note: string | null;
  query_response: string | null;
  adjusted_hours: number | null;
  suggested_hours: number | null;
  response_deadline: string | null;
  query_count: number;
};

export const tsQueryStatusColors: Record<string, string> = {
  submitted: "bg-muted text-muted-foreground",
  pending: "bg-muted text-muted-foreground",
  queried: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  resubmitted: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  approved: "bg-cqc-good text-primary-foreground",
  escalated: "bg-destructive text-destructive-foreground",
  disputed: "bg-destructive/20 text-destructive",
};

function DeadlineCountdown({ deadline }: { deadline: string }) {
  const deadlineDate = new Date(deadline);
  const now = new Date();
  const diffMs = deadlineDate.getTime() - now.getTime();

  if (diffMs <= 0) {
    return <span className="text-xs text-destructive font-medium">Deadline passed</span>;
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300 font-medium">
      <Clock className="h-3 w-3" />
      {hours}h {mins}m remaining
    </span>
  );
}

export function TimesheetQueryDetails({ ts }: { ts: TimesheetWithQuery }) {
  const hasQuery = ts.query_note || ts.queried_at;
  const hasResponse = ts.query_response;

  if (!hasQuery && ts.status !== "escalated") return null;

  return (
    <div className="mt-2 space-y-2 text-xs">
      {/* Customer query */}
      {hasQuery && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-2.5">
          <div className="flex items-center gap-1.5 font-medium text-amber-800 dark:text-amber-300 mb-1">
            <MessageSquare className="h-3 w-3" />
            Customer Query
          </div>
          <p className="text-foreground">{ts.query_note}</p>
          {ts.suggested_hours != null && ts.suggested_hours !== ts.hours_worked && (
            <p className="mt-1 text-muted-foreground">
              Suggested hours: <span className="font-medium text-foreground">{ts.suggested_hours}</span> (submitted: {ts.hours_worked})
            </p>
          )}
        </div>
      )}

      {/* Agency response */}
      {hasResponse && (
        <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-2.5">
          <div className="flex items-center gap-1.5 font-medium text-blue-800 dark:text-blue-300 mb-1">
            <MessageSquare className="h-3 w-3" />
            Agency Response
          </div>
          <p className="text-foreground">{ts.query_response}</p>
          {ts.adjusted_hours != null && ts.adjusted_hours !== ts.hours_worked && (
            <p className="mt-1 text-muted-foreground">
              Adjusted hours: <span className="font-medium text-foreground">{ts.adjusted_hours}</span>
            </p>
          )}
        </div>
      )}

      {/* Escalated */}
      {ts.status === "escalated" && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-2.5">
          <div className="flex items-center gap-1.5 font-medium text-destructive">
            <AlertTriangle className="h-3 w-3" />
            Escalated to Care Fayre support for review
          </div>
        </div>
      )}

      {/* Deadline countdown */}
      {ts.response_deadline && ["queried", "resubmitted"].includes(ts.status) && (
        <DeadlineCountdown deadline={ts.response_deadline} />
      )}
    </div>
  );
}
