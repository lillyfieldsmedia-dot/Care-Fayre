import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Bell, Menu, X, LogOut, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NotificationPreview = {
  id: string;
  message: string;
  created_at: string;
  related_job_id: string | null;
  related_request_id: string | null;
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

export function Header() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestNotifications, setLatestNotifications] = useState<NotificationPreview[]>([]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRole(session.user.id);
        fetchUnread(session.user.id);
      } else {
        setRole(null);
        setUnreadCount(0);
        setLatestNotifications([]);
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRole(session.user.id);
        fetchUnread(session.user.id);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function fetchRole(userId: string) {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle();
    setRole(data?.role ?? null);
  }

  async function fetchUnread(userId: string) {
    const { count } = await supabase.from("notifications").select("*", { count: "exact", head: true }).eq("recipient_id", userId).eq("is_read", false);
    setUnreadCount(count ?? 0);

    const { data } = await supabase
      .from("notifications")
      .select("id, message, created_at, related_job_id, related_request_id")
      .eq("recipient_id", userId)
      .eq("is_read", false)
      .order("created_at", { ascending: false })
      .limit(3);
    setLatestNotifications((data as NotificationPreview[]) || []);
  }

  async function handleNotificationClick(notif: NotificationPreview) {
    await supabase.from("notifications").update({ is_read: true }).eq("id", notif.id);
    setUnreadCount((c) => Math.max(0, c - 1));
    setLatestNotifications((prev) => prev.filter((n) => n.id !== notif.id));
    if (notif.related_job_id) {
      navigate(`/job/${notif.related_job_id}`);
    } else if (notif.related_request_id) {
      navigate(`/request/${notif.related_request_id}`);
    } else {
      navigate(dashboardLink + "?tab=notifications");
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/");
  }

  const dashboardLink = role === "agency" ? "/agency-dashboard" : role === "admin" ? "/admin" : "/dashboard";

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <span className="text-lg font-bold text-primary-foreground">C</span>
          </div>
          <span className="font-serif text-xl text-foreground">Care Fayre</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {user ? (
            <>
              <Button variant="ghost" asChild><Link to={dashboardLink}>Dashboard</Link></Button>
              {role === "customer" && <Button variant="ghost" asChild><Link to="/create-request">Post Request</Link></Button>}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 bg-popover z-[100]">
                  {latestNotifications.length > 0 ? (
                    <>
                      {latestNotifications.map((notif) => (
                        <DropdownMenuItem
                          key={notif.id}
                          className="flex flex-col items-start gap-1 cursor-pointer py-3"
                          onClick={() => handleNotificationClick(notif)}
                        >
                          <p className="text-sm text-foreground leading-snug line-clamp-2">{notif.message}</p>
                          <span className="text-xs text-muted-foreground">{timeAgo(notif.created_at)}</span>
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                    </>
                  ) : (
                    <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                      No unread notifications
                    </div>
                  )}
                  <DropdownMenuItem asChild>
                    <Link to={dashboardLink + "?tab=notifications"} className="justify-center text-primary font-medium">
                      View all notifications
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon"><User className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover z-[100]">
                  <DropdownMenuItem asChild><Link to={role === "agency" ? "/agency-profile" : "/profile"}>Profile</Link></DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout}><LogOut className="mr-2 h-4 w-4" /> Log out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild><Link to="/login">Log in</Link></Button>
              <Button asChild><Link to="/signup">Get Started</Link></Button>
            </>
          )}
        </nav>

        {/* Mobile menu toggle */}
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="border-t border-border bg-card px-4 pb-4 pt-2 md:hidden">
          {user ? (
            <div className="flex flex-col gap-2">
              <Button variant="ghost" asChild className="justify-start"><Link to={dashboardLink}>Dashboard</Link></Button>
              {role === "customer" && <Button variant="ghost" asChild className="justify-start"><Link to="/create-request">Post Request</Link></Button>}
              <Button variant="ghost" asChild className="justify-start"><Link to={role === "agency" ? "/agency-profile" : "/profile"}>Profile</Link></Button>
              <Button variant="ghost" className="justify-start" onClick={handleLogout}><LogOut className="mr-2 h-4 w-4" /> Log out</Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Button variant="ghost" asChild className="justify-start"><Link to="/login">Log in</Link></Button>
              <Button asChild><Link to="/signup">Get Started</Link></Button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
