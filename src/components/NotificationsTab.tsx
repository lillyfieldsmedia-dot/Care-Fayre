import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

type Notification = {
  id: string;
  message: string;
  is_read: boolean;
  type: string;
  related_job_id: string | null;
  related_request_id: string | null;
  created_at: string;
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function NotificationsTab() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("recipient_id", user.id)
      .order("created_at", { ascending: false });
    setNotifications((data as Notification[]) || []);
    setLoading(false);
  }

  async function markAsRead(id: string) {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  }

  async function markAllAsRead() {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  }

  function handleClick(n: Notification) {
    if (!n.is_read) markAsRead(n.id);
    if (n.related_job_id) {
      navigate(`/job/${n.related_job_id}`);
    } else if (n.related_request_id) {
      navigate(`/request/${n.related_request_id}`);
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return <div className="py-20 text-center text-muted-foreground">Loading...</div>;
  }

  if (notifications.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card py-16 text-center">
        <Bell className="mx-auto h-10 w-10 text-muted-foreground/50" />
        <h3 className="mt-4 font-serif text-lg text-foreground">No notifications</h3>
        <p className="mt-1 text-sm text-muted-foreground">You'll see notifications about bids and jobs here.</p>
      </div>
    );
  }

  return (
    <div>
      {unreadCount > 0 && (
        <div className="mb-4 flex justify-end">
          <Button variant="ghost" size="sm" onClick={markAllAsRead} className="gap-2">
            <CheckCheck className="h-4 w-4" />
            Mark all as read
          </Button>
        </div>
      )}
      <div className="space-y-2">
        {notifications.map((n) => (
          <button
            key={n.id}
            onClick={() => handleClick(n)}
            className={`w-full text-left rounded-xl border p-4 transition-shadow hover:shadow-[var(--card-shadow-hover)] ${
              n.is_read
                ? "border-border bg-card"
                : "border-primary/30 bg-primary/5"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                {!n.is_read && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                )}
                <p className={`text-sm ${n.is_read ? "text-muted-foreground" : "text-foreground font-medium"}`}>
                  {n.message}
                </p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(n.created_at)}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
