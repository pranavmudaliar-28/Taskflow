import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Bell, Mail, Smartphone, Globe, Info } from "lucide-react";
import { type NotificationPreferences } from "@shared/schema";

interface NotifyRowProps {
    label: string;
    desc: string;
    channel: string;
    enabled: boolean;
    onToggle: (enabled: boolean) => void;
    disabled?: boolean;
}

function NotifyRow({ label, desc, channel, enabled, onToggle, disabled }: NotifyRowProps) {
    return (
        <div className="flex items-start justify-between gap-4 py-6 border-b border-border last:border-0">
            <div className="flex gap-4">
                <div className="mt-1 h-8 w-8 rounded-lg bg-accent flex items-center justify-center shrink-0">
                    {channel === "email" && <Mail className="h-4 w-4 text-muted-foreground" />}
                    {channel === "push" && <Smartphone className="h-4 w-4 text-muted-foreground" />}
                    {channel === "in_app" && <Bell className="h-4 w-4 text-muted-foreground" />}
                    {channel === "browser" && <Globe className="h-4 w-4 text-muted-foreground" />}
                </div>
                <div>
                    <p className="font-semibold text-foreground">{label}</p>
                    <p className="text-sm text-muted-foreground mt-1">{desc}</p>
                </div>
            </div>
            <Switch
                checked={enabled}
                onCheckedChange={onToggle}
                disabled={disabled}
                className="data-[state=checked]:bg-violet-600"
            />
        </div>
    );
}

export default function NotificationSettings() {
    const { user } = useAuth();
    const { toast } = useToast();

    const { data: preferences = [], isLoading } = useQuery<NotificationPreferences[]>({
        queryKey: ["/api/user/notification-preferences"],
    });

    const updatePref = useMutation({
        mutationFn: async ({ channel, enabled }: { channel: string; enabled: boolean }) => {
            const res = await apiRequest("PATCH", `/api/user/notification-preferences/${channel}`, { enabled });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/user/notification-preferences"] });
            toast({ title: "Preferences updated" });
        },
        onError: (e: any) => toast({ title: "Failed to update", description: e?.message, variant: "destructive" }),
    });

    const isEnabled = (channel: string) => {
        const pref = (preferences || []).find(p => p.channel === channel);
        return pref?.enabled ?? true;
    };

    const handleToggle = (channel: string, enabled: boolean) => {
        updatePref.mutate({ channel, enabled });
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div>
                <h2 className="text-2xl font-bold text-foreground">Notification Preferences</h2>
                <p className="text-muted-foreground mt-1">Control how and when you receive updates from TaskFlow.</p>
            </div>

            <div className="bg-violet-600/5 border border-violet-600/10 rounded-2xl p-4 flex gap-3">
                <Info className="h-5 w-5 text-violet-600 shrink-0 mt-0.5" />
                <p className="text-sm text-violet-800">
                    These settings will apply across all your workspaces. You can still customize notifications for specific projects.
                </p>
            </div>

            <div className="bg-card rounded-2xl border border-border px-6 shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-4">
                        <div className="h-8 w-8 border-4 border-violet-600/20 border-t-violet-600 rounded-full animate-spin" />
                        <p className="text-sm text-muted-foreground">Loading your preferences...</p>
                    </div>
                ) : (
                    <>
                        <NotifyRow
                            channel="email"
                            label="Email Notifications"
                            desc="Daily summaries, important updates, and security alerts sent to your inbox."
                            enabled={isEnabled("email")}
                            onToggle={(v) => handleToggle("email", v)}
                        />
                        <NotifyRow
                            channel="push"
                            label="Push Notifications"
                            desc="Real-time alerts on your mobile device when you're on the go."
                            enabled={isEnabled("push")}
                            onToggle={(v) => handleToggle("push", v)}
                        />
                        <NotifyRow
                            channel="in_app"
                            label="In-App Notifications"
                            desc="Bell icon notifications inside TaskFlow to keep you productive."
                            enabled={isEnabled("in_app")}
                            onToggle={(v) => handleToggle("in_app", v)}
                        />
                        <NotifyRow
                            channel="browser"
                            label="Browser Notifications"
                            desc="Desktop alerts even when TaskFlow is running in the background."
                            enabled={isEnabled("browser")}
                            onToggle={(v) => handleToggle("browser", v)}
                        />
                    </>
                )}
            </div>

            <div className="space-y-4 pt-4">
                <h3 className="text-lg font-bold text-foreground">Activity Notifications</h3>
                <p className="text-sm text-muted-foreground">Select which activities trigger a notification.</p>

                <div className="grid gap-4 sm:grid-cols-2">
                    {[
                        { id: "assignments", label: "Task Assignments" },
                        { id: "mentions", label: "Comments & Mentions" },
                        { id: "status", label: "Status Changes" },
                        { id: "due", label: "Due Date Reminders" },
                        { id: "projects", label: "Project Invitations" },
                        { id: "milestones", label: "Milestone Updates" },
                    ].map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-4 bg-accent/10 rounded-xl border border-border hover:bg-accent/20 transition-colors">
                            <span className="text-sm font-medium">{item.label}</span>
                            <Switch defaultChecked className="data-[state=checked]:bg-violet-600" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
