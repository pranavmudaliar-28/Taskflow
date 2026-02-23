import * as React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
    Bell, Check, CheckCheck, MessageSquare, User,
    AlertCircle, Calendar, FolderKanban, Inbox, X
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Notification } from "@shared/schema";
import { cn } from "@/lib/utils";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const typeConfig: Record<string, { icon: any; iconBg: string; iconColor: string; label: string }> = {
    task_assigned: { icon: User, iconBg: "bg-primary/10", iconColor: "text-primary", label: "Assignment" },
    status_changed: { icon: AlertCircle, iconBg: "bg-primary/10", iconColor: "text-primary/80", label: "Status" },
    mentioned: { icon: MessageSquare, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500", label: "Mention" },
    due_reminder: { icon: Calendar, iconBg: "bg-amber-500/10", iconColor: "text-amber-500", label: "Reminder" },
    added_to_project: { icon: FolderKanban, iconBg: "bg-primary/10", iconColor: "text-primary/70", label: "Project" },
};

export function NotificationCenter({ children }: { children?: React.ReactNode }) {
    const { toast } = useToast();
    const [open, setOpen] = React.useState(false);

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
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                {children || (
                    <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-xl hover:bg-muted/50 transition-colors">
                        <Bell className="h-4.5 w-4.5 text-muted-foreground" />
                        {unreadCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary border-2 border-background animate-pulse" />
                        )}
                    </Button>
                )}
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md p-0 glass-panel border-l border-white/10 animate-slide-in-right">
                <SheetHeader className="px-6 py-5 border-b border-white/5 bg-background/50 backdrop-blur-md">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <SheetTitle className="text-xl font-bold tracking-tight uppercase">Inbox</SheetTitle>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
                                {unreadCount > 0 ? `${unreadCount} unread notices` : "No new notifications"}
                            </p>
                        </div>
                        {unreadCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => markAllReadMutation.mutate()}
                                className="text-[10px] font-bold uppercase tracking-tighter text-primary hover:bg-primary/5 h-8 px-2 rounded-lg"
                            >
                                Mark all read
                            </Button>
                        )}
                    </div>
                </SheetHeader>

                <ScrollArea className="h-[calc(100vh-80px)]">
                    <div className="divide-y divide-white/5">
                        {isLoading ? (
                            [...Array(6)].map((_, i) => (
                                <div key={i} className="flex items-start gap-4 px-6 py-4 opacity-40">
                                    <Skeleton className="h-10 w-10 rounded-xl" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-3 w-3/4" />
                                        <Skeleton className="h-2 w-1/4" />
                                    </div>
                                </div>
                            ))
                        ) : sorted && sorted.length > 0 ? (
                            sorted.map((n) => {
                                const cfg = typeConfig[n.type] ?? {
                                    icon: Bell, iconBg: "bg-muted/20", iconColor: "text-muted-foreground", label: "Notice"
                                };
                                const IconComp = cfg.icon;
                                return (
                                    <div
                                        key={n.id}
                                        className={cn(
                                            "group flex items-start gap-4 px-6 py-5 transition-all duration-300 hover:bg-white/[0.02]",
                                            !n.read && "bg-primary/[0.02]"
                                        )}
                                    >
                                        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110", cfg.iconBg)}>
                                            <IconComp className={cn("h-5 w-5", cfg.iconColor)} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="space-y-1">
                                                    <p className={cn("text-sm font-bold leading-none tracking-tight", n.read ? "text-foreground/70" : "text-foreground")}>
                                                        {n.title}
                                                    </p>
                                                    <p className="text-[13px] text-muted-foreground leading-snug line-clamp-2">{n.message}</p>
                                                    <p className="text-[10px] text-muted-foreground/50 font-medium uppercase tracking-widest pt-1">
                                                        {formatDistanceToNow(new Date(n.createdAt!), { addSuffix: true })}
                                                    </p>
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    {!n.read && (
                                                        <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                                    )}
                                                    {!n.read && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity rounded-md"
                                                            onClick={() => markAsReadMutation.mutate(n.id)}
                                                        >
                                                            <Check className="h-3.5 w-3.5" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <EmptyState
                                icon={Inbox}
                                title="Inbox Zero"
                                description="You're all caught up with your notifications. Enjoy the clear view."
                                className="py-24 px-6 grayscale opacity-60"
                            />
                        )}
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}
