import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Bell, Check, CheckCheck, MessageSquare, User,
  AlertCircle, Calendar, FolderKanban, Inbox,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Notification } from "@shared/schema";
import { cn } from "@/lib/utils";

const typeConfig: Record<string, { icon: any; iconBg: string; iconColor: string; label: string }> = {
  task_assigned: { icon: User, iconBg: "bg-blue-50", iconColor: "text-blue-500", label: "Assignment" },
  status_changed: { icon: AlertCircle, iconBg: "bg-violet-50", iconColor: "text-violet-500", label: "Status" },
  mentioned: { icon: MessageSquare, iconBg: "bg-emerald-50", iconColor: "text-emerald-500", label: "Mention" },
  due_reminder: { icon: Calendar, iconBg: "bg-amber-50", iconColor: "text-amber-500", label: "Reminder" },
  added_to_project: { icon: FolderKanban, iconBg: "bg-pink-50", iconColor: "text-pink-500", label: "Project" },
};

export default function Notifications() {
  const { toast } = useToast();

  const { data: notifications, isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("PATCH", `/api/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/notifications/read-all"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({ title: "All notifications marked as read" });
    },
    onError: () => toast({ title: "Failed", variant: "destructive" }),
  });

  const unreadCount = notifications?.filter((n) => !n.read).length || 0;
  const sorted = notifications?.slice().sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());

  return (
    <div className="flex flex-col min-h-full bg-slate-50">
      {/* Page header */}
      <div className="bg-white border-b border-slate-100 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Notifications</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}` : "You're all caught up"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              className="border-slate-200 text-slate-600 hover:bg-slate-50 gap-2"
              data-testid="button-mark-all-read"
            >
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      <div className="p-6">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="divide-y divide-slate-50">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-start gap-4 px-5 py-4">
                  <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : sorted && sorted.length > 0 ? (
            <ScrollArea className="h-[calc(100vh-220px)]">
              <div className="divide-y divide-slate-50">
                {sorted.map((n) => {
                  const cfg = typeConfig[n.type] ?? {
                    icon: Bell, iconBg: "bg-slate-100", iconColor: "text-slate-500", label: "Notification"
                  };
                  const IconComp = cfg.icon;
                  return (
                    <div
                      key={n.id}
                      className={cn(
                        "flex items-start gap-4 px-5 py-4 transition-colors",
                        n.read ? "bg-white" : "bg-blue-50/40"
                      )}
                      data-testid={`notification-${n.id}`}
                    >
                      <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", cfg.iconBg)}>
                        <IconComp className={cn("h-5 w-5", cfg.iconColor)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className={cn("text-sm font-semibold", n.read ? "text-slate-600" : "text-slate-900")}>
                              {n.title}
                            </p>
                            <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">{n.message}</p>
                            <p className="text-xs text-slate-400 mt-1.5">
                              {formatDistanceToNow(new Date(n.createdAt!), { addSuffix: true })}
                            </p>
                          </div>
                          {!n.read && (
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="h-2 w-2 rounded-full bg-blue-500" />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                                onClick={() => markAsReadMutation.mutate(n.id)}
                                disabled={markAsReadMutation.isPending}
                                data-testid={`button-mark-read-${n.id}`}
                              >
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                <Inbox className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-base font-semibold text-slate-700">All clear!</p>
              <p className="text-sm text-slate-400 mt-1 text-center max-w-64">
                You'll be notified here when there's activity on your tasks or projects.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
